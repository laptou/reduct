import type { NodeDef } from './base';
import { BaseNode, NodeId } from '..';

/**
 * OpNode is a Reduct node that represents a mathematical operation
 */
export interface OpNode extends BaseNode {
    type: 'op';
    name: any;
}


export const op: NodeDef<OpNode> = {
    kind: 'syntax',
    fields: ['name'],
    subexpressions: [],
    projection: {
        type: 'text',
        text: '{name}'
    }
};

/**
 * BinOpNode is a Reduct node that represents a binary operation
 */
export interface BinOpNode extends BaseNode {
    type: 'binop';
    left: NodeId;
    op: NodeId;
    right: NodeId;
}

export const binop: NodeDef<BinOpNode> = {
    kind: 'expression',
    fields: [],
    subexpressions: ['left', 'op', 'right'],
    projection: {
        type: 'case',
        key: (nodes, expr) => nodes.get(expr.get('op')).get('name'),
        cases: {
            '+': {
                type: 'default',
                shape: '()',
                color: '#ffcc00'
            },
            '-': {
                type: 'default',
                shape: '()',
                color: '#ffcc00'
            },
            '>': {
                type: 'default',
                shape: '()',
                color: '#ffcc00'
            },
            '<': {
                type: 'default',
                shape: '()',
                color: '#ffcc00'
            },
            '==': {
                type: 'default',
                shape: '<>',
                color: 'hotpink',
                padding: {
                    left: 25,
                    right: 25,
                    inner: 10,
                    top: 0,
                    bottom: 0
                }
            },
            '&&': {
                type: 'default',
                shape: '<>',
                color: 'hotpink',
                padding: {
                    left: 25,
                    right: 25,
                    inner: 10,
                    top: 0,
                    bottom: 0
                }
            },
            '||': {
                type: 'default',
                shape: '<>',
                color: 'hotpink',
                padding: {
                    left: 25,
                    right: 25,
                    inner: 10,
                    top: 0,
                    bottom: 0
                }
            }
        }
    },

    stepSound: (semant, state, expr) => {
        const op = state.get('nodes').get(expr.get('op'));
        if (op.get('name') === '==') {
            return ['shatter1', 'heatup'];
        }
        return ['heatup'];
    },

    type: (semant, state, types, expr) => {
        const nodes = state.get('nodes');
        const opExpr = nodes.get(expr.get('op'));
        const id = expr.get('id');
        const result = new Map();
        if (!opExpr) {
            result.set(id, 'unknown');
        }

        const op = opExpr.get('name');
        if (op === '==' || op === '||' || op === '&&') {
            result.set(id, 'boolean');

            if (op === '||' || op === '&&') {
                result.set(expr.get('left'), 'boolean');
                result.set(expr.get('right'), 'boolean');
            }
        } else if (op === '+') {
            // Not setting a type for '+',
            // thereby keeping it undefined. This
            // is necessary for concatenation of strings to work in an if else block.
            // If we do not keep it undefined, then the types of the first and second slots
            // in the if block do not match.
            // TODO: (sameer) perhaps can be resolved by creating a new union type for
            //  strings and numbers?
        } else {
            result.set(id, 'number');
            result.set(expr.get('left'), 'number');
            result.set(expr.get('right'), 'number');
        }

        return {
            types: result,
            // TODO: less ad-hoc
            complete: (types.get(expr.get('left')) === 'number'
                || nodes.get(expr.get('left')).get('type') === 'lambdaVar')
                && (types.get(expr.get('right')) === 'number'
                    || nodes.get(expr.get('right')).get('type') === 'lambdaVar')
        };
    },
    // Invariant: all subexpressions are values or syntax;
    // none are missing. Return the first subexpression, if
    // any, that is blocking evaluation.
    validateStep: (semant, state, expr) => {
        const nodes = state.get('nodes');
        const left = expr.get('left');
        const leftExpr = nodes.get(left);
        const right = expr.get('right');
        const rightExpr = nodes.get(right);
        const op = nodes.get(expr.get('op')).get('name');

        if (op === '+') {
            if (leftExpr.get('ty') !== 'number' && leftExpr.get('type') !== 'string') {
                return [left, '+ can only add numbers or strings'];
            }
            if (rightExpr.get('ty') !== 'number' && rightExpr.get('type') !== 'string') {
                return [right, '+ can only add numbers or strings'];
            }
            if (leftExpr.get('ty') === 'number' && rightExpr.get('type') === 'string') {
                return [right, 'cannot add a number and a string'];
            }
            if (leftExpr.get('type') === 'string' && rightExpr.get('ty') === 'number') {
                return [right, 'cannot add a number and a string'];
            }
        }

        if (op === '-' || op === '>' || op === '<') {
            if (leftExpr.get('ty') !== 'number') {
                return [left, `${op} can only ${op === '+' ? 'add' : 'subtract'} numbers!`];
            }
            if (rightExpr.get('ty') !== 'number') {
                return [right, `${op} can only ${op === '+' ? 'add' : 'subtract'} numbers!`];
            }
        } else if (op === '==') {
            if (leftExpr.get('ty') !== rightExpr.get('ty')) {
                return [right, 'Both sides of == need to be the same kind of thing.'];
            }
        } else if (op === '||' || op === '&&') {
            if (leftExpr.get('ty') !== 'boolean') {
                return [left, `${op} can only ${op === '||' ? 'OR' : 'AND'} booleans!`];
            }
            if (rightExpr.get('ty') !== 'boolean') {
                return [right, `${op} can only ${op === '||' ? 'OR' : 'AND'} booleans!`];
            }
        }

        return null;
    },
    // TODO: switch to Immutable.Record to clean this up
    smallStep: (semant, stage, state, expr) => {
        const nodes = state.get('nodes');
        const op = nodes.get(expr.get('op')).get('name');
        if (op === '+') {
            if (nodes.get(expr.get('left')).get('type') === 'number') {
                return semant.number(nodes.get(expr.get('left')).get('value')
                    + nodes.get(expr.get('right')).get('value'));
            }

            return semant.string(nodes.get(expr.get('left')).get('value')
                + nodes.get(expr.get('right')).get('value'));
        }
        if (op === '-') {
            return semant.number(nodes.get(expr.get('left')).get('value')
                - nodes.get(expr.get('right')).get('value'));
        }
        if (op === '>') {
            return semant.bool(nodes.get(expr.get('left')).get('value')
                > nodes.get(expr.get('right')).get('value'));
        }

        if (op === '<') {
            return semant.bool(nodes.get(expr.get('left')).get('value')
                < nodes.get(expr.get('right')).get('value'));
        }
        if (op === '==') {
            return semant.bool(semant.deepEqual(nodes,
                nodes.get(expr.get('left')),
                nodes.get(expr.get('right'))));
        }
        if (op === '||') {
            return semant.bool(nodes.get(expr.get('left')).get('value')
                || nodes.get(expr.get('right')).get('value'));
        }
        if (op === '&&') {
            return semant.bool(nodes.get(expr.get('left')).get('value')
                && nodes.get(expr.get('right')).get('value'));
        }
        throw `Unrecognized operator ${op}`;
    }
};
