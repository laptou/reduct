import type { BaseNode, ReductNode } from '..';

import type { ReferenceNode } from './reference';

export interface LetNode extends BaseNode {
  type: 'letExpr';

  subexpressions: {
    variable: ReferenceNode;
    value: ReductNode;
    body: ReductNode;
  };
}
