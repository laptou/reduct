import { parseProgram, serializeNode } from '../syntax/es6';

import { Semantics } from './transform';
import * as apply from './defs/apply';
import * as autograder from './defs/autograder';
import * as array from './defs/array';
import * as binop from './defs/binop';
import * as conditional from './defs/conditional';
import * as define from './defs/define';
import * as lambda from './defs/lambda';
import * as letExpr from './defs/let';
import * as member from './defs/member';
import * as missing from './defs/missing';
import * as not from './defs/not';
import * as reference from './defs/identifier';
import * as value from './defs/value';

export default new Semantics({
  name: 'ECMAScript 6',
  parser: {
    parse: parseProgram,
    unparse: serializeNode,

    extractDefines: (semant, expr) => {
      if (expr.type !== 'define') {
        return null;
      }
      // needs to be a thunk
      let thunk = null;
      // we have access to expr.params, so generate a thunk that
      // can take arguments
      if (expr.fields.params) {
        const { params } = expr.fields;
        thunk = (...args) => {
          const missing = params.map((_, idx) => {
            if (args[idx]) {
              return args[idx];
            }
            // TODO: why is locked not respected?
            const a = semant.missing();
            a.locked = false;
            return a;
          });

          return semant.reference(expr.fields.name, params, ...missing);
        };
        // Flag to the parser that this thunk can take arguments
        thunk.takesArgs = true;
      } else {
        thunk = () => semant.reference(expr.fields.name, []);
      }
      return [expr.fields.name, thunk];
    },

    extractGlobals: (semant, expr) => {
      if (expr.type !== 'define') {
        return null;
      }
      // We have access to expr.params
      return [expr.fields.name, expr];
    },

    extractGlobalNames: (semant, name, expr) => {
      // We have access to expr.params
      if (expr.fields.params) {
        const { params } = expr.fields;
        const thunk = (...args) => {
          const missing = params.map((_, idx) => {
            if (args[idx]) {
              return args[idx];
            }
            // TODO: why is locked not respected?
            const a = semant.missing();
            a.locked = false;
            return a;
          });
          return semant.reference(expr.fields.name, params, ...missing);
        };
        // Flag to the parser that this thunk can take arguments
        thunk.takesArgs = true;
        return [name, thunk];
      }
      return [name, () => semant.reference(name)];
    },
  },

  expressions: {
    ...apply,
    ...array,
    ...autograder,
    ...binop,
    ...conditional,
    ...define,
    ...lambda,
    ...letExpr,
    ...member,
    ...missing,
    ...not,
    ...reference,
    ...value,
  },
});
