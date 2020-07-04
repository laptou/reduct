import type {
  Flat, FlatReductNode, NodeId, NodeMap, ReductNode 
} from '@/semantics';
import { castDraft, produce } from 'immer';
import { DeepReadonly, DRF } from './helper';

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
export function cloneNodeDeep(id: NodeId, nodeMap: NodeMap, locked?: boolean): CloneResult {
  const root = nodeMap.get(id)!;
  const clonedDescendants: DRF[] = [];
  const clonedChildren: DRF[] = [];
  const newId = nextId();

  const clonedRoot = produce(root, (draft) => {
    draft.id = newId;

    for (const [childPath, childId] of Object.entries(draft.subexpressions)) {
      const [clonedChild, clonedGrandChildren, descendantNodeMap] = cloneNodeDeep(childId, nodeMap, locked);
      nodeMap = descendantNodeMap;

      const reparentedChild = {
        ...clonedChild,
        parent: newId
      } as FlatReductNode;

      if (typeof locked === 'boolean')
        reparentedChild.locked = locked;

      clonedDescendants.push(...clonedGrandChildren);
      clonedChildren.push(reparentedChild);

      (draft.subexpressions as Record<string, number>)[childPath] = reparentedChild.id;
      // TODO: delete any cached __missing fields
    }
  });

  nodeMap = produce(nodeMap, draft => {
    draft.set(clonedRoot.id, castDraft(clonedRoot));

    // node map contains reference to old cloned children with wrong parent and
    // parentField information
    for (const clonedChild of clonedChildren) {
      draft.set(clonedChild.id, castDraft(clonedChild));
    }
  });

  return [clonedRoot, clonedChildren.concat(clonedDescendants), nodeMap];
}

type MapResult = [
  /** mapped root node */
  DRF,
  /** mapped descendant nodes */
  DRF[],
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
    node: DRF, 
    nodeMap: NodeMap
  ) => [DRF, NodeMap],
  filter: (
    node: DRF, 
    nodeMap: NodeMap
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
    parentField: childPath 
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

/**
 * Traverses up the node graph until this node's parent is found.
 * 
 * @param id The node whose root should be found.
 * @param nodes A map from IDs to nodes.
 */
export function getRootForNode(id: NodeId, nodes: NodeMap): DRF {
  let current = nodes.get(id)!;
  
  while (current.parent) {
    current = nodes.get(current.parent)!;
  }

  return current;
}
