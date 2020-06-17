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

export function* map<T, U>(iterable: Iterable<T>, mapper: (item: T) => U): Iterable<U> {
  for (const item of iterable) {
    yield mapper(item);
  }
}
