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
  /** modified node map containing cloned nodes */
  NodeMap
];

/**
 * Clones the node given by `id` and all of its descendants. Returns a tuple
 * containing [cloned root node, cloned descendant nodes, modified node map
 * containing cloned nodes].
 * @param id The ID of the node to clone.
 * @param nodeMap A map from IDs to nodes.
 * @param locked Whether the cloned nodes should be locked.
 */
export function cloneNode(id: NodeId, nodeMap: NodeMap, locked = false): CloneResult {
  const root = nodeMap.get(id)!;
  const clonedNodes: Array<DeepReadonly<Flat<ReductNode>>> = [];

  const clonedRoot = produce(root, (draft) => {
    const newId = nextId();
    draft.id = newId;

    for (const [childPath, childId] of Object.entries(draft.subexpressions)) {
      let [childClone, descendantClones, descendantNodeMap] = cloneNode(childId, nodeMap, locked);
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
