import * as immutable from "immutable";

import Audio from "../resource/audio";

import * as animate from "../gfx/animate";

import { nextId } from "../reducer/reducer";

export default function(module) {
    /**
     * Take a small step on this expression.
     *
     * Requires that pertinent subexpressions (as defined by
     * ``substepFilter``, if present in the expression definition,
     * otherwise all subexpressions) have been reduced first.
     *
     * @returns {Array} The ID of the original expression, a list of
     * IDs of resulting nodes, and a list of added nodes (which have
     * IDs assigned and are immutable already).
     */
    module.interpreter.smallStep = function smallStep(stage, state, expr) {
      debugger;
        console.log("inSmallStep");
        const type = expr.type || expr.get("type");
        const stepper = module.definitionOf(type).smallStep;
        console.log(module.definitionOf(type))
        if (stepper) {
            const result = stepper(module, stage, state, expr);
            if (!result) return null;

            if (Array.isArray(result)) {
            console.log ("result_of_smallStep:");
            console.log(result);
            return result;}

            if (immutable.Map.isMap(result)) {
                // TODO: is this quite correct?
                const res2 =  [ expr.get("id"), [ result.get("id") ], [ result ] ];
                console.log("res2 : " +res2);
                return res2;
            }

            // Return [topLevelNodeId, newNodeIds[], addedNodes[]]
            result.id = nextId();
            const addedNodes = module.flatten(result).map(immutable.Map);
            const r3 = [ expr.get("id"), [ addedNodes[0].get("id") ], addedNodes ];
            console.log("r3 : " + r3);
            return r3;
        }
        return null;
    };

    /**
     * Apply a list of expressions to another expression.
     */
    module.interpreter.betaReduce = function(stage, state, exprId, argIds) {
      debugger;
        const target = state.get("nodes").get(exprId);
        console.log("in beta reduce");
        console.log(JSON.stringify(target));
        const reducer = module.definitionOf(target).betaReduce;
        if (!reducer) {
            console.warn(`Expression type ${target.get("type")} was beta-reduced, but has no reducer.`);
            return null;
        }

        return reducer(module, stage, state, target, argIds);
    };

    /**
     * Construct the animation for the small-step that the given
     * expression would take.
     */
    module.interpreter.animateStep = function animateStep(stage, state, exp) {
        const defn = module.definitionOf(exp.get("type"));
        if (defn && defn.stepSound) {
            if (typeof defn.stepSound === "function") {
                const sequence = defn.stepSound(module, state, exp);
                Audio.playSeries(sequence);
            }
            else {
                Audio.play(defn.stepSound);
            }
        }
        if (defn && defn.stepAnimation) {
            return defn.stepAnimation(module, stage, state, exp);
        }

        const scaleCategory = `expr-${exp.get("type")}`;
        return animate.fx.shatter(stage, stage.views[exp.get("id")], {
            introDuration: animate.scaleDuration(600, scaleCategory),
            outroDuration: animate.scaleDuration(600, scaleCategory),
        });
    };

    const __substepFilter = () => true;
    /**
     * Get the substep filter for a particular expression type.
     */
    module.interpreter.substepFilter = function getSubstepFilter(type) {
        const defn = module.definitionOf(type);
        if (defn && defn.substepFilter) {
            return defn.substepFilter;
        }
        return __substepFilter;
    };

    /**
     * Given an expression, find the first child that needs to have a
     * step taken, or the first child that is blocking evaluation.
     */
    module.interpreter.singleStep = function singleStep(state, expr, exprFilter=null) {
        const nodes = state.get("nodes");
        const kind = module.kind(state, expr);
        console.log(`stepping ${expr.toString()}`)
        if (kind !== "expression") {
            console.log(`semant.interpreter.singleStep: could not step since ${expr.get("id")} is '${kind}', not 'expression'`);
            let reason = "This expression can't step!";
            if (kind === "placeholder") {
                reason = "There's a hole that needs to be filled in!";
            }
            return [ "error", expr.get("id"), reason ];
        }

        if (exprFilter === null) exprFilter = () => false;
        const substepFilter = module.interpreter.substepFilter(expr.get("type"));

        if (!exprFilter(state, expr)) {
            console.log("no expr filter")
            for (const field of module.subexpressions(expr)) {
                console.log(`considering subexpression ${field}`)
                const subexprId = expr.get(field);
                const subexpr = nodes.get(subexprId);
                const subexprKind = module.kind(state, subexpr);
                console.log(`subexpr kind is ${subexprKind}`)

                if (!substepFilter(module, state, expr, field)) {
                    console.log(`skipping subexpr ${subexpr} because substepFilter`)
                    continue;
                }

                // Hardcoded: delay expansion of references until
                // absolutely necessary (when they're being applied)
                if (subexpr.get("type") === "reference") {
                    if (expr.get("type") !== "apply" && (
                        !subexpr.get("params") ||
                            module.subexpressions(subexpr).some(f =>
                                nodes.get(subexpr.get(f)).get("type") === "missing")
                    )) {
                        console.log("delaying expansion because of missing arguments")
                        continue;
                    }
                    console.log("going ahead with expanding a nested reference")
                }

                if (subexprKind !== "value" && subexprKind !== "syntax") {
                    console.log(`recursing into ${field}`)
                    return module.interpreter.singleStep(state, subexpr, exprFilter);
                } else {
                    console.log(`${field} is not an expression, not recursing into it`)
                }
            }
        }

        console.log(`validating step for ${expr}`)

        const validation = module.interpreter.validateStep(state, expr);
        if (validation !== null) {
            let errorExpId;
            let reason = "There's something wrong here.";
            if (Array.isArray(validation)) {
                [ errorExpId, reason ] = validation;
            }
            else {
                errorExpId = validation;
            }

            console.debug(`semant.interpreter.singleStep: could not step due to ${errorExpId}`);
            return [ "error", errorExpId, reason ];
        }

        return [ "success", expr.get("id"), null ];
    };

    function nullToError(exprId, callback) {
        return (result) => {
            if (result === null) {
                callback(exprId);
                return Promise.reject(exprId);
            }
            return result;
        };
    }

    /**
     * A submodule containing evaluation strategies.
     */
    module.interpreter.reducers = {};
    /**
     * A single step reducer.
     */
    module.interpreter.reducers.single = function singleStepReducer(
        stage, state, exp, callbacks,
        recordUndo=true
    ) {
        // Single-step mode
        const [ result, exprId, reason ] = module.interpreter.singleStep(state, exp);
        if (result === "error") {
            callbacks.error(exprId, reason);
            return Promise.reject(exprId);
        }

        const nodes = state.get("nodes");
        exp = nodes.get(exprId);
        return module
            .interpreter.animateStep(stage, state, exp)
            .then(() => module.interpreter.smallStep(stage, state, exp))
            .then(nullToError(exprId, callbacks.error))
            .then(([ topNodeId, newNodeIds, addedNodes ]) => {
                console.log(JSON.stringify(topNodeId));
                console.log(JSON.stringify(newNodeIds));
                console.log(JSON.stringify(addedNodes));
                callbacks.update(topNodeId, newNodeIds, addedNodes, recordUndo);
                // TODO: handle multiple new nodes
                return newNodeIds[0];
            });
    };

    module.interpreter.reducers.over = function stepOverReducer(
        stage, state, exp, callbacks,
        recordUndo=true
    ) {
        // Step over previously defined names
        // Return true if we are at an apply expression where the
        // callee is a previously defined function
        const shouldStepOver = (state, expr) => {
            if (expr.get("type") === "reference" && expr.get("params") && expr.get("params").length > 0 && !exp.get("params").includes("a")) {
                if (stage.newDefinedNames.includes(expr.get("name"))) {
                    return false;
                }

                // If reference with holes, step over so long as all
                // args are not references or applications
                for (const subexprField of module.subexpressions(expr)) {
                    const subexpr = state.getIn([ "nodes", expr.get(subexprField) ]);
                    const kind = module.kind(state, subexpr);
                    if (kind === "expression") {
                        if (subexpr.get("type") === "reference") {
                            return (!subexpr.get("params") ||
                                    subexpr.get("params").length === 0 ||
                                    module
                                    .subexpressions(subexpr)
                                    .every(p => state.getIn([ "nodes", subexpr.get(p) ])
                                           .get("type") === "missing"));
                        }
                        return false;
                    }
                    else if (kind === "missing") {
                        return false;
                    }
                }
                return true;
            }

            if (expr.get("type") !== "apply") {
                return false;
            }
            const callee = state.getIn([ "nodes", expr.get("callee") ]);
            if (callee.get("type") !== "reference") {
                return false;
            }
            if (stage.newDefinedNames.includes(callee.get("name"))) {
                return false;
            }
            for (const subexprField of module.subexpressions(expr)) {
                const subexpr = state.getIn([ "nodes", expr.get(subexprField) ]);
                if (subexpr.get("type") === "reference") {
                    return !(
                        subexpr
                            .get("params") &&
                            subexpr
                            .get("params")
                            .some(p => state.getIn([ "nodes", subexpr.get(`arg_${p}`), "type" ]) !== "missing")
                    );
                }
                else if (module.kind(state, subexpr) === "expression" && subexpr.get("type") !== "reference") {
                    return false;
                }
            }
            return true;
        };

        const [ result, exprId, reason ] = module.interpreter.singleStep(state, exp, shouldStepOver);


        if (result === "error") {
            callbacks.error(exprId, reason);
            return Promise.reject(exprId);
        }

        const nodes = state.get("nodes");
        exp = nodes.get(exprId);

        if (shouldStepOver(state, exp)) {
            const name = exp.get("type") === "reference" ? exp.get("name") :
                  `subcall ${nodes.get(exp.get("callee")).get("name")}`;
            console.debug(`semant.interpreter.reducers.over: stepping over call to ${name}`);
            return module.interpreter.reducers.big(stage, state, exp, callbacks);
        }
        console.log("ru");
        return module
            .interpreter.animateStep(stage, state, exp)
            .then(() => module.interpreter.smallStep(stage, state, exp))
            .then(nullToError(exprId, callbacks.error))
            .then(([ topNodeId, newNodeIds, addedNodes ]) => {
                callbacks.update(topNodeId, newNodeIds, addedNodes, recordUndo);
                // TODO: handle multiple new nodes
                console.log("iam");
                return newNodeIds[0];
            });
    };

    module.interpreter.reducers.multi = function multiStepReducer(
        stage, state, exp, callbacks,
        animated=true, recordUndo=true
    ) {
      debugger;
        let firstStep = true;

        console.log("in multiStepReducer")

      const takeStep = (innerState, topExpr) => {
            console.log(`in takeStep ${topExpr}`)
            const [ result, exprId, reason ] = module.interpreter.singleStep(innerState, topExpr);
            if (result === "error") {
                callbacks.error(exprId, reason);
                return Promise.reject();
            }

            const innerExpr = innerState.get("nodes").get(exprId);

            console.log(`successful result was ${innerExpr}`)

            const nextStep = () => {
                console.log(`in nextStep ${innerExpr}`)
                const result = module.interpreter.smallStep(stage, innerState, innerExpr);
                if (result === null) {
                    callbacks.error(exprId);
                    return Promise.reject(topExpr.get("id"));
                }

                const [ topNodeId, newNodeIds, addedNodes ] = result;

                return callbacks.update(topNodeId, newNodeIds, addedNodes, recordUndo || firstStep)
                    .then((newState) => {
                        firstStep = false;
                        if (topExpr.get("id") === topNodeId) {
                            // TODO: handle multiple newNodeIds
                            topExpr = newState.getIn([ "nodes", newNodeIds[0] ]);
                        }
                        else { topExpr = newState.getIn([ "nodes", topExpr.get("id") ]);
                        }

                        if ((callbacks.stop && callbacks.stop(newState, topExpr)) ||
                              module.kind(newState, topExpr) !== "expression") {
                            return Promise.reject(topExpr.get("id"));
                        }
                        return [ newState, topExpr ];
                    });
            };

            if (animated) {
                console.log("starting animation")
                return module.interpreter
                    .animateStep(stage, innerState, innerExpr)
                    .then(() => nextStep());
            }
            return nextStep();
        };

        let fuel = 200;
        const loop = (innerState, topExpr) => {
            if (fuel <= 0) return Promise.resolve(topExpr.get("id"));
            fuel -= 1;

            return takeStep(innerState, topExpr).then(([ newState, innerExpr ]) => {
                if (animated) {
                const duration = animate.scaleDuration(
                    800,
                    "multi-step",
                    `expr-${topExpr.get("type")}`
                );
                    return animate.after(duration)
                        .then(() => loop(newState, innerExpr));
                }
                return loop(newState, innerExpr);
            }, (finalId) => {
                console.debug(`semant.interpreter.reducers.multi: ${fuel} fuel remaining`);
                return Promise.resolve(finalId);
            });
        };

        return loop(state, exp);
    };

    module.interpreter.reducers.big = function bigStepReducer(stage, state, exp, callbacks) {
        // Only play animation if we actually take any sort of
        // small-step
        debugger;
        let playedAnim = false;
        return module.interpreter.reducers.multi(
            stage, state, exp,
            Object.assign({}, callbacks, {
                update: (...args) => {
                    if (!playedAnim) {
                        playedAnim = true;
                        return module.interpreter
                            .animateStep(stage, state, exp)
                            .then(() => callbacks.update(...args));
                    }
                    return callbacks.update(...args);
                },
            }), false, false
        );
    };

    module.interpreter.reducers.medium = function mediumStepReducer(stage, state, exp, callbacks) {
        // Only play animation if we actually take any sort of
        // small-step
        let playedAnim = false;
        return module.interpreter.reducers.multi(
            stage, state, exp,
            Object.assign({}, callbacks, {
                update: (...args) => {
                    if (!playedAnim) {
                        playedAnim = true;
                        return module.interpreter
                            .animateStep(stage, state, exp)
                            .then(() => callbacks.update(...args));
                    }
                    return callbacks.update(...args);
                },
                stop: (state, topExpr) => {
                    let curExpr = topExpr;
                    const rhs = [];
                    const nodes = state.get("nodes");
                    let repeated = null;
                    while (curExpr.get("type") === "apply") {
                        const callee = nodes.get(curExpr.get("callee"));
                        if (callee.get("type") === "reference") {
                            rhs.push(callee.get("name"));
                            curExpr = nodes.get(curExpr.get("argument"));
                            if (callee.get("name") === "repeat") break;
                        }
                        else if (callee.get("type") === "apply") {
                            curExpr = callee;
                            if (!repeated) {
                                repeated = nodes.get(callee.get("argument"));
                                if (repeated.get("type") !== "reference") return false;
                            }
                        }
                        else {
                            return false;
                        }
                    }

                    if (curExpr.get("type") === "number") return true;
                    if (!repeated) return false;
                    if (curExpr.get("type") !== "number") return false;
                    if (rhs[rhs.length - 1].get("name") !== "repeat") return false;

                    for (const name of rhs.slice(0, -1)) {
                        if (name !== repeated.get("name")) return false;
                    }

                    return true;
                },
            }), false, false
        );
    };

    module.interpreter.reducers.hybrid = function multiStepReducer(stage, state, exp, callbacks) {
      debugger;
        const takeStep = (innerState, topExpr) => {
          console.log(`in takeStep_hybrid ${topExpr}`)
            const [ result, exprId, reason ] = module.interpreter.singleStep(innerState, topExpr);
            if (result === "error") {
                callbacks.error(exprId, reason);
                return Promise.reject();
            }

            const innerExpr = innerState.get("nodes").get(exprId);
              console.log(`successful result was_hybrid ${innerExpr}`)
            if (innerExpr.get("type") === "reference" && !stage.newDefinedNames.includes(innerExpr.get("name"))) {
              console.log("going in if_hybrid");
                return module.interpreter.reducers
                    .over(stage, innerState, topExpr, callbacks)
                    .then((topId) => {
                        const newState = stage.getState();

                        let node = newState.getIn([ "nodes", topId ]);
                        while (node.has("parent")) {
                            node = newState.getIn([ "nodes", node.get("parent") ]);
                        }

                        if (module.kind(newState, node) !== "expression") { // XXX use newState here?
                            return Promise.reject(topId);
                        }
                        return [ newState, node ];
                    });
            }

            const nextStep = () => {
              console.log(`in nextStep_hybrid ${innerExpr}`)
                const [ topNodeId, newNodeIds, addedNodes ] =
                      module.interpreter.smallStep(stage, innerState, innerExpr);
                      console.log("SUCC small_step_hybrid");

                return callbacks.update(topNodeId, newNodeIds, addedNodes, true)
                    .then((newState) => {
                        if (topExpr.get("id") === topNodeId) {
                            // TODO: handle multiple newNodeIds
                            topExpr = newState.getIn([ "nodes", newNodeIds[0] ]);
                        }
                        else {
                            topExpr = newState.getIn([ "nodes", topExpr.get("id") ]);
                        }

                        if (module.kind(newState, topExpr) !== "expression") {
                          console.log("completely done got this as kind_hybrid :#####");
                          console.log(module.kind(state, topExpr));
                            return Promise.reject(topExpr.get("id"));
                        }
                        console.log("done_hybrid");
                        return [ newState, topExpr ];
                    });
            };

            return module.interpreter
                .animateStep(stage, innerState, innerExpr)
                .then(() => nextStep());
        };

        let fuel = 50;
        const loop = (innerState, topExpr) => {
            if (fuel <= 0) return Promise.resolve(topExpr.get("id"));
            fuel -= 1;

            return takeStep(innerState, topExpr).then(([ newState, innerExpr ]) => {
                const duration = animate.scaleDuration(
                    800,
                    "multi-step",
                    `expr-${topExpr.get("type")}`
                );
                return animate.after(duration)
                    .then(() => loop(newState, innerExpr));
            }, (finalId) => {
                console.debug(`semant.interpreter.reducers.hybrid: ${fuel} fuel remaining`);
                return Promise.resolve(finalId);
            });
        };

        return loop(state, exp);
    };

    /**
     * A helper function that should abstract over big-step, small-step,
     * multi-step, and any necessary animation.
     *
     * TODO: it needs to also insert intermediate states into the
     * undo/redo stack, and mark which undo/redo states are big-steps,
     * small-steps, etc. to allow fine-grained undo/redo.
     */
    module.interpreter.reduce = function reduce(stage, state, exp, mode, callbacks) {
        console.log("step-reduce");
        switch (mode) {
        case "small":
        console.log("step-reduce-small");
            return module.interpreter.reducers.single(stage, state, exp, callbacks);
        case "over":
        console.log("step-reduce-over");
            return module.interpreter.reducers.over(stage, state, exp, callbacks);
        case "multi":
        console.log("step-reduce-multi");
            return module.interpreter.reducers.multi(stage, state, exp, callbacks);
        case "big":
        console.log("step-reduce-big");
            return module.interpreter.reducers.big(stage, state, exp, callbacks);
        case "medium":
        console.log("step-reduce-medium");
            return module.interpreter.reducers.medium(stage, state, exp, callbacks);
        case "hybrid":
        default:
          console.log("step-reduce-hybrid");
            return module.interpreter.reducers.multi(stage, state, exp, callbacks);
        }
    };

    /**
     * Validate that the given expression can take a single step.
     */
    module.interpreter.validateStep = function(state, expr) {
        const defn = module.definitionOf(expr);
        if (!defn) return null;

        const validator = defn.validateStep;
        if (!validator) return null;

        return validator(module, state, expr);
    };
}
