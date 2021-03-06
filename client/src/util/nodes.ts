import { castDraft, produce } from 'immer';

import { DeepReadonly, DRF } from './helper';

import type {
  BaseNode, Flat, FlatReductNode, NodeId, NodeMap, ReductNode,
} from '@/semantics';

let idCounter = 1;

/**
 * Restores an ID counter that was saved to storage. This is necessary to avoid
 * collisions when the state is restored.
 */
export function restoreId(counter: NodeId) {
  idCounter = Math.max(idCounter, counter);
}

/**
 * Returns the next unique ID. Used to assign IDs to nodes.
 */
export function nextId(): NodeId {
  return idCounter++;
}

export type CloneResult<N extends ReductNode = ReductNode> = [
  /** cloned root node */
  DRF<N>,
  /** cloned descendant nodes */
  Array<DeepReadonly<Flat<ReductNode>>>,
];

/**
 * Clones the node given by `id` and all of its descendants. They are added to a
 * new node map, which is returned.
 *
 * @param id The ID of the node to clone.
 * @param nodeMap A map from IDs to nodes.
 * @param locked Whether the cloned nodes should be locked.
 * @returns A tuple: [cloned root node, cloned descendant nodes, modified node].
 */
export function cloneNodeDeep<N extends ReductNode = ReductNode>(
  id: NodeId,
  nodeMap: DeepReadonly<NodeMap>,
  locked?: boolean
): CloneResult<N> {
  const root = nodeMap.get(id) as DRF;
  const clonedDescendants: DRF[] = [];
  const clonedChildren: DRF[] = [];
  const newId = nextId();

  const clonedRoot: DRF = produce(root, (draft) => {
    draft.id = newId;

    // delete cached holes
    if (draft.__meta?.slots) {
      delete draft.__meta.slots;
    }

    for (const [childPath, childId] of Object.entries(draft.subexpressions)) {
      const [clonedChild, clonedGrandChildren] = cloneNodeDeep(childId, nodeMap, locked);

      const reparentedChild = {
        ...clonedChild,
        parent: newId,
      } as FlatReductNode;

      if (typeof locked === 'boolean')
        reparentedChild.locked = locked;

      clonedDescendants.push(...clonedGrandChildren);
      clonedChildren.push(reparentedChild);

      (draft.subexpressions as Record<string, number>)[childPath] = reparentedChild.id;
      // TODO: delete any cached __missing fields
    }
  });

  return [clonedRoot as DRF<N>, clonedChildren.concat(clonedDescendants)];
}

export type CloneAndAddResult<N extends ReductNode = ReductNode> = [
  /** cloned root node */
  DRF<N>,
  /** cloned descendant nodes */
  Array<DeepReadonly<Flat<ReductNode>>>,
  /** modified node map containing both cloned nodes and originals */
  DeepReadonly<NodeMap>
];

/**
 * Clones the node given by `id` and all of its descendants. They are added to a
 * new node map, which is returned.
 *
 * @param id The ID of the node to clone.
 * @param nodeMap A map from IDs to nodes.
 * @param locked Whether the cloned nodes should be locked.
 * @returns A tuple: [cloned root node, cloned descendant nodes, modified node
 * map containing cloned nodes and originals].
 */
export function cloneNodeAndAddDeep<N extends ReductNode = ReductNode>(id: NodeId, nodeMap: DeepReadonly<NodeMap>, locked?: boolean): CloneAndAddResult<N> {
  const [clonedRoot, clonedDescendants] = cloneNodeDeep(id, nodeMap, locked);

  const newNodeMap: NodeMap = new Map([
    ...nodeMap,
    ...clonedDescendants.map(
      clonedDescendant => [clonedDescendant.id, clonedDescendant] as const
    ),
    [clonedRoot.id, clonedRoot],
  ]);

  return [clonedRoot as DRF<N>, clonedDescendants, newNodeMap];
}

type MapResult = [
  /** mapped root node */
  DRF,
  /** mapped descendant nodes */
  DRF[],
  /** modified node map containing mapped nodes, but not originals */
  DeepReadonly<NodeMap>
];

/**
 * Applies a mapping function to a node and all of its descendants. This
 * function is applied depth-first, meaning that the descendant nodes are
 * transformed first.
 *
 * @param id The ID of the root node to map.
 * @param nodeMap A map from IDs to nodes.
 * @param mapper The mapping function to apply to nodes.
 * @param filter If this function evaluates to false for a node, then it and its
 * children children will not be mapped.
 * @returns A tuple: [mapped root node, mapped descendant nodes, modified node
 * map containing mapped nodes, but not the nodes they were mapped from]
 */
export function mapNodeDeep(
  id: NodeId,
  nodeMap: DeepReadonly<NodeMap>,
  mapper: (
    node: DRF,
    nodeMap: DeepReadonly<NodeMap>
  ) => [DRF, DeepReadonly<NodeMap>],
  filter: (
    node: DRF,
    nodeMap: DeepReadonly<NodeMap>
  ) => boolean = () => true
): MapResult {
  const root = nodeMap.get(id)!;
  const mappedGrandChildren: DRF[] = [];
  const mappedChildren: Map<string, DRF> = new Map();

  if (!filter(root, nodeMap)) {
    return [root, [], nodeMap];
  }

  const rootWithMappedDescendants = produce(root, (draft) => {
    for (const [childPath, childId] of Object.entries(draft.subexpressions)) {
      const [mappedChild, mappedGrandChildren, newNodeMap] = mapNodeDeep(childId, nodeMap, mapper);
      nodeMap = newNodeMap;

      mappedGrandChildren.push(...mappedGrandChildren);
      mappedChildren.set(childPath, mappedChild);

      (draft.subexpressions as Record<string, number>)[childPath] = mappedChild.id;
    }
  });

  const [mappedRoot, mappedNodeMap] = mapper(rootWithMappedDescendants, nodeMap);

  const reparentedChildren = Array.from(mappedChildren).map(([childPath, mappedChild]) => ({
    ...mappedChild,
    parent: mappedRoot.id,
    parentField: childPath,
  } as DRF));

  const finalNodeMap = produce(mappedNodeMap, draft => {
    draft.set(mappedRoot.id, castDraft(mappedRoot));

    for (const reparentedChild of reparentedChildren) {
      draft.set(reparentedChild.id, castDraft(reparentedChild));
    }
  });

  return [mappedRoot, reparentedChildren.concat(mappedGrandChildren), finalNodeMap];
}

/**
 * Finds nodes that satisfy a predicate among a node and its descendants. This
 * function is applied depth-first, meaning that the deepest descendant node
 * will be tested first.
 *
 * @param id The ID of the node whose descendants should be searched.
 * @param nodeMap A map from IDs to nodes.
 * @param predicate The predicate function to apply to nodes. If this function
 * evaluates to `true`, then `node` will be present in the return value of
 * `findNodesDeep`.
 * @param filter If this function evaluates to false for a node, then it and its
 * children will be ignored.
 * @returns A list of descendant nodes for which `fn` evaluated to `true`.
 */
export function findNodesDeep(
  id: NodeId,
  nodeMap: DeepReadonly<NodeMap>,
  predicate: (
    node: DRF,
    nodeMap: DeepReadonly<NodeMap>
  ) => boolean,
  filter: (
    node: DRF,
    nodeMap: DeepReadonly<NodeMap>
  ) => boolean = () => true
): DRF[] {
  const root = nodeMap.get(id)!;

  if (!filter(root, nodeMap)) {
    return [];
  }

  const foundNodes: DRF[] = [];

  for (const childId of Object.values(root.subexpressions)) {
    foundNodes.push(...findNodesDeep(childId, nodeMap, predicate));
  }

  if (predicate(root, nodeMap)) {
    foundNodes.push(root);
  }

  return foundNodes;
}

/**
 * Comapares two nodes and all of their descendants for equality.
 *
 * @param left The ID of the first node to compare.
 * @param right The ID of the second node to compare.
 * @param nodes A map from IDs to nodes.
 * @returns true if these nodes are structurally equivalent
 */
export function compareNodesDeep(
  left: NodeId,
  right: NodeId,
  nodes: DeepReadonly<NodeMap>
): boolean {
  const n1 = nodes.get(left) as DeepReadonly<Flat<BaseNode>>;
  const n2 = nodes.get(right) as DeepReadonly<Flat<BaseNode>>;

  if (n1.type !== n2.type) return false;

  for (const [field, value] of Object.entries(n1.fields)) {
    if (n2.fields[field] !== value) return false;
  }

  for (const [path, child] of Object.entries(n1.subexpressions)) {
    if (!compareNodesDeep(child as any, (n2.subexpressions as any)[path], nodes)) {
      return false;
    }
  }
  return true;
}

/**
 * Flattens a node. This replaces all of its references to its children with
 * their IDs.
 *
 * @param node The node to flatten.
 * @returns An iterator that iterates over flattened versions of this node and
 * all of its descendants.
 */
export function flatten(
  node: ReductNode
): Array<Flat<ReductNode>> {
  const nodes = [];
  const children: Record<string | number, NodeId> = {};

  for (const [path, child] of Object.entries(node.subexpressions)) {
    const [flatChild, ...flatGrandChildren] = flatten(child);
    flatChild.parent = node.id;
    flatChild.parentField = path;
    children[path] = flatChild.id;
    nodes.push(flatChild, ...flatGrandChildren);
  }

  const flatNode = {
    ...node,
    subexpressions: children,
  };

  return [flatNode, ...nodes];
}

/**
 * Unflattens a node. This replaces all of the IDs of its children with
 * references to the child node objects.
 *
 * @param id The ID of the node to unflatten.
 * @param map A map from IDs to nodes.
 * @returns An unflattened version of this node.
 */
export function unflatten(
  id: NodeId,
  map: DeepReadonly<NodeMap>,
  maxDepth = 3
): BaseNode {
  const flatNode = map.get(id)!;

  if (maxDepth === 0) return flatNode;

  const subexpressions: Record<string | number, BaseNode> = {};

  for (const [path, childId] of Object.entries(flatNode.subexpressions)) {
    subexpressions[path] = unflatten(childId, map, maxDepth - 1);
  }

  return {
    ...flatNode,
    subexpressions,
  };
}

/**
 * Traverses up the node graph until this node's parent is found.
 *
 * @param id The node whose root should be found.
 * @param nodes A map from IDs to nodes.
 */
export function getRootForNode(id: NodeId, nodes: DeepReadonly<NodeMap>): DRF {
  let current = nodes.get(id)!;

  while (current.parent) {
    current = nodes.get(current.parent)!;
  }

  return current;
}

/**
 * Returns true if `ancestor` is an ancestor of `node.`
 * @param node The node to check.
 * @param ancestor The ancestor to check for.
 * @param nodes A map from IDs to nodes.
 */
export function isAncestorOf(node: NodeId, ancestor: NodeId, nodes: DeepReadonly<NodeMap>): boolean {
  let current = nodes.get(node);
  current = current?.parent ? nodes.get(current.parent) : undefined;

  while (current) {
    if (current.id === ancestor) return true;
    current = current.parent ? nodes.get(current.parent) : undefined;
  }

  return false;
}
