import * as immutable from "immutable";
import * as core from "../core";
import { builtins } from "./builtins";

const baseReference = {
    kind: "expression",
    fields: ["name"],
    subexpressions: [],
    stepSound: "heatup",
    type: (semant, state, types, expr) => ({
        types: new Map(),
        complete: state.get("globals").has(expr.get("name")),
    }),
    targetable: (semant, state, expr) => {
        if (expr.has("__meta") && expr.get("__meta").toolbox.targetable) {
            return true;
        }
        if (state.get("toolbox").includes(expr.get("id"))) {
            // If in toolbox, only targetable if defined
            return state.get("globals").has(expr.get("name"));
        }
        return !expr.get("parent") || !expr.get("locked");
    },
    smallStep: (semant, stage, state, expr) => {
        let res = state.get("globals").get(expr.get("name"));
        if (!res) return null;

        const resNode = state.get("nodes").get(res);
        if (resNode.get("type") === "define") {
            res = resNode.get("body");
        }

        const result = semant.clone(res, state.get("nodes"));
        return [
            expr.get("id"),
            [ result[0].get("id") ],
            [ result[0].delete("parent").delete("parentField") ].concat(result[1]),
        ];
    },
    validateStep: (semant, state, expr) => {
        if (!state.get("globals").has(expr.get("name"))) {
            return [
                expr.get("id"),
                `We don't know what '${expr.get("name")}' is yet! Look for a "def ${expr.get("name")}".`,
            ];
        }
        const name = expr.get("name");
        if (!builtins.has(name)) return null;

        const {validate} = builtins.get(name);
        if (!validate) return null;
        const val = validate(expr, semant, state.get("nodes"));
        if (!val) return null;
        const { subexpr, msg } = val;
        return [ expr.get(subexpr), msg ];
    },
    projection: {
        type: "dynamic",
        field: (state, exprId) => {
            const name = state.getIn([ "nodes", exprId, "name" ]);
            if (state.get("globals").has(name)) {
                return "enabled";
            }
            return "default";
        },
        default: {
            type: "hbox",
            color: "OrangeRed",
            radius: 0,
            shape: "()",
            strokeWhenChild: true,
            children: [
                {
                    type: "text",
                    text: "{name}",
                    color: "gray",
                },
            ],
        },
        cases: {
            enabled: {
                type: "hbox",
                color: "OrangeRed",
                radius: 0,
                shape: "()",
                strokeWhenChild: true,
                children: [
                    {
                        type: "text",
                        text: "{name}",
                    },
                ],
            },
        },
    },
};

export default {
    reference: [
        baseReference,
        Object.assign({}, baseReference, {
            fields: ["name", "params"],
            subexpressions: (semant, expr) => {
                const params = (expr.get ? expr.get("params") : expr.params) || [];
                return params.map(name => `arg_${name}`);
            },
            /* The kind of a ref with or without params:
             *  f           : expr
             *  f a a a a   : expr
             *  f a a • •   : expr if f not builtin, value otherwise
             *  f • • • •   : topexpr (that is, treat as value if not at top)
             *  f • a • •   : expr (could be a topexpr)
             */
            kind: (ref, semant, state) => {
                const nodes = state.get("nodes");
                const params = ref.get("params");
                const nparams = params ? params.length : 0;
                const builtin = builtins.has(ref.get("name"));
                let incomplete = false,
                    args = false;
                for (let i = 0; i < nparams; i++) {
                    const p = params[i],
                          arg = nodes.get(ref.get(`arg_${p}`)),
                          hole = (arg.get("type") == "missing");
                    incomplete |= hole;
                    args |= !hole;
                    if (!incomplete && semant.kind(state, arg) === "expression") {
                        return "expression";
                    }
                    if (incomplete && !hole) return "expression"; // topexpr?
                }
                if (!incomplete) return "expression";
                if (!args) return "value";                        // topexpr. Or do we let substepFilter handle this?
                if (builtin) return "value";
                return "expression";
            },
            smallStep: (semant, stage, state, expr) => {
                // TODO: reuse orig smallStep somehow
                let res = state.get("globals").get(expr.get("name"));
                if (!res) return null;

                const resNode = state.get("nodes").get(res);
                if (resNode.get("type") === "define") {
                    res = resNode.get("body");
                }

                const name = expr.get("name");
                console.log(`stepping name ${name}`)

                if (builtins.has(name)) {
                    const {impl} = builtins.get(name);
                    if (impl) {
                        let resultExpr = impl(expr, semant, state.get("nodes"));
                        if (resultExpr == null) {
                            console.error(`Small step on ${expr.type} failed`);
                            return null;
                        }
                        return core.makeResult(expr, resultExpr, semant);
                    } else {
                        console.error(`Undefined builtin implementation: ${name}`);
                    }
                }

                if (!(expr.has("parent") && state.getIn([ "nodes", expr.get("parent"), "type"]) === "define") &&
                    expr.get("params") &&
                    expr.get("params").length > 0 &&
                    expr.get("params").some(field => state.getIn([
                        "nodes",
                        expr.get(`arg_${field}`),
                        "type",
                    ]) !== "missing")) {
                    const params = expr.get("params");
                    const result = semant.interpreter.betaReduce(
                        stage,
                        state, res,
                        params.map(name => expr.get(`arg_${name}`)),
                    );
                    if (result) {
                        const [ _, newNodeIds, addedNodes ] = result;
                        return [ expr.get("id"), newNodeIds, addedNodes ];
                    }
                    return null;
                }

                const result = semant.clone(res, state.get("nodes"));
                return [
                    expr.get("id"),
                    [ result[0].get("id") ],
                    [ result[0].delete("parent").delete("parentField") ].concat(result[1]),
                ];
            },
            // Only care about arguments if partially filled
            substepFilter: (semant, state, expr, field) => {
                const params = expr.get("params");
                if (!params || params.length === 0) {
                    // wait, wtf?
                    console.warn(`es6.reference#substepFilter: No params, but asked about field ${field}?`);
                    return true;
                }

                return !params.every(p => state.getIn([ "nodes", expr.get(`arg_${p}`), "type" ]) === "missing");
            },
            betaReduce: (semant, stage, state, expr, argIds) => {
                const nodes = state.get("nodes"),
                      result = semant.hydrate(nodes, expr),
                      np = result.params ? result.params.length : 0;
                let nmissing = 0, i = 0, j = 0;
                for (; i < argIds.length && j < np; i++) {
                    let param = null;
                    for (; j < np; j++) {
                        param = `arg_${result.params[j]}`;
                        if (result[param].type == "missing") break;
                    }
                    if (j == np) break;
                    const arg = semant.hydrate(nodes, nodes.get(argIds[i]));
                    result[param] = arg;
                }
                if (i != argIds.length) {
                    return [ "error", expr.get("id"), "Not enough holes for the supplied arguments" ];
                }
                return core.makeResult(expr, result, semant);
            },
            projection: {
                type: "dynamic",
                field: (state, exprId) => {
                    const name = state.getIn([ "nodes", exprId, "name" ]);
                    if (state.get("globals").has(name)) {
                        return "enabled";
                    }
                    return "default";
                },
                default: {
                    type: "hbox",
                    color: "OrangeRed",
                    radius: 0,
                    shape: "()",
                    strokeWhenChild: true,
                    children: [
                        {
                            type: "text",
                            text: "{name}",
                            color: "gray",
                        },
                        {
                            type: "generic",
                            view: [ "custom", "argumentBar" ],
                            options: {},
                        },
                    ],
                },
                cases: {
                    enabled: {
                        type: "hbox",
                        color: "OrangeRed",
                        radius: 0,
                        shape: "()",
                        strokeWhenChild: true,
                        children: [
                            {
                                type: "text",
                                text: "{name}",
                            },
                            {
                                type: "generic",
                                view: [ "custom", "argumentBar" ],
                                options: {},
                            },
                        ],
                    },
                },
            },
        })
    ],
};
