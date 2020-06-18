import * as immutable from 'immutable';

const VALID = null;

function hydrateLocked(expr, semant, nodes) {
  return semant.lockSubexprs(semant.hydrate(nodes, expr), nodes);
}

function hydrateInput(expr, semant, nodes) {
  const result = semant.lockSubexprs(semant.hydrate(nodes, expr), nodes);
  result.locked = true;
  return result;
}

function builtinRepeat(expr, semant, nodes) {
  // Black-box repeat
  const times = nodes.get(expr.subexpressions.arg_n);
  const fn = nodes.get(expr.subexpressions.arg_f);
  if (times.type !== 'number') return null;

  let resultExpr = semant.lambdaVar('x');
  for (let i = 0; i < times.value; i++) {
    // Rehydrate each time to get a new copy
    const hydratedFn = hydrateInput(fn, semant, nodes);
    delete hydratedFn.parent;
    delete hydratedFn.parentField;
    // If hydrated function is a
    // reference-with-holes, apply directly
    if (Array.isArray(hydratedFn.params) && hydratedFn.params.length > 0) {
      const arg = {};
      arg.subexpressions[`arg_${hydratedFn.params[0]}`] = resultExpr;
      resultExpr = Object.assign(hydratedFn, arg);
    } else {
      resultExpr = semant.apply(hydratedFn, resultExpr);
    }
    delete resultExpr.parent;
    delete resultExpr.parentField;
    resultExpr.locked = true;
  }
  return semant.lambda(semant.lambdaArg('x'), resultExpr);
}

// Evaluate the "length" function. Return null if failure.
function builtinLength(expr, semant, nodes) {
  const arr = nodes.get(expr.subexpressions.arg_a);
  if (arr.type === 'array') {
    return semant.number(arr.fields.length);
  }
  if (arr.type === 'string') {
    return semant.number(arr.fields.value.length);
  }

  console.error('Bad call to length');
}

// Evaluate the "get" function. Return null if failure.
// Requires call has already been validated.
function builtinGet(expr, semant, nodes) {
  const arr = nodes.get(expr.subexpressions.arg_a);
  const i = nodes.get(expr.subexpressions.arg_i);
  const iv = i.value;
  const n = arr.length;
  if (arr.type === 'string') {
    return semant.string(arr.fields.value[iv]);
  }
  if (arr.type === 'array') {
    return hydrateLocked(nodes.get(arr.subexpressions[`elem${iv}`]), semant, nodes);
  }
}

function validateGet(expr, semant, state) {
  const gval = genericValidate(expr, semant, state);
  if (gval) return gval;

  const nodes = state.nodes;
  const arr = nodes.get(expr.subexpressions.arg_a);
  const i = nodes.get(expr.subexpressions.arg_i);
  const n = arr.length;
  const iv = i.value;

  if (iv < 0 || iv >= n) {
    return {
      subexpr: 'arg_i',
      msg: `This array index must be between 0 and ${n - 1}, because the array only has ${n} elements!`
    };
  }
  return VALID;
}


// Evaluate the "set" function, which nondestructively
// updates an array element. Return null if failure.
function builtinSet(expr, semant, nodes) {
  const arr = nodes.get(expr.subexpressions.arg_a);
  const i = nodes.get(expr.subexpressions.arg_i);
  const v = nodes.get(expr.subexpressions.arg_v);
  if (arr.type !== 'array') return null;
  if (i.type !== 'number') return null;
  const iv = i.value;
  const n = arr.length;
  if (iv < 0 || iv >= n) return null;
  const elems = [];
  const new_elem = hydrateInput(v, semant, nodes);
  for (let j = 0; j < n; j++) {
    elems.push(iv == j
      ? new_elem
      : hydrateLocked(nodes.get(arr.subexpressions[`elem${j}`]), semant, nodes));
  }
  return semant.array(n, ...elems);
}

function validateSet(expr, semant, state) {
  const gval = genericValidate(expr, semant, state);
  if (gval) return gval;

  const nodes = state.nodes;
  const arr = nodes.get(expr.subexpressions.arg_a);
  const i = nodes.get(expr.subexpressions.arg_i);
  const iv = i.value;
  const n = arr.length;
  if (iv < 0 || iv >= n) {
    return {
      subexpr: 'arg_i',
      msg: `This array index must be between 0 and ${n - 1}, because the array only has ${n} elements!`
    };
  }
  return VALID;
}

function builtinConcat(expr, semant, nodes) {
  const left = nodes.get(expr.subexpressions.arg_left);
  const right = nodes.get(expr.subexpressions.arg_right);

  if (left.type !== 'array') return null;
  if (right.type !== 'array') return null;
  const nl = left.length;
  const nr = right.length;
  const elems = [];
  for (let j = 0; j < nl + nr; j++) {
    const id = j < nl ? left.subexpressions[`elem${j}`]
      : right.subexpressions[`elem${j - nl}`];
    const e = hydrateLocked(nodes.get(id), semant, nodes);
    e.locked = true;
    elems.push(e);
  }
  return semant.array(nl + nr, ...elems);
}

function builtinMap(expr, semant, nodes) {
  const a = hydrateLocked(nodes.get(expr.subexpressions.arg_a), semant, nodes);
  const n = a.length;

  const elems = [];
  for (let j = 0; j < n; j++) {
    const f = hydrateInput(nodes.get(expr.subexpressions.arg_f), semant, nodes); // need copy per call

    if (f.type == 'reference' && f.fields.params?.length == 1 && f.subexpressions[`arg_${f.params[0]}`].type == 'missing') {
      f.subexpressions[`arg_${f.params[0]}`] = a.subexpressions[`elem${j}`];
      elems.push(f);
    } else {
      elems.push(semant.apply(f, a.subexpressions[`elem${j}`]));
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
  const a = hydrateInput(nodes.get(expr.subexpressions.arg_a), semant, nodes);
  const n = a.length;
  const init = hydrateInput(nodes.get(expr.subexpressions.arg_init), semant, nodes);
  const f = nodes.get(expr.subexpressions.arg_f);
  const f1 = hydrateInput(f, semant, nodes);
  const f2 = hydrateInput(f, semant, nodes);

  if (n == 0) return init;

  const tail = [];
  for (let j = 1; j < n; j++) {
    tail.push(a.subexpressions[`elem${j}`]);
  }
  const a_tail = semant.array(n - 1, ...tail);
  let fncall;
  if (f2.type == 'reference' && f2.fields.params?.length >= 2) {
    fncall = f2;
    f2.subexpressions[`arg_${f2.params[0]}`] = a.elem0;
    f2.subexpressions[`arg_${f2.params[1]}`] = init;
  } else {
    fncall = semant.apply(semant.apply(f2, a.subexpressions.elem0), init);
  }

  return semant.reference('fold', ['f', 'a', 'init'], f1, a_tail, fncall);
}

function builtinSlice(expr, semant, nodes) {
  const a = hydrateInput(nodes.get(expr.subexpressions.arg_array), semant, nodes);
  const b = nodes.get(expr.subexpressions.arg_begin).value;
  const e = nodes.get(expr.subexpressions.arg_end).value;
  const n = a.length; // arr.get("length");

  if (a.type === 'array') {
    const slice = [];
    for (let i = b; i < e; i++) {
      slice.push(a.subexpressions[`elem${i}`]);
    }
    return semant.array(e - b, ...slice);
  }
  if (a.type === 'string') {
    return semant.string(a.value.slice(b, e));
  }
}

function validateSlice(expr, semant, state) {
  const gval = genericValidate(expr, semant, state);
  if (gval) return gval;

  const nodes = state.nodes;
  const arr = nodes.get(expr.arg_array);
  const b = nodes.get(expr.arg_begin).value;
  const e = nodes.get(expr.arg_end).value;
  const n = arr.length;
  if (b < 0 || b >= n) {
    return {
      subexpr: 'arg_begin',
      msg: `The array index of the beginning of the slice must be between 0 and ${n - 1}, because the array only has ${n} elements!`
    };
  }
  if (e < 0 || e > n) {
    return {
      subexpr: 'arg_begin',
      msg: `The end of the slice must be between 0 and ${n}, because the array only has ${n} elements!`
    };
  }
  return VALID;
}

export const builtins = immutable.Map({
  // repeat: {params: [{n: 'number'}, {f: 'function'}], impl: builtinRepeat},
  length: { params: [{ a: 'any' }], impl: builtinLength },
  get: { params: [{ a: 'any' }, { i: 'number' }], impl: builtinGet, validate: validateGet },
  set: { params: [{ a: 'array' }, { i: 'number' }, { v: 'any' }], impl: builtinSet, validate: validateSet },
  map: { params: [{ f: 'function' }, { a: 'array' }], impl: builtinMap },
  fold: { params: [{ f: 'function' }, { a: 'array' }, { init: 'any' }], impl: builtinFold },
  concat: { params: [{ left: 'array' }, { right: 'array' }], impl: builtinConcat },
  slice: { params: [{ array: 'any' }, { begin: 'number' }, { end: 'number' }], impl: builtinSlice, validate: validateSlice }
});

function nth(i) {
  switch (i) {
  case 1: return 'first';
  case 2: return 'second';
  case 3: return 'third';
  case 4: return 'fourth';
  case 5: return 'fifth';
  default: return '';
  }
}

function article(n) {
  return (n.match(/[aeio]/).index == 0)
    ? `an ${n}`
    : `a ${n}`;
}

function compatible(ty, expected) {
  if (ty == 'missing') return false;
  if (expected == ty) return true;
  if (expected == 'function' && ty == 'lambda') return true;
  if (expected == 'any') return true;
  return false;
}

export function genericValidate(expr, semant, state) {
  const name = expr.name;
  const sig = builtins.get(name);
  const { params } = sig;
  const nodes = state.nodes;

  for (let i = 0; i < params.length; i++) {
    const n = Object.getOwnPropertyNames(params[i]);
    const expected = params[i][n];
    const actual = nodes.get(expr.get(`arg_${n}`));
    let ty = actual.type;
    if (ty == 'reference') {
      const r = actual.name;
      if (builtins.has(r)) {
        ty = 'lambda';
      } else {
        const id = state.globals.get(r);
        if (!id) {
          return {
            subexpr: `arg_${n}`,
            msg: `The name ${r} is not defined`
          };
        }
        const body = nodes.get(nodes.get(id).body);
        ty = body.type;
      }
    }
    if (!compatible(ty, expected)) {
      return {
        subexpr: `arg_${n}`,
        msg: `The ${nth(i + 1)} argument to \"${name}\" must be ${article(expected)}!`
      };
    }
  }
  return null;
}
