import type {
    genericClone, genericSearch, genericEqual, genericFlatten, genericMap
} from '@/semantics/core';
import { Im } from '@/util/im';

export type RId = number;

/**
 * RNode is a Reduct node, any item that exists
 * on the board, in the toolbox, in the goal box,
 * or in the defs box.
 */
export interface RNode {
  /** The ID of this node. */
  id: RId;

  /** The ID of this node's parent. */
  parent: RId;

  /** The field in the parent node which this node
   * occupies.
   */
  parentField: string;
}

export interface Semantics {
  clone: ReturnType<typeof genericClone>;
  map: ReturnType<typeof genericMap>;
  search: ReturnType<typeof genericSearch>;
  flatten: ReturnType<typeof genericFlatten>;
  equal: ReturnType<typeof genericEqual>;
  subexpressions: (node: RNode | Im<RNode>) => string[];
}
