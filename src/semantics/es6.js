import * as core from './core';
import { ES6Parser, makeUnparser } from '../syntax/es6';
import transform from './transform';

import * as apply from './defs/apply';
import * as autograder from './defs/autograder';
import * as array from './defs/array';
import * as binop from './defs/binop';
import * as conditional from './defs/conditional';
import * as define from './defs/define';
import * as lambda from './defs/lambda';
import * as letExpr from './defs/letExpr';
import * as member from './defs/member';
import not from './defs/not';
import reference from './defs/reference';
import value from './defs/value';

function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.substr(1);
}

export default transform({
    name: 'ECMAScript 6',
    parser: {
        parse: (semanticsDefinition) => {
            // gradually introducing class-based model
            const parser = new ES6Parser(semanticsDefinition);
            return parser.parse.bind(parser);
        },
        unparse: makeUnparser,

        templatizeName: (semant, name) => {
            const defn = semant.definitionOf('symbol');
            const replacements = defn.nameReplacements || [];

            for (const [key, replacement] of replacements) {
                const Key = capitalize(key);
                const Replacement = capitalize(replacement);
                name = name.replace(new RegExp(key, 'g'), replacement)
                    .replace(new RegExp(Key, 'g'), Replacement);
            }
            return name;
        },

        extractDefines: (semant, expr) => {
            if (expr.type !== 'define') {
                return null;
            }
            // needs to be a thunk
            let thunk = null;
            // we have access to expr.params, so generate a thunk that
            // can take arguments
            if (expr.params) {
                const { params } = expr;
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

                    return semant.reference(expr.name, params, ...missing);
                };
                // Flag to the parser that this thunk can take arguments
                thunk.takesArgs = true;
            } else {
                thunk = () => semant.reference(expr.name, []);
            }
            return [expr.name, thunk];
        },

        extractGlobals: (semant, expr) => {
            if (expr.type !== 'define') {
                return null;
            }
            // We have access to expr.params
            return [expr.name, expr];
        },

        extractGlobalNames: (semant, name, expr) => {
            // We have access to expr.params
            if (expr.params) {
                const { params } = expr;
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
                    return semant.reference(expr.name, params, ...missing);
                };
                // Flag to the parser that this thunk can take arguments
                thunk.takesArgs = true;
                return [name, thunk];
            }
            return [name, () => semant.reference(name)];
        },

        postParse: (nodes, goal, board, toolbox, globals) => ({
            nodes,
            goal,
            board,
            toolbox,
            globals
        })
    },

    expressions: {
        missing: core.missing,

        ...apply,
        ...array,
        ...autograder,
        ...binop,
        ...conditional,
        ...define,
        ...lambda,
        ...letExpr,
        ...member,
        ...not,
        ...reference,
        ...value
    }
});
