import type { ScopedNode, ReductNode } from '..';

import type { NodeDef } from './base';


/**
 * ApplyNode is a Reduct node that represents function application
 * the node 'argument' is passed to the node 'callee'
 */
export interface ApplyNode extends ScopedNode {
  type: 'apply';

  subexpressions: {
    callee: ReductNode;
    argument: ReductNode;
  };
}

// TODO: reductionOrder: ['argument', 'callee']
