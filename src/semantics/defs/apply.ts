import type { ReductNode, BaseNode } from '..';

/**
 * ApplyNode is a Reduct node that represents function application
 * the node 'argument' is passed to the node 'callee'
 */
export interface ApplyNode extends BaseNode {
  type: 'apply';

  subexpressions: {
    callee: ReductNode;
    argument: ReductNode;
  };
}

// TODO: reductionOrder: ['argument', 'callee']
