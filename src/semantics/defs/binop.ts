import type { BaseNode, ReductNode } from '..';

/**
 * OpNode is a Reduct node that represents a mathematical operation
 */
export interface OpNode extends BaseNode {
  type: 'op';
  locked: true;
  fields: { name: '+' | '-' | '<' | '>' | '==' | '&&' | '||' };
}

/**
 * BinOpNode is a Reduct node that represents a binary operation
 */
export interface BinOpNode extends BaseNode {
  type: 'binop';

  subexpressions: {
    left: ReductNode;
    op: OpNode;
    right: ReductNode;
  };
}
