import type { NodeDef } from './base';
import type { BaseNode, NodeId } from '..';

export interface NotNode extends BaseNode {
    type: 'not';

    value: NodeId;
}

export const not: NodeDef<NotNode> = {
    kind: 'expression',
    fields: [],
    subexpressions: ['value'],
    projection: {
        type: 'default',
        shape: '<>',
        color: 'red',
        fields: ['\'!\'', 'value'],
        subexpScale: 0.9,
        padding: {
            left: 25,
            right: 25,
            inner: 10,
            top: 0,
            bottom: 0
        }
    },
    validateStep: (semant, state, expr) => {
        const nodes = state.nodes;
        const valueId = expr.value;
        const valueExpr = nodes.get(valueId);

        if (valueExpr.type !== 'bool') {
            return [valueId, '! can only NOT booleans'];
        }

        return null;
    },
    smallStep: (semant, stage, state, expr) => {
        const nodes = state.nodes;
        return semant.bool(!nodes.get(expr.value).value);
    }
};
