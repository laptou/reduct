import { Iterable as ImIterable, Map as ImMap } from 'immutable';

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

/**
 * A definition to make ImmutableJS maps play nicer
 * with TypeScript.
 */
export interface Im<T> extends ImMap<keyof T, T[keyof T]> {
  toJS(): T;

  get<K extends keyof T>(key: K): T[K];
  set<K extends keyof T>(key: K, value: T[K]): this;

  delete<K extends keyof T>(key: K): Im<Omit<T, K>>;
  remove<K extends keyof T>(key: K): Im<Omit<T, K>>;

  clear(): Im<{}>;

  update<K extends keyof T>(updater: (value: Map<K, T[K]>) => Map<K, T[K]>): Map<K, T[K]>;
  update<K extends keyof T>(key: K, updater: (value: T[K]) => T[K]): Map<K, T[K]>;
  update<K extends keyof T>(key: K, notSetValue: T[K], updater: (value: T[K]) => T[K]): Map<K, T[K]>;

  merge<K = keyof T, V = T[K]>(...iterables: ImIterable<K, V>[]): Map<keyof T | K, T[keyof T] | V>;
  merge<V>(...iterables: {[key: string]: V}[]): Map<keyof T | string, T[keyof T] | V>;
}
