import type { BaseNode } from '..';

import { LambdaNode } from './lambda';

export interface DefineNode extends BaseNode {
  type: 'define';

  fields: {
    name: string;
    params: string[];
  };

  subexpressions: {
    body: LambdaNode;
  };
}
