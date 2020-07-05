import type { BaseNode } from '..';

/**
 * A "virtual tuple". Represents a set of values that go together, but spill
 * onto the board when they are the top-level node.
 */
export interface VTupleNode extends BaseNode {
  type: 'vtuple';
  locked: true;

  fields: { size: number };
  subexpressions: Record<number, ReductNode>;
}

/**
 * A "parameter tuple". Represents a list of arguments or parameters for a
 * function.
 */
export interface PTupleNode extends BaseNode {
  type: 'ptuple';
  locked: true;

  fields: { size: number };
  subexpressions: Record<number, ReductNode>;
}
