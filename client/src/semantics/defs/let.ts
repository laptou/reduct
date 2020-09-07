import type { BaseNode, ReductNode } from '..';

import type { IdentifierNode } from './identifier';

export interface LetNode extends BaseNode {
  type: 'let';

  subexpressions: {
    variable: IdentifierNode;
    value: ReductNode;
    body: ReductNode;
  };
}
