import type { BaseNode, ReductNode } from '..';

export interface NotNode extends BaseNode {
  type: 'not';

  subexpressions: {
    value: ReductNode;
  };
}
