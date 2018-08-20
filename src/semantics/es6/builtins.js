import * as immutable from "immutable";

function builtinRepeat(expr, semant, nodes) {
    // Black-box repeat
    const times = nodes.get(expr.get("arg_n"));
    const fn = nodes.get(expr.get("arg_f"));
    if (times.get("type") !== "number") return null;

    let resultExpr = semant.lambdaVar("x");
    for (let i = 0; i < times.get("value"); i++) {
        // Rehydrate each time to get a new copy
        const hydratedFn = semant.hydrate(nodes, fn);
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
    return semant.lambda(semant.lambdaArg("x"), resultExpr);
}

// Evaluate the "length" function. Return null if failure.
function builtinLength(expr, semant, nodes) {
    const arr = nodes.get(expr.get("arg_a"));
    if (arr.get("type") !== "array") return null;
    return semant.number(arr.get("length"));
}

// Evaluate the "get" function. Return null if failure.
function builtinGet(expr, semant, nodes) {
    const arr = nodes.get(expr.get("arg_a"));
    const i = nodes.get(expr.get("arg_i"));
    if (arr.get("type") !== "array") return null;
    if (i.get("type") !== "number") return null;
    const iv = i.get("value");
    const n = arr.get("length");
    if (iv < 0 || iv >= n) return null;
    return semant.hydrate(nodes, nodes.get(arr.get(`elem${iv}`)));
}

// Evaluate the "set" function, which nondestructively
// updates an array element. Return null if failure.
function builtinSet(expr, semant, nodes) {
    const arr = nodes.get(expr.get("arg_a")),
          i = nodes.get(expr.get("arg_i")),
          v = nodes.get(expr.get("arg_v"));
    if (arr.get("type") !== "array") return null;
    if (i.get("type") !== "number") return null;
    const iv = i.get("value");
    const n = arr.get("length");
    if (iv < 0 || iv >= n) return null;
    const elems = [];
    const new_elem = semant.hydrate(nodes, v);
    new_elem.locked = true;
    for (let j = 0; j < n; j++) {
        elems.push(iv == j
            ? new_elem
            : semant.hydrate(nodes, nodes.get(arr.get(`elem${j}`))));
    }
    return semant.array(n, ...elems);
}

function builtinConcat(expr, semant, nodes) {
    const left = nodes.get(expr.get("arg_left")),
          right = nodes.get(expr.get("arg_right"));
    
    if (left.get("type") !== "array") return null;
    if (right.get("type") !== "array") return null;
    const nl = left.get("length"),
          nr = right.get("length");
    const elems = [];
    for (let j = 0; j < nl; j++) {
        elems.push(semant.hydrate(nodes, nodes.get(left.get(`elem${j}`))));
    }
    for (let j = 0; j < nr; j++) {
        elems.push(semant.hydrate(nodes, nodes.get(right.get(`elem${j}`))));
    }
    return semant.array(nl + nr, ...elems);
}

export const builtins = immutable.Map({
                           repeat: {args: 2, impl: builtinRepeat},
                           length: {args: 1, impl: builtinLength},
                           get: {args: 2, impl: builtinGet},
                           set: {args: 3, impl: builtinSet},
                           map: {args: 2, impl: undefined},
                           fold: {args: 2, impl: undefined},
                           concat: {args: 2, impl: builtinConcat}, 
                         });
