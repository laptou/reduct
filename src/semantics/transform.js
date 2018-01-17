import * as immutable from "immutable";
import * as gfx from "../gfx/core";
import projector from "../gfx/projector";
import * as animate from "../gfx/animate";
import * as core from "./core";
import * as meta from "./meta";

import { nextId } from "../reducer/reducer";

const NotchRecord = immutable.Record({
    side: "left",
    shape: "wedge",
    type: "inset",
});

/**
 * This module turns a JSON-plus-functions specification of language
 * semantics and builds a module for the rest of Reduct to interact
 * with the semantics.
 */
export default function transform(definition) {
    const module = {};
    module.definition = definition;
    module.projections = {};

    // Add default definitions for vtuple
    /**
     * A "virtual tuple" which kind of bleeds presentation into the
     * semantics. Represents a set of values that go together, but spill
     * onto the board when they are the top-level node.
     */
    module.vtuple = function vtuple(children) {
        const result = { type: "vtuple", locked: true, numChildren: children.length };
        let i = 0;
        for (const child of children) {
            result[`child${i}`] = child;
            i += 1;
        }
        return result;
    };
    module.projections.vtuple = function(_stage, _expr) {
        return gfx.layout.vbox((id, state) => {
            const node = state.getIn([ "nodes", id ]);
            const result = [];
            for (let i = 0; i < node.get("numChildren"); i++) {
                result.push(node.get(`child${i}`));
            }
            return result;
        }, {
            padding: {
                top: 0,
                inner: 5,
                bottom: 0,
                left: 0,
                right: 0,
            },
            strokeWhenChild: false,
            subexpScale: 1,
        });
    };

    for (const [ exprName, exprDefinition ] of Object.entries(definition.expressions)) {
        module[exprName] = function(...params) {
            const result = { type: exprName, locked: true };
            if (typeof exprDefinition.locked !== "undefined") {
                result.locked = exprDefinition.locked;
            }
            if (typeof exprDefinition.notches !== "undefined") {
                result.notches = immutable.List(exprDefinition.notches.map(n => new NotchRecord(n)));
            }

            let argPointer = 0;
            for (const fieldName of exprDefinition.fields) {
                result[fieldName] = params[argPointer++];
            }
            for (const fieldName of exprDefinition.subexpressions) {
                result[fieldName] = params[argPointer++];
            }
            return result;
        };
        Object.defineProperty(module[exprName], "name", { value: exprName });


        if (typeof exprDefinition.notches !== "undefined") {
            exprDefinition.projection.notches = exprDefinition.notches;
        }
        module.projections[exprName] = projector(exprDefinition);
    }

    /**
     * Return a list of field names containing subexpressions of an expression.
     */
    module.subexpressions = function subexpressions(expr) {
        const type = expr.type || expr.get("type");
        if (type === "vtuple") {
            const result = [];
            const nc = expr.get ? expr.get("numChildren") : expr.numChildren;
            for (let i = 0; i < nc; i++) {
                result.push(`child${i}`);
            }
            return result;
        }
        if (!definition.expressions[type]) throw `semantics.subexpressions: Unrecognized expression type ${type}`;
        // TODO: more principled way of doing this
        if (expr.get && expr.get("notch0")) {
            return definition.expressions[type].subexpressions.concat(["notch0"]);
        }
        return definition.expressions[type].subexpressions;
    };

    /**
     * Construct the gfx view for a node.
     *
     * @param nodes - We have to provide the node map since the store
     * won't have been updated yet.
     */
    module.project = function project(stage, nodes, expr) {
        const type = expr.get("type");
        if (!module.projections[type]) throw `semantics.project: Unrecognized expression type ${type}`;
        return module.projections[type](stage, nodes, expr);
    };

    /**
     * Submodule for evaluating expressions.
     */
    module.interpreter = {};

    /**
     * Take a small step on this expression.
     *
     * Requires that pertinent subexpressions (as defined by
     * substepFilter) have been reduced first.
     *
     * @returns {Array} The ID of the original expression, a list of
     * IDs of resulting nodes, and a list of added nodes (which have
     * IDs assigned and are immutable already).
     */
    module.interpreter.smallStep = function smallStep(state, expr) {
        const type = expr.type || expr.get("type");
        const stepper = definition.expressions[type].smallStep;
        if (stepper) {
            const result = stepper(module, state, expr);
            if (Array.isArray(result)) return result;

            if (immutable.Map.isMap(result)) {
                // TODO: is this quite correct?
                return [ expr.get("id"), [ result.get("id") ], [ result ] ];
            }

            // Return [topLevelNodeId, newNodeIds[], addedNodes[]]
            result.id = nextId();
            const addedNodes = module.flatten(result).map(immutable.Map);
            return [ expr.get("id"), [ addedNodes[0].get("id") ], addedNodes ];
        }
        return null;
    };

    /**
     * Apply a list of expressions to another expression.
     */
    module.interpreter.betaReduce = function(state, exprId, argIds) {
        const target = state.get("nodes").get(exprId);
        const reducer = definition.expressions[target.get("type")].betaReduce;
        if (!reducer) return null;

        return reducer(module, state, target, argIds);
    };

    /**
     * Construct the animation for the small-step that the given
     * expression would take.
     */
    module.interpreter.animateStep = function animateStep(stage, state, exp) {
        return animate.fx.shatter(stage, stage.views[exp.get("id")]);
    };

    /**
     * Given an expression, find the first child that needs to have a
     * step taken, or the first child that is blocking evaluation.
     */
    module.interpreter.singleStep = function singleStep(state, expr) {
        const nodes = state.get("nodes");
        const kind = module.kind(expr);
        if (kind !== "expression") {
            return [ "error", expr.get("id") ];
        }

        let substepFilter = () => true;
        const defn = definition.expressions[expr.get("type")];
        if (defn && defn.substepFilter) {
            substepFilter = defn.substepFilter;
        }
        for (const field of module.subexpressions(expr)) {
            const subexprId = expr.get(field);
            const subexpr = nodes.get(subexprId);
            const subexprKind = module.kind(subexpr);

            if (!substepFilter(module, state, expr, field)) {
                continue;
            }

            if (subexprKind !== "value" && subexprKind !== "syntax") {
                return module.interpreter.singleStep(state, subexpr);
            }
        }

        const errorExpId = module.interpreter.validateStep(state, expr);
        if (errorExpId !== null) {
            return [ "error", errorExpId ];
        }

        return [ "success", expr.get("id") ];
    };

    /**
     * A submodule containing evaluation strategies.
     */
    module.interpreter.reducers = {};
    // TODO: need a "hybrid multi-step" that big-steps expressions we
    // don't care about and that can delay evaluating references
    module.interpreter.reducers.single = function singleStepReducer(
        stage, state, exp,
        callback, errorCallback
    ) {
        // Single-step mode

        const [ result, exprId ] = module.interpreter.singleStep(state, exp);
        if (result === "error") {
            errorCallback(exprId);
            return;
        }

        const nodes = state.get("nodes");
        exp = nodes.get(exprId);
        module
            .interpreter.animateStep(stage, nodes, exp)
            .then(() => module.interpreter.smallStep(nodes, exp))
            .then(([ topNodeId, newNodeIds, addedNodes ]) => {
                callback(topNodeId, newNodeIds, addedNodes);
            });
    };

    module.interpreter.reducers.multi = function multiStepReducer(
        stage, state, exp,
        callback, errorCallback, animated=true
    ) {
        const takeStep = (innerState, innerExpr) => {
            const [ result, exprId ] = module.interpreter.singleStep(innerState, innerExpr);
            if (result === "error") {
                errorCallback(exprId);
                return Promise.reject();
            }

            innerExpr = innerState.get("nodes").get(exprId);
            const nextStep = () => {
                const [ topNodeId, newNodeIds, addedNodes ] =
                      module.interpreter.smallStep(innerState, innerExpr);
                return callback(topNodeId, newNodeIds, addedNodes)
                    .then(newState => [ newState, topNodeId, newNodeIds ]);
            };

            if (animated) {
                return module.interpreter.animateStep(stage, innerState, innerExpr).then(() => nextStep());
            }
            return nextStep();
        };

        let fuel = 20;
        const loop = (innerState, innerExpr) => {
            if (fuel <= 0) return;
            fuel -= 1;

            takeStep(innerState, innerExpr).then(([ newState, topNodeId, newNodeIds ]) => {
                if (innerExpr.get("id") === topNodeId) {
                    // TODO: handle multiple newNodeIds
                    innerExpr = newState.getIn([ "nodes", newNodeIds[0] ]);
                }
                else {
                    innerExpr = newState.getIn([ "nodes", innerExpr.get("id") ]);
                }

                if (module.kind(innerExpr) === "expression") {
                    if (animated) {
                        animate.after(350)
                            .then(() => loop(newState, innerExpr));
                    }
                    else {
                        loop(newState, innerExpr);
                    }
                }
            });
        };

        loop(state, exp);
    };

    module.interpreter.reducers.big = function bigStepReducer(
        stage, state, exp,
        callback, errorCallback
    ) {
        // Only play animation if we actually take any sort of
        // small-step
        let playedAnim = false;
        module.interpreter.reducers.multi(
            stage, state, exp,
            (...args) => {
                if (!playedAnim) {
                    playedAnim = true;
                    return module.interpreter.animateStep(stage, state, exp).then(() => callback(...args));
                }
                return callback(...args);
            },
            errorCallback, false
        );
    };

    /**
     * A helper function that should abstract over big-step, small-step,
     * multi-step, and any necessary animation.
     *
     * TODO: it needs to also insert intermediate states into the
     * undo/redo stack, and mark which undo/redo states are big-steps,
     * small-steps, etc. to allow fine-grained undo/redo.
     */
    module.interpreter.reduce = function reduce(stage, state, exp, callback, errorCallback) {
        // return module.interpreter.reducers.single(stage, state, exp, callback, errorCallback);
        return module.interpreter.reducers.multi(stage, state, exp, callback, errorCallback);
        // return module.interpreter.reducers.big(stage, state, exp, callback, errorCallback);
    };

    /**
     * Validate that the given expression can take a single step.
     */
    module.interpreter.validateStep = function(state, expr) {
        const defn = definition.expressions[expr.get("type")];
        if (!defn) return null;

        const validator = defn.validateStep;
        if (!validator) return null;

        return validator(module, state, expr);
    };

    module.shallowEqual = function shallowEqual(n1, n2) {
        if (n1.get("type") !== n2.get("type")) return false;

        for (const field of definition.expressions[n1.get("type")].fields) {
            if (n1.get(field) !== n2.get(field)) return false;
        }

        return true;
    };

    /**
     * Is an expression selectable/hoverable by the mouse?
     */
    module.targetable = function(state, expr) {
        const defn = definition.expressions[expr.get("type")];
        if (defn && defn.targetable && typeof defn.targetable === "function") {
            return defn.targetable(module, state, expr);
        }
        return !expr.get("parent") || !expr.get("locked") || (defn && defn.alwaysTargetable);
    };

    module.kind = function(expr) {
        switch (expr.get("type")) {
        case "vtuple":
            // TODO: This isn't quite right - depends on the children
            return "expression";
        default:
            return definition.expressions[expr.get("type")].kind;
        }
    };

    module.hydrate = function(nodes, expr) {
        return expr.withMutations((e) => {
            for (const field of module.subexpressions(e)) {
                e.set(field, module.hydrate(nodes, nodes.get(e.get(field))));
            }
        }).toJS();
    };

    module.collectTypes = function collectTypes(nodes, rootExpr) {
        const result = new Map();
        const completeness = new Map();

        // Update the type map with the type for the expression.
        const update = function update(id, ty) {
            if (!result.has(id)) {
                result.set(id, ty);
            }
            else {
                const prevTy = result.get(id);
                if (prevTy === "unknown") {
                    result.set(id, ty);
                }
                else if (prevTy !== ty) {
                    result.set(id, "error");
                }
            }
        };

        const step = function step(expr) {
            const id = expr.get("id");

            for (const field of module.subexpressions(expr)) {
                step(nodes.get(expr.get(field)));
            }

            const type = expr.get("type");
            const exprDefn = definition.expressions[type];
            if (!exprDefn) {
                console.warn(`No expression definition for ${type}`);
            }
            else {
                const typeDefn = exprDefn.type;
                if (typeof typeDefn === "function") {
                    const { types, complete } = typeDefn(module, nodes, result, expr);
                    completeness.set(
                        id,
                        complete && module.subexpressions(expr)
                            .map(field => completeness.get(expr.get(field)) ||
                                 module.kind(nodes.get(expr.get(field))) !== "expression")
                            .every(x => x)
                    );
                    for (const entry of types.entries()) {
                        update(...entry);
                    }
                }
                else if (typeof typeDefn === "undefined") {
                    // TODO: define constants/typing module
                    // result[id].add("unknown");
                }
                else {
                    completeness.set(id, true);
                    update(id, typeDefn);
                }
            }
        };

        step(rootExpr);

        return { types: result, completeness };
    };

    module.hasNotches = function(node) {
        return node.get("notches");
    };

    module.notchesCompatible = function(node1, node2) {
        const notches1 = node1.get("notches");
        const notches2 = node2.get("notches");
        const result = [];
        if (notches1 && notches2) {
            for (const notch1 of notches1) {
                for (const notch2 of notches2) {
                    if ((notch1.side === "left" && notch2.side === "right") ||
                        (notch1.side === "right" && notch2.side === "left")) {
                        // TODO: full check
                        result.push([ notch1, notch2 ]);
                    }
                }
            }
        }
        return result;
    };

    /**
     * Check whether we should ignore the given node when matching
     * nodes to determine victory.
     */
    module.ignoreForVictory = function(node) {
        const defn = definition.expressions[node.get("type")];
        return module.kind(node) === "syntax" || (defn && defn.ignoreForVictory);
    };

    module.equal = core.genericEqual(module.subexpressions, module.shallowEqual);
    module.flatten = core.genericFlatten(nextId, module.subexpressions);
    module.map = core.genericMap(module.subexpressions);
    module.search = core.genericSearch(module.subexpressions);
    module.clone = core.genericClone(nextId, module.subexpressions);

    module.parser = {};
    module.parser.parse = definition.parser.parse(module);
    module.parser.postParse = definition.parser.postParse;
    module.parser.extractDefines = definition.parser.extractDefines;
    module.parser.extractGlobals = definition.parser.extractGlobals;

    module.meta = meta;

    return module;
}
