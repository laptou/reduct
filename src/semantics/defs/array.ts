import { DeepReadonly, DRF } from '@/util/helper';
import type { BaseNode, ReductNode } from '..';
import { getKindForNode } from '../util';
import type { NodeDef } from './base';

// Returns the fields that are supposed to be displayed by
// the projection of an array
function arrayDisplayParts(expr: DeepReadonly<ArrayNode> | DRF<ArrayNode>) {
  const result = [];
  let first = true;
  result.push('\'[\'');
  for (let i = 0; i < expr.fields.length; i++) {
    if (!first) result.push('\',\'');
    first = false;
    result.push(expr.subexpressions[i]);
  }
  result.push('\']\'');
  return result;
}

export interface ArrayNode extends BaseNode {
  type: 'array';

  fields: { length: number };
  subexpressions: Record<number, ReductNode>;
};

export const array: NodeDef<ArrayNode> = {
  kind: (arr, nodes) => {
    for (const subExprId of Object.values(arr.subexpressions)) {
      const subExpr = nodes.get(subExprId)!;
      if (getKindForNode(subExpr, nodes) === 'expression' || subExpr.type === 'missing') {
        return 'expression';
      }
    }
    return 'value';
  },
  type: 'array',
  fields: ['length'],
  subexpressions: (node) => {
    const indices = [];
    for (let i = 0; i < node.fields.length; i++)
      indices.push(i);
    return indices;
  },
  projection: {
    type: 'default',
    fields: arrayDisplayParts,
    subexpScale: 0.9,
    padding: {
      top: 3.5,
      bottom: 3.5,
      left: 1,
      right: 1,
      inner: 4
    },
    color: '#bec'
  },
  complete: true
};
