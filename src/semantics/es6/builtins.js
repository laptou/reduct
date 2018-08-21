import * as immutable from "immutable";

const VALID = null;

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
    return VALID;
}

// Evaluate the "length" function. Return null if failure.
function builtinLength(expr, semant, nodes) {
    const arr = nodes.get(expr.get("arg_a"));
    if (arr.get("type") !== "array") console.error("Bad call to length")
    return semant.number(arr.get("length"));
}

function validateLength(expr, semant, nodes) {
    const arr = nodes.get(expr.get("arg_a"));
    if (arr.get("type") !== "array") {
        return { subexpr: "arg_a",
                 msg: "We can only get the length of an array!" };
    }
    return VALID;
}

// Evaluate the "get" function. Return null if failure.
// Requires call has already been validated. 
function builtinGet(expr, semant, nodes) {
    const arr = nodes.get(expr.get("arg_a"));
    const i = nodes.get(expr.get("arg_i"));
    const iv = i.get("value");
    const n = arr.get("length");
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
    return VALID;
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
    return VALID;
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

function builtinMap(expr, semant, nodes) {
    const a = semant.hydrate(nodes, nodes.get(expr.get("arg_a"))),
          n = a.length

    const elems = [];
    for (let j = 0; j < n; j++) {
        const f = semant.hydrate(nodes, nodes.get(expr.get("arg_f"))); // need copy per call

        if (f.type == "reference" && f.params && f.params.length == 1 && f[`arg_${f.params[0]}`].type == "missing") {
            f[`arg_${f.params[0]}`] = a[`elem${j}`];
            elems.push(f);
        } else {
            elems.push(semant.apply(f, a[`elem${j}`]));
        }
    }
    return semant.array(n, ...elems);
}

function validateMap(expr, semant, nodes) {
    const f = nodes.get(expr.get("arg_f")),
          a = nodes.get(expr.get("arg_a"));

    if (f.get("type") !== "reference" &&
        f.get("type") !== "lambda") {
        return {subexpr: "arg_f",
                msg: "The first argument to \"map\" must be a function."}
    }
    if (a.get("type") !== "array") {
        return {subexpr: "arg_a",
                msg: "The second argument to \"map\" must be an array."}
    }
    return null;
}

// fold a f init = f(a[n-1], ..., f(a[2], f(a[1], f(a[0], init))))
//    let b = f(a[0], init) in
//      fold(a[1..], f, b)
//     = fold(a[1..], f, f(a[0], init))
// fold [] f init = init
function builtinFold(expr, semant, nodes) {
    const a = semant.hydrate(nodes, nodes.get(expr.get("arg_a"))),
          n = a.length,
          init = semant.hydrate(nodes, nodes.get(expr.get("arg_init"))),
          f = nodes.get(expr.get("arg_f")),
          f1 = semant.hydrate(nodes, f),
          f2 = semant.hydrate(nodes, f);

    if (n == 0) return init;

    const tail = [];
    for (let j = 1; j < n; j++) {
        tail.push(a[`elem${j}`]);
    }
    const a_tail = semant.array(n-1, ...tail);

    return semant.reference("fold", ["arg_f", "arg_a", "arg_init"], 
        f1, a_tail, semant.apply(f2, a.elem0, init));
}

function validateFold(expr, semant, nodes) {
    const f = nodes.get(expr.get("arg_f")),
          a = nodes.get(expr.get("arg_a")),
          init = nodes.get(expr.get("arg_init"));
    if (f.get("type") !== "reference" &&
        f.get("type") !== "lambda") {
        return {subexpr: "arg_f",
                msg: "The first argument to \"fold\" must be a function."}
    }
    if (a.get("type") !== "array") {
        return {subexpr: "arg_a",
                msg: "The second argument to \"fold\" must be an array."}
    }
    return null;
}

export const builtins = immutable.Map({
                           repeat: {args: 2, impl: builtinRepeat, validate: validateRepeat},
                           length: {args: 1, impl: builtinLength, validate: validateLength},
                           get: {args: 2, impl: builtinGet, validate: validateGet},
                           set: {args: 3, impl: builtinSet, validate: validateSet},
                           map: {args: 2, impl: builtinMap, validate: validateMap},
                           fold: {args: 2, impl: builtinFold, validate: validateFold},
                           concat: {args: 2, impl: builtinConcat, validate: validateConcat}, 
                         });
