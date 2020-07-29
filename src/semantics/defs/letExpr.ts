import type { BaseNode, ReductNode } from '..';

export interface LetNode extends BaseNode {
  type: 'letExpr';

  fields: {
    variable: string;
  };

  subexpressions: {
    e1: ReductNode;
    e2: ReductNode;
  };
}
