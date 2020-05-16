
import { ExprDefinition, RId, RNode } from '.';

export interface LetNode extends RNode {
    variable: string;
    e1: RId;
    e2: RId;
}

// let expressions: let variable = e1 in e2
// syntax for defining this node: variable = e1 in e2
export const letExpr: ExprDefinition<LetNode> = {
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
        const callee = state.getIn(['nodes', expr.get('e2')]);
        const kind = semant.kind(state, callee);
        if (kind === 'value'
                && callee.get('type') !== 'lambda'
                && callee.get('type') !== 'reference') {
            return [expr.get('callee'), 'We can only apply functions!'];
        }
        return null;
    },
    smallStep: (semant, stage, state, expr) => {
        const [topNodeId, newNodeIds, addedNodes] = semant.interpreter.betaReduce(
            stage,
            state,
            expr.get('e2'),
            [expr.get('e1')]
        );

        return [expr.get('id'), newNodeIds, addedNodes];
    }
};
