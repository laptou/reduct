import type {
  BaseNode, Flat, FlatReductNode, NodeId, ReductNode,
} from '..';
import { genericBetaReduce } from '../core';

import type { VTupleNode } from './tuple';

import { DeepReadonly } from '@/util/helper';

export interface LambdaNode extends BaseNode {
  type: 'lambda';

  subexpressions: {
    /** Is a tuple containing all of the lambda's arguments. */
    arg: VTupleNode;
    body: ReductNode;
  };
}

export interface LambdaArgNode extends BaseNode {
  type: 'lambdaArg';

  fields: {
    name: string;
    functionHole: any;

    /** Only to be set when the lambda is being evaluated. Allows reference
     * nodes to obtain the ID of the parameter that the lambda is being called
     * with. */
    value: NodeId | null;
  };
}

export interface LambdaVarNode extends BaseNode {
  type: 'lambdaVar';

  fields: {
    name: string;
  };
}
