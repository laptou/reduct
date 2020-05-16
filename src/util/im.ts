import { Map as ImMap, Collection as ImCollection } from 'immutable';

export { List as ImList, Collection as ImCollection, Map as ImMap } from 'immutable';


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

  merge<K extends keyof T = keyof T, V = T[K]>(...iterables: ImCollection<K, V>[]): Map<keyof T | K, T[keyof T] | V>;
  merge<V>(...iterables: {[key: string]: V}[]): Map<keyof T | string, T[keyof T] | V>;

  map(
    mapper: (value?: T[keyof T], key?: keyof T, iter?: this) => T[keyof T],
    context?: any
  ): this;
  map<M>(
    mapper: (value?: T[keyof T], key?: keyof T, iter?: this) => M,
    context?: any
  ): ImMap<keyof T, T[keyof T] | M>;
}
