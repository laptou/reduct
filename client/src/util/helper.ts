import { produce } from 'immer';

import type {
  Flat, BaseNode, ReductNode, NodeId,
} from '@/semantics';

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

/**
 * Represents a version of type T which is completely immutable: neither it nor
 * any of its fields can be modified.
 */
export type DeepReadonly<T> =
  // We specifically want to use any kind of function, so using Function type
  // here is fine eslint-disable-next-line @typescript-eslint/ban-types
  T extends Primitive | Function ? T :
    T extends ReadonlySet<unknown> ? T :
      T extends ReadonlyMap<unknown, unknown> ? T :
        T extends ReadonlyArray<unknown> ? T :
          T extends Set<infer U> ? ReadonlySet<DeepReadonly<U>> :
            T extends Map<infer U, infer V> ? ReadonlyMap<U, DeepReadonly<V>> :
              T extends Array<infer U> ? ReadonlyArray<DeepReadonly<U>> :
                { readonly [K in keyof T]: DeepReadonly<T[K]> };

/**
 * Stands for deep readonly & flat.
 *
 * A Reduct node that is completely read-only (attempting to write to it or any
 * of its property values will give an error) and flat (the subexpressions
 * property contains node IDs instead of the nodes themselves).
 */
export type DRF<T extends BaseNode = ReductNode> = DeepReadonly<Flat<T>>;


/**
 * Returns a version of the node that has no reference to its parent (parent and parentField are set to null).
 * @param node
 */
export function withoutParent<N extends DeepReadonly<ReductNode> | DRF>(node: N): N {
  return {
    ...node,
    parent: null,
    parentField: null,
  };
}

export function withParent<N extends DeepReadonly<ReductNode> | DRF>(
  node: N,
  parent: NodeId,
  field: string
): N {
  return {
    ...node,
    parent,
    parentField: field,
  };
}

export function withChild<N extends DRF = DRF>(node: N, childId: NodeId, field: keyof N['subexpressions']): N {
  return produce(node, draft => {
    (draft.subexpressions as Record<typeof field, any>)[field] = childId;
  });
}

export function withoutChild<N extends DeepReadonly<ReductNode> | DRF>(node: N, field: keyof N['subexpressions']): N {
  return produce(node, draft => {
    (draft.subexpressions as Record<typeof field, any>)[field] = null;
  });
}

export function * mapIterable<T, U>(it: Iterable<T>, fn: (t: T) => U) {
  for (const item of it) {
    yield fn(item);
  }
}
