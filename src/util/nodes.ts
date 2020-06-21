import type {
  Flat, NodeId, NodeMap, ReductNode 
} from '@/semantics';
import { castDraft, produce } from 'immer';
import type { DeepReadonly } from './helper';

let idCounter = 0;

/**
 * Returns the next unique ID. Used to assign IDs to nodes and views.
 */
export function nextId(): NodeId {
  return idCounter++;
}

type CloneResult = [
  /** cloned root node */
  DeepReadonly<Flat<ReductNode>>, 
  /** cloned descendant nodes */
  Array<DeepReadonly<Flat<ReductNode>>>, 
  /** modified node map containing both cloned nodes and originals */
  NodeMap
];

/**
 * Clones the node given by `id` and all of its descendants. Returns 
 *
 * @param id The ID of the node to clone.
 * @param nodeMap A map from IDs to nodes.
 * @param locked Whether the cloned nodes should be locked.
 * @returns A tuple: [cloned root node, cloned descendant nodes,
 * modified node map containing cloned nodes and originals].
 */
export function cloneNodeDeep(id: NodeId, nodeMap: NodeMap, locked = false): CloneResult {
  const root = nodeMap.get(id)!;
  const clonedNodes: Array<DeepReadonly<Flat<ReductNode>>> = [];

  const clonedRoot = produce(root, (draft) => {
    const newId = nextId();
    draft.id = newId;

    for (const [childPath, childId] of Object.entries(draft.subexpressions)) {
      let [childClone, descendantClones, descendantNodeMap] = cloneNodeDeep(childId, nodeMap, locked);
      nodeMap = descendantNodeMap;

      childClone = produce(childClone, childCloneDraft => {
        childCloneDraft.parent = newId;
        childCloneDraft.parentField = childPath;
        childCloneDraft.locked = locked;
      });

      clonedNodes.push(childClone, ...descendantClones);

      (draft.subexpressions as Record<string, number>)[childPath] = childClone.id;
      // TODO: delete any cached __missing fields
    }
  });

  nodeMap = produce(nodeMap, draft => draft.set(clonedRoot.id, castDraft(clonedRoot)));

  return [clonedRoot, clonedNodes, nodeMap];
}

type MapResult = [
  /** mapped root node */
  DeepReadonly<Flat<ReductNode>>,
  /** mapped descendant nodes */
  Array<DeepReadonly<Flat<ReductNode>>>,
  /** modified node map containing mapped nodes, but not originals */
  NodeMap
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
  nodeMap: NodeMap, 
  mapper: (
    node: DeepReadonly<Flat<ReductNode>>, 
    nodeMap: NodeMap
  ) => [DeepReadonly<Flat<ReductNode>>, NodeMap],
  filter: (
    node: DeepReadonly<Flat<ReductNode>>, 
    nodeMap: NodeMap
  ) => boolean = () => true
): MapResult {
  const root = nodeMap.get(id)!;
  const mappedNodes: Array<DeepReadonly<Flat<ReductNode>>> = [];

  if (!filter(root, nodeMap)) {
    return [root, [], nodeMap];
  }

  const rootWithMappedDescendants = produce(root, (draft) => {
    for (const [childPath, childId] of Object.entries(draft.subexpressions)) {
      const [mappedChild, mappedGrandChildren, newNodeMap] = mapNodeDeep(childId, nodeMap, mapper);
      nodeMap = newNodeMap;
      mappedNodes.push(mappedChild, ...mappedGrandChildren);
      (draft.subexpressions as Record<string, number>)[childPath] = mappedChild.id;
    }
  });

  const [mappedRoot, mappedNodeMap] = mapper(rootWithMappedDescendants, nodeMap);

  const finalNodeMap = produce(mappedNodeMap, draft => draft.set(mappedRoot.id, castDraft(mappedRoot)));

  return [mappedRoot, mappedNodes, finalNodeMap];
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
  nodeMap: NodeMap,
  predicate: (
    node: DeepReadonly<Flat<ReductNode>>,
    nodeMap: NodeMap
  ) => boolean,
  filter: (
    node: DeepReadonly<Flat<ReductNode>>, 
    nodeMap: NodeMap
  ) => boolean = () => true
): Array<DeepReadonly<Flat<ReductNode>>> {
  const root = nodeMap.get(id)!;

  if (!filter(root, nodeMap)) {
    return [];
  }

  const foundNodes: Array<DeepReadonly<Flat<ReductNode>>> = [];

  for (const childId of Object.values(root.subexpressions)) {
    foundNodes.push(...findNodesDeep(childId, nodeMap, predicate));
  }

  if (predicate(root, nodeMap)) {
    foundNodes.push(root);
  }

  return foundNodes;
}
