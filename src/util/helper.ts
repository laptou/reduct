import type { Flat, BaseNode, ReductNode } from '@/semantics';
import { produce } from 'immer';

/**
 * Type representing all objects, but is not `any` so that we can use Exclude<T,
 * P> on it.
 */
type Primitive =
  null |
  undefined |
  boolean |
  string |
  number |
  symbol |
  bigint;

/**
 * A Thunk is either an instance of an object, or a function that can be called
 * to obtain the actual object. Type parameter T should not be a function.
 */
export type Thunk<A extends Array<unknown>, T extends Primitive | object> =
    ((...args: A) => T) | T;

/**
 * Unwraps a @see Thunk.
 */
export function dethunk<A extends Array<unknown>, T extends Primitive | object>(t: Thunk<A, T>, ...args: A): T {
  return typeof t === 'function' ? t(...args) : t;
}

export type DeepReadonly<T> = 
  T extends Primitive | Function ? T : 
  T extends Array<infer U> ? ReadonlyArray<DeepReadonly<U>> :
  T extends Set<infer U> ? ReadonlySet<DeepReadonly<U>> :
  T extends Map<infer U, infer V> ? ReadonlyMap<U, DeepReadonly<V>> :
  { readonly [K in keyof T]: DeepReadonly<T[K]> };

/**
 * Returns a version of the node that has no reference to its parent (parent and parentField are set to null).
 * @param node 
 */
export function orphaned<N extends DeepReadonly<ReductNode> | DeepReadonly<Flat<ReductNode>>>(node: N): N {
  return produce(node, draft => {
    draft.parent = null;
    draft.parentField = null;
  });
}
