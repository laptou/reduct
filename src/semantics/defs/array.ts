import { DeepReadonly, DRF } from '@/util/helper';
import type { BaseNode, ReductNode } from '..';
import type { Semantics } from '../transform';
import { getKindForNode } from '../util';
import type { NodeDef } from './base';

// Returns the names of the subexpressions of an array: elem0, elem1, etc.
// Requires: arr is a hydrated array node or an immutable map for an array node
function arraySubexprs(arr: DeepReadonly<ArrayNode> | DRF<ArrayNode>) {
  const result = [];
  for (let i = 0; i < arr.fields.length; i++) {
    result.push(`elem${i}`);
  }
  return result;
}

// Returns the fields that are supposed to be displayed by
// the projection of an array
function arrayDisplayParts(expr: DeepReadonly<ArrayNode> | DRF<ArrayNode>) {
  const a = arraySubexprs(expr);
  const result = [];
  let first = true;
  result.push('\'[\'');
  for (const e of a) {
    if (!first) result.push('\',\'');
    first = false;
    result.push(e);
  }
  result.push('\']\'');
  return result;
}

export interface ArrayNode extends BaseNode {
  type: 'array';

  subexpressions: Record<string, ReductNode>;

  fields: {
    length: number;
  };
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
  subexpressions: arraySubexprs as ((s: Semantics, e: DRF<ArrayNode>) => any),
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
