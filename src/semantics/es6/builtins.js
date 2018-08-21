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

function validateRepeat(expr, semant, nodes) {
    const times = nodes.get(expr.get("arg_n"));
    const fn = nodes.get(expr.get("arg_f"));
    if (times.get("type") !== "number")
        return { subexpr: "arg_n",
                 msg: "the first argument must be the number of times to repeat the function!" }
    if (fn.get("type") !== "reference" && fn.get("type") !== "lambda")
        return { subexpr: "arg_f",
                 msg: "the second argument must be a function to be repeated!" };
    return null;
}

// Evaluate the "length" function. Return null if failure.
function builtinLength(expr, semant, nodes) {
    const arr = nodes.get(expr.get("arg_a"));
    if (arr.get("type") !== "array") return null;
    return semant.number(arr.get("length"));
}

function validateLength(expr, semant, nodes) {
    const arr = nodes.get(expr.get("arg_a"));
    if (arr.get("type") !== "array") {
        return { subexpr: "arg_a",
                 msg: "We can only get the length of an array!" };
    }
    return null;
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

function validateGet(expr, semant, nodes) {
    const arr = nodes.get(expr.get("arg_a"));
    const i = nodes.get(expr.get("arg_i"));
    if (arr.get("type") !== "array")
        return { subexpr: "arg_a", msg: "Can only get elements from an array!" };
    if (i.get("type") !== "number") 
        return { subexpr: "arg_i", msg: "The array index must be a number!" };

    const iv = i.get("value");
    const n = arr.get("length");
    if (iv < 0 || iv >= n) {
        return { subexpr: "arg_i",
                 msg: `This array index must be between 0 and ${n-1}, because the array only has ${n} elements!`};
    }
    return null;
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

function validateSet(expr, semant, nodes) {
    const arr = nodes.get(expr.get("arg_a")),
          i = nodes.get(expr.get("arg_i")),
          v = nodes.get(expr.get("arg_v"));
    if (arr.get("type") !== "array")
        return {subexpr: "arg_a", msg: "The first argument to \"set\" must be an array!" };
    if (i.get("type") !== "number")
        return {subexpr: "arg_i", msg: "The second argument to \"set\" is an array index and must be a number!" };
    const iv = i.get("value");
    const n = arr.get("length");
    if (iv < 0 || iv >= n) 
        return { subexpr: "arg_i",
                 msg: `This array index must be between 0 and ${n-1}, because the array only has ${n} elements!`};
    return null;
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

function validateConcat(expr, semant, nodes) {
    const left = nodes.get(expr.get("arg_left")),
          right = nodes.get(expr.get("arg_right"));
    
    if (left.get("type") !== "array")
        return {subexpr: "arg_left", msg: "concat can only be used on two arrays!"}
    if (right.get("type") !== "array")
        return {subexpr: "arg_right", msg: "concat can only be used on two arrays!"}
    return null;
}


export const builtins = immutable.Map({
                           repeat: {args: 2, impl: builtinRepeat, validate: validateRepeat},
                           length: {args: 1, impl: builtinLength, validate: validateLength},
                           get: {args: 2, impl: builtinGet, validate: validateGet},
                           set: {args: 3, impl: builtinSet, validate: validateSet},
                           map: {args: 2, impl: undefined},
                           fold: {args: 2, impl: undefined},
                           concat: {args: 2, impl: builtinConcat, validate: validateConcat}, 
                         });
