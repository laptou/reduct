import type { NodeDef } from './base';
import type { BaseNode, NodeId } from '..';

export interface LetNode extends BaseNode {
    type: 'letExpr';

    variable: string;
    e1: NodeId;
    e2: NodeId;
}

// let expressions: let variable = e1 in e2
// syntax for defining this node: variable = e1 in e2
export const letExpr: NodeDef<LetNode> = {
    kind: 'expression',
    fields: ['variable'],
    subexpressions: ['e1', 'e2'],

    projection: {
        type: 'vbox',
        horizontalAlign: 0.0,
        color: 'salmon',
        subexpScale: 1.0,
        ellipsize: true,
        rows: [
            {
                type: 'default',
                shape: 'none',
                fields: ['\'let\'', 'variable', '\'=\'', 'e1', '\'in\''],
                subexpScale: 1.0
            },
            {
                type: 'default',
                shape: 'none',
                fields: ['e2'],
                subexpScale: 1.0
            }
        ]
    },
    validateStep: (semant, state, expr) => {
        const callee = state.getIn(['nodes', expr.e2]);
        const kind = semant.kind(state, callee);
        if (kind === 'value'
                && callee.type !== 'lambda'
                && callee.type !== 'reference') {
            return [expr.callee, 'We can only apply functions!'];
        }
        return null;
    },
    smallStep: (semant, stage, state, expr) => {
        const [topNodeId, newNodeIds, addedNodes] = semant.interpreter.betaReduce(
            stage,
            state,
            expr.e2,
            [expr.e1]
        );

        return [expr.id, newNodeIds, addedNodes];
    }
};
