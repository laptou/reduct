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

// Evaluate the "length" function. Return null if failure.
function builtinLength(expr, semant, nodes) {
    const arr = nodes.get(expr.get("arg_a"));
    if (arr.get("type") !== "array") console.error("Bad call to length")
    return semant.number(arr.get("length"));
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

function validateGet(expr, semant, state) {
    const gval = genericValidate(expr, semant, state);
    if (gval) return gval;

    const nodes = state.get("nodes"),
          arr = nodes.get(expr.get("arg_a")),
          i = nodes.get(expr.get("arg_i")),
          n = arr.get("length"),
          iv = i.get("value");

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

function validateSet(expr, semant, state) {
    const gval = genericValidate(expr, semant, state);
    if (gval) return gval;

    const nodes = state.get("nodes"),
          arr = nodes.get(expr.get("arg_a")),
          i = nodes.get(expr.get("arg_i")),
          iv = i.get("value"),
          n = arr.get("length");
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
    let fncall;
    if (f2.type == "reference" && f2.params && f2.params.length >= 2) {
        fncall = f2;
        f2[`arg_${f2.params[0]}`] = a.elem0;
        f2[`arg_${f2.params[1]}`] = init;
    } else {
        fncall = semant.apply(semant.apply(f2, a.elem0), init);
    }

    return semant.reference("fold", ["f", "a", "init"], 
        f1, a_tail, fncall);
}

function builtinSlice(expr, semant, nodes) {
    const a = semant.hydrate(nodes, nodes.get(expr.get("arg_array"))),
          b = nodes.get(expr.get("arg_begin")).get("value"),
          e = nodes.get(expr.get("arg_end")).get("value"),
          n = arr.get("length");
    
    const slice = [];
    for (let i = b; i < e; i++) {
        slice.push(a[`elem${i}`]);
    }
    return semant.array(e - b, ...slice);
}

function validateSlice(expr, semant, state) {
    const gval = genericValidate(expr, semant, state);
    if (gval) return gval;

    const nodes = state.get("nodes"),
          arr = nodes.get(expr.get("arg_array")),
          b = nodes.get(expr.get("arg_begin")).get("value"),
          e = nodes.get(expr.get("arg_end")).get("value"),
          n = arr.get("length");
    if (b < 0 || b >= n) {
        return { subexpr: "arg_begin",
                 msg: `The array index of the beginning of the slice must be between 0 and ${n-1}, because the array only has ${n} elements!`};
    }
    if (e < 0 || e > n) {
        return { subexpr: "arg_begin",
                 msg: `The end of the slice must be between 0 and ${n}, because the array only has ${n} elements!`};
    }
    return VALID;
}

export const builtins =
    immutable.Map({
        repeat: {params: [{n: 'number'}, {f: 'function'}], impl: builtinRepeat},
        length: {params: [{a: 'array'}], impl: builtinLength},
        get: {params: [{a: 'array'}, {i: 'number'}], impl: builtinGet, validate: validateGet},
        set: {params: [{a: 'array'}, {i: 'number'}, {v: 'any'}], impl: builtinSet, validate: validateSet},
        map: {params: [{f: 'function'}, {a: 'array'}], impl: builtinMap},
        fold: {params: [{f: 'function'}, {a: 'array'}, {init: 'any'}], impl: builtinFold},
        concat: {params: [{left:'array'}, {right:'array'}], impl: builtinConcat}, 
        slice: {params: [{array:'array'}, {begin: 'number'}, {end: 'number'}], impl: builtinSlice, validate: validateSlice}
    });

function nth(i) {
    switch (i) {
        case 1: return "first";
        case 2: return "second";
        case 3: return "third";
        case 4: return "fourth";
        case 5: return "fifth";
        default: return "";
    }
}

function article(n) {
    return (n.match(/[aeio]/).index == 0)
           ? `an ${n}`
           : `a ${n}`;
}

function compatible(ty, expected) {
    if (ty == "missing") return false;
    if (expected == ty) return true;
    if (expected == "function" && ty == "lambda") return true;
    if (expected == "any") return true;
    return false;
}

export function genericValidate(expr, semant, state) {
    const name = expr.get("name"),
          sig = builtins.get(name),
          params = sig.params,
          nodes = state.get("nodes");

    for (let i = 0; i < params.length; i++) {
        const n = Object.getOwnPropertyNames(params[i]),
              expected = params[i][n],
              actual = nodes.get(expr.get(`arg_${n}`));
        let ty = actual.get("type");
        if (ty == "reference") {
            const r = actual.get("name");
            if (builtins.has(r)) {
                ty = "lambda";
            } else {
                const id = state.get("globals").get(r);
                if (!id) {
                    return { subexpr: `arg_${n}`,
                             msg: `The name ${r} is not defined`};
                }
                const body = nodes.get(nodes.get(id).get("body"));
                ty = body.get("type");
            }
        }
        if (!compatible(ty, expected)) {
            return {subexpr: `arg_${n}`,
                    msg: `The ${nth(i+1)} argument to \"${name}\" must be ${article(expected)}.`};
        }
    }
    return null;
}
