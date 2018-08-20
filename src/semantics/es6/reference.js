import * as immutable from "immutable";

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
        return null;
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

function applyBuiltinRepeat(expr, semant, state) {
    // Black-box repeat
    const times = state.get("nodes").get(expr.get("arg_n"));
    const fn = state.get("nodes").get(expr.get("arg_f"));
    if (times.get("type") !== "number") return null;

    let resultExpr = semant.lambdaVar("x");
    for (let i = 0; i < times.get("value"); i++) {
        // Rehydrate each time to get a new copy
        const hydratedFn = semant.hydrate(state.get("nodes"), fn);
        delete hydratedFn["parent"];
        delete hydratedFn["parentField"];
        // If hydrated function is a
        // reference-with-holes, apply directly
        if (Array.isArray(hydratedFn.params) && hydratedFn.params.length > 0) {
            const arg = {};
            arg[`arg_${hydratedFn.params[0]}`] = resultExpr;
            resultExpr = Object.assign(hydratedFn, arg);
        }
        else {
            resultExpr = semant.apply(hydratedFn, resultExpr);
        }
        hydratedFn.locked = true;
        delete resultExpr["parent"];
        delete resultExpr["parentField"];
        resultExpr.locked = true;
    }
    resultExpr = semant.lambda(semant.lambdaArg("x"), resultExpr);
    const newNodes = semant.flatten(resultExpr).map(n => immutable.Map(n));
    return [
        expr.get("id"),
        [ newNodes[0].get("id") ],
        newNodes,
    ];
}

// Evaluate the "length" function. Return null if failure.
function applyBuiltinLength(expr, semant, state) {
    const nodes = state.get("nodes");
    const arr = nodes.get(expr.get("arg_a"));
    if (arr.get("type") !== "array") return null;
    const result = semant.number(arr.get("length"));
    const newNodes = semant.flatten(result).map(n => immutable.Map(n));
    return [
        expr.get("id"),
        [ newNodes[0].get("id") ],
        newNodes,
    ];
}

// Evaluate the "get" function. Return null if failure.
function applyBuiltinGet(expr, semant, state) {
    const nodes = state.get("nodes");
    const arr = nodes.get(expr.get("arg_a"));
    const i = nodes.get(expr.get("arg_i"));
    if (arr.get("type") !== "array") return null;
    if (i.get("type") !== "number") return null;
    const iv = i.get("value");
    const n = arr.get("length");
    if (iv < 0 || iv >= n) return null;
    const result = nodes.get(arr.get(`elem${iv}`));
    const newNodes = semant.flatten(result).map(n => immutable.Map(n));
    return [
        expr.get("id"),
        [ newNodes[0].get("id") ],
        newNodes,
    ];
}

/*
// Evaluate the "get" function. Return null if failure.
function applyBuiltinSet(expr, semant, state) {
    const nodes = state.get("nodes");
    const arr = nodes.get(expr.get("arg_a"));
    const i = nodes.get(expr.get("arg_i"));
    const v = nodes.get(expr.get("arg_v"));
    if (arr.get("type") !== "array") return null;
    if (i.get("type") !== "number") return null;
    const iv = i.get("value");
    const n = arr.get("length");
    if (iv < 0 || iv >= n) return null;
    const result = nodes.get(arr.get(`elem${iv}`));

    const newNodes = semant.flatten(result).map(n => immutable.Map(n));
    return [
        expr.get("id"),
        [ newNodes[0].get("id") ],
        newNodes,
    ];
}
*/

const specialFunctions = immutable.Map({
                           repeat: {args: 2, impl: applyBuiltinRepeat},
                           length: {args: 1, impl: applyBuiltinLength},
                           get: {args: 2, impl: applyBuiltinGet},
                           set: {args: 3, impl: undefined},
                           map: {args: 2, impl: undefined},
                           fold: {args: 2, impl: undefined},
                           concat: {args: 2, impl: undefined}, 
                         });

export default {
    reference: [
        baseReference,
        Object.assign({}, baseReference, {
            fields: ["name", "params"],
            subexpressions: (semant, expr) => {
                const params = (expr.get ? expr.get("params") : expr.params) || [];
                return params.map(name => `arg_${name}`);
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

                if (specialFunctions.has(name)) {
                    const {args, impl} = specialFunctions.get(name);
                    if (impl)
                        return impl(expr, semant, state);
                    else
                        console.log(`Undefined builtin implementation: ${name}`);
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
