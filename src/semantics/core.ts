import type { RState } from '@/reducer/state';
import { DeepReadonly, withoutParent } from '@/util/helper';
import { produce } from 'immer';
import type {
  NodeId, NodeMap, ReductNode, Flat 
} from '.';
import { Semantics } from './transform';

type GenericNodeCreator<F> =
    (
        getNextId: () => number,
        getSubExpressions: (node: DeepReadonly<Flat<ReductNode> | ReductNode>) => string[]
    ) => F;

type GenericNodeTransformer<F> =
    (
        getSubExpressions: (node: DeepReadonly<Flat<ReductNode> | ReductNode>) => string[]
    ) => F;

export const genericFlatten: GenericNodeCreator<(expr: ReductNode) => Array<Flat<ReductNode>>> =
    (getNextId, getSubExpressions) => function flatten(expr) {
      expr.id = getNextId();
      let result = [expr];

      for (const field of getSubExpressions(expr)) {
        // Record the ID of the parent, as well as which field of
        // the parent we are stored in.

        expr.subexpressions[field].parent = expr.id;
        expr.subexpressions[field].parentField = field;
        result = result.concat(flatten(expr.subexpressions[field]));
        expr.subexpressions[field] = expr.subexpressions[field].id;
      }

      return result;
    };

/** Apply the function f to node [nodeId] and all of its
* subexpressions.
*/
export const genericMap: GenericNodeTransformer<(
    nodes: DeepReadonly<NodeMap>,
    nodeId: NodeId,
    mapper: (nodeMap: DeepReadonly<NodeMap>, id: NodeId) => [ReductNode, NodeMap],
    filter?: (nodes: DeepReadonly<NodeMap>, node: DeepReadonly<Flat<ReductNode>>) => boolean,
    top?: boolean
) => [ReductNode, NodeMap]> =
    (getSubExpressions) => function map(nodeMap, nodeId, mapper, filter?, top = true) {
      let currentNode = nodeMap.get(nodeId)!;

      if (!filter?.(nodeMap, currentNode)) {
        return [currentNode, nodeMap];
      }

      currentNode = produce(currentNode, draft => {
        for (const field of getSubExpressions(currentNode)) {
          const [newNode, newNodeMap] = map(nodeMap, currentNode.subexpressions[field], mapper, filter, false);
        
          draft.subexpressions[field] = newNode.id;
          nodeMap = newNodeMap;
        }
      });

      nodeMap = produce(nodeMap, draft => { draft.set(currentNode.id, currentNode); });

      // Function returns [new node, new store]
      return mapper(nodeMap, currentNode.id);
    };

/** Given a [nodeId], returns the node
* with the corresponding ID or its subexpressions
* that return true when passed into the function f.
*/
export const genericSearch: GenericNodeTransformer<(
    nodes: DeepReadonly<NodeMap>,
    nodeId: NodeId,
    predicate: (nodes: DeepReadonly<NodeMap>, nodeId: NodeId) => boolean
) => NodeId[]> =
    (getSubExpressions) => (nodes, nodeId, predicate) => {
      const queue = [nodeId];
      const result = [];
      while (queue.length > 0) {
        const id = queue.pop()!;
        if (predicate(nodes, id)) {
          result.push(id);
        }

        const n = nodes.get(id)!;
        for (const field of getSubExpressions(n)) {
          queue.push(n.subexpressions[field]);
        }
      }
      return result;
    };

export const genericEqual = (
  getSubExpressions: (node: DeepReadonly<ReductNode>) => string[],
  comparer: (left: DeepReadonly<ReductNode>, right: DeepReadonly<ReductNode>) => boolean
) => function equal(id1: NodeId, id2: NodeId, state: DeepReadonly<RState>) {
  const n1 = state.nodes.get(id1)!;
  const n2 = state.nodes.get(id2)!;

  if (!comparer(n1, n2)) return false;
  for (const field of getSubExpressions(n1)) {
    if (!equal(n1.subexpressions[field], n2.subexpressions[field], state)) {
      return false;
    }
  }
  return true;
};

export const genericClone: GenericNodeCreator<(
    id: NodeId,
    nodeMap: DeepReadonly<NodeMap>,
    locked?: boolean
) => [ReductNode, ReductNode[], NodeMap]> =
    (nextId, getSubExpressions) => function clone(id, nodeMap, locked = true) {
      const root = nodeMap.get(id)!;
      const clonedNodes: Array<DeepReadonly<ReductNode>> = [];

      const clonedRoot = produce(root, (draft) => {
        const newId = nextId();
        draft.id = newId;

        for (const field of getSubExpressions(root)) {
          let [childClone, descendantClones, descendantNodeMap] = clone(root.subexpressions[field], nodeMap, locked);
          nodeMap = descendantNodeMap;
  
          childClone = produce(childClone, childCloneDraft => {
            childCloneDraft.parent = newId;
            childCloneDraft.parentField = field;
            childCloneDraft.locked = locked;
          });
  
          clonedNodes.push(...descendantClones, childClone);
  
          draft.subexpressions[field] = childClone.id;
          // TODO: delete any cached __missing fields
        }
      });
    
      nodeMap = produce(nodeMap, draft => draft.set(clonedRoot.id, clonedRoot as ReductNode));

      return [clonedRoot, clonedNodes, nodeMap];
    };

/**
 * A generic function to apply a list of arguments to an expression.
 * returns [topNode, resultNodeIds, newNodes] where
 * [topNode] = original lambda node
 * [resultNodeIds] = IDs of the resulting node
 * [newNodes] = All the new added nodes (includs the children of the parent node
    as well.)
 */
export function genericBetaReduce(semant: Semantics, state: DeepReadonly<RState>, config) {
  const { topNode, targetNode, argIds } = config;
  const nodes = state.nodes;
  // Prevent application when there are missing nodes
  const missingNodes = semant.search(
    nodes,
    topNode.id,
    (nodes, id) => {
      const node = nodes.get(id)!;
      if (node.type === 'missing') {
        return true;
      }
      if (node.type === 'lambdaVar') {
        // Look for binder
        let current: DeepReadonly<ReductNode> = node;

        while (current.parent) {
          current = nodes.get(current.parent)!;
          if (current.type === 'lambda'
                        && nodes.get(current.subexpressions.arg)!.name === node.name) {
            return false;
          }
        }
        return true;
      }
    }
  ).filter((id) => {
    const node = nodes.get(id)!;
    if (node.type === 'lambdaVar') return true;
    if (!node.parent) return true;
    const parent = nodes.get(node.parent);
    const substepFilter = semant.interpreter.substepFilter(parent?.type);
    return substepFilter(semant, state, parent, node.parentField);
  });
  if (missingNodes.length > 0) {
    console.warn('Can\'t reduce missing');
    if (config.animateInvalidArg) {
      missingNodes.forEach(config.animateInvalidArg);
    }
    return null;
  }

  if (argIds.length !== 1) {
    let curState = state;
    let curTopNode = topNode;
    let curTargetNode = targetNode;

    let curResult = [];
    const allAddedNodes = [];

    for (const argId of argIds) {
      // Ignore "missing" args. This allows us to evaluate
      // something like `apply(repeat(2, _), addOne)`, where the
      // stepper will try to apply 2 and _ to repeat first. This
      // would be obviated if the stepFilter of a reference were
      // sophisticated enough to recognize when it is partially
      // applied.
      if (nodes.get(argId)!.type === 'missing') continue;

      const result = genericBetaReduce(semant, curState, {
        ...config,
        topNode: curTopNode,
        targetNode: curTargetNode,
        argIds: [argId]
      });
      if (!result) {
        // Return partial result
        break;
      }

      const [_, resultNodeIds, newNodes] = result;
      if (resultNodeIds.length !== 1) {
        console.warn('Can\'t handle multi-argument beta reduce with spilling');
        return null;
      }

      curResult = resultNodeIds;

      curState = produce(curState, draft => {
        for (const node of newNodes) {
          allAddedNodes.push(node);
          draft.nodes.set(node.id, node);
        }
      });

      // TODO: check if result is actually a lambda
      curTopNode = curState.nodes.get(resultNodeIds[0]);
      curTargetNode = curState.nodes.get(curTopNode.subexpressions.arg);
    }

    return [topNode, curResult, allAddedNodes];
  }

  // Check that arguments are complete
  for (const argId of argIds) {
    if (nodes.get(argId).type === 'lambdaVar') {
      if (config.animateInvalidArg) {
        config.animateInvalidArg(argId);
      }
      return null;
    }
    const missingArgNodes = semant.search(
      nodes,
      argId,
      (nodes, id) => nodes.get(id).type === 'missing'
    ).filter((id) => {
      const node = nodes.get(id);
      if (!node.parent) return true;
      const parent = nodes.get(node.parent);
      const substepFilter = semant.interpreter.substepFilter(parent.type);
      return substepFilter(semant, state, parent, node.parentField);
    });
    if (missingArgNodes.length > 0) {
      if (config.animateInvalidArg) {
        missingArgNodes.forEach(config.animateInvalidArg);
      }
      console.warn('Can\'t apply argument with missing nodes');
      return null;
    }

    // TODO: iron out kinks in type inference so we can use this
    // system instead
    // if (!state.getIn([ "nodes", argId, "complete" ])) {
    //     return null;
    // }
  }

  const name = config.targetName(targetNode);
  const [bodyClone, newNodes, curNodes] = semant.clone(topNode.subexpressions.body, nodes);

  let [newTop] = semant.map(curNodes, bodyClone.id, (nodes, id) => {
    const node = nodes.get(id);
    if (config.isVar(node) && config.varName(node) === name) {
      const [cloned, resultNewNodes, nodesStore] = semant.clone(argIds[0], nodes);
      const result = produce(cloned, draft => {
        draft.parent = node?.parent;
        draft.parentField = node?.parentField;
        draft.locked = true;
      });

      newNodes.push(...resultNewNodes);
      return [result, produce(nodesStore, draft => draft.set(result.id, result))];
    }

    const [result, resultNewNodes, nodesStore] = semant.clone(id, nodes);
    newNodes.push(...resultNewNodes);
    return [result, produce(nodesStore, draft => draft.set(result.id, result))];
  }, (nodes, node) => {
    if (config.isCapturing(node)) {
      return config.captureName(nodes, node) !== name;
    }
    return true;
  });

  newTop = withoutParent(newTop);

  if (newTop.type === 'vtuple') {
    // Spill vtuple onto the board
    // TODO: should we delete parent/parentField?
    return [
      topNode.id,
      semant.subexpressions(newTop).map((field) => newTop.subexpressions[field]),
      newNodes.slice(1).map((node) => (node.parent === newTop.id
        ? withoutParent(node) : node))
    ];
  }

  return [
    topNode.id,
    [newTop.id],
    newNodes.concat([newTop])
  ];
}

export function getField(object, field, ...args) {
  const v = object[field];
  return typeof v === 'function'
    ? v.call(object, ...args)
    : v;
}

// Turn a hydrated AST node resultExpr into a computation result for evaluating
// the immutable AST node sourceExpr.
export function makeResult(sourceExpr, resultExpr, semant) {
  resultExpr.locked = false;
  delete resultExpr.parent;
  delete resultExpr.parentField;
  // console.log(`Making result for ${resultExpr.type}`);
  // console.log(JSON.stringify(semant.flatten(resultExpr).map(immutable.Map)));
  const newNodes = semant.flatten(resultExpr);
  // console.log(`New nodes are ${newNodes}`);
  return [
    sourceExpr.id,
    [newNodes[0].id],
    newNodes
  ];
}
