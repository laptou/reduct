import * as fx from '../../gfx/fx';
import { ExprDefinition } from '.';
import type { RId, RNode } from '..';
import { genericBetaReduce } from '../core';

export interface LambdaNode extends RNode {
    arg: RId;
    body: RId;
}

export interface LambdaArgNode extends RNode {
    name: string;
    functionHole: any;
}

export interface LambdaVarNode extends RNode {
    name: string;
}

export const lambda: ExprDefinition<LambdaNode> = {
    kind: 'value',
    type: (semant, state, types, expr) => ({
        types: new Map([[expr.get('id'), 'lambda']]),
        complete: typeof types.get(expr.get('body')) !== 'undefined'
    }),
    fields: [],
    subexpressions: ['arg', 'body'],
    projection: {
        type: 'default',
        shape: '()',
        fields: ['arg', '\'=>\'', 'body'],
        subexpScale: 1.0,
        padding: {
            top: 3.5,
            bottom: 3.5,
            left: 10,
            right: 10,
            inner: 5
        }
    },
    betaReduce: (semant, stage, state, expr, argIds) => genericBetaReduce(semant, state, {
        topNode: expr,
        targetNode: state.get('nodes').get(expr.get('arg')),
        argIds,
        targetName: (node) => node.get('name'),
        isVar: (node) => node.get('type') === 'lambdaVar',
        varName: (node) => node.get('name'),
        isCapturing: (node) => node.get('type') === 'lambda',
        captureName: (nodes, node) => nodes.get(node.get('arg')).get('name'),
        animateInvalidArg: (id) => {
            const node = state.getIn(['nodes', id]);
            if (node.get('type') === 'lambdaVar') {
                stage.feedback.update('#000', [`We don't know what ${node.get('name')} is!`]);
            }
            fx.error(stage, stage.views[id]);
        }
    })
};

export const lambdaArg: ExprDefinition<LambdaArgNode> = {
    fields: ['name', 'functionHole'],
    subexpressions: [],
    targetable: (semant, state, expr) => {
        const nodes = state.get('nodes');
        const lambdaParent = nodes.get(expr.get('parent'));
        return !lambdaParent.has('parent');
    },
    projection: {
        type: 'preview',
        content: {
            type: 'dynamic',
            resetFields: ['text', 'color'],
            field: (state, exprId) => {
                const isFunctionHole = !!state.getIn(['nodes', exprId, 'functionHole']);
                if (isFunctionHole) return 'functionHole';
                return 'default';
            },
            default: {
                type: 'text',
                text: '({name})'
            },
            cases: {
                functionHole: {
                    type: 'default',
                    shape: '()',
                    radius: 0,
                    fields: ['name']
                }
            }
        }
    },
    betaReduce: (semant, stage, state, expr, argIds) => {
        if (expr.get('parent')) {
            return semant.interpreter.betaReduce(stage, state, expr.get('parent'), argIds);
        }
        return null;
    }
};

export const lambdaVar: ExprDefinition<LambdaVarNode> = {
    fields: ['name'],
    subexpressions: [],
    projection: {
        type: 'dynamic',
        field: (state, exprId) => {
            const nodes = state.get('nodes');
            let current = nodes.get(exprId);
            const myName = current.get('name');
            while (current.get('parent')) {
                current = nodes.get(current.get('parent'));
                if (current.get('type') === 'lambda'
                        && nodes.get(current.get('arg')).get('name') === myName) {
                    return 'enabled';
                }
            }
            return 'default';
        },
        onKeyChange: (view, id, exprId, state, stage) => {
            if (view.dynamicKey === 'enabled') {
                fx.blink(stage, view, {
                    times: 3,
                    speed: 100,
                    color: '#6df902'
                });

                const nodes = state.get('nodes');
                let current = nodes.get(exprId);
                const myName = current.get('name');
                while (current.get('parent')) {
                    current = nodes.get(current.get('parent'));
                    if (current.get('type') === 'lambda'
                            && nodes.get(current.get('arg')).get('name') === myName) {
                        fx.blink(stage, stage.getView(current.get('arg')), {
                            times: 3,
                            speed: 100,
                            color: '#6df902',
                            field: 'outerStroke'
                        });

                        break;
                    }
                }
            }
        },
        default: {
            type: 'hbox',
            shape: '()',
            strokeWhenChild: false,
            cols: [
                {
                    type: 'text',
                    text: '{name}',
                    color: 'gray'
                }
            ]
        },
        cases: {
            enabled: {
                type: 'preview',
                content: {
                    type: 'default',
                    shape: '()',
                    strokeWhenChild: false,
                    fields: ['name']
                }
            }
        }
    }
};