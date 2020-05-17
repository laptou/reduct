import * as immutable from 'immutable';
import { ImMap, Im, ImList } from '@/util/im';
import type { RState } from '@/reducer/state';
import type { ReductNode, NodeId, NodeMap } from '.';

type GenericNodeCreator<F> =
    (
        getNextId: () => number,
        getSubExpressions: (node: ReductNode | Im<ReductNode>) => string[]
    ) => F;

type GenericNodeTransformer<F> =
    (
        getSubExpressions: (node: Im<ReductNode>) => string[]
    ) => F;

export const genericFlatten: GenericNodeCreator<(expr: ReductNode) => ReductNode[]> =
    (getNextId, getSubExpressions) => function flatten(expr) {
        expr.id = getNextId();
        let result = [expr];

        for (const field of getSubExpressions(expr)) {
            // Record the ID of the parent, as well as which field of
            // the parent we are stored in.

            expr[field].parent = expr.id;
            expr[field].parentField = field;
            result = result.concat(flatten(expr[field]));
            expr[field] = expr[field].id;
        }

        return result;
    };

/** Apply the function f to node [nodeId] and all of its
* subexpressions.
*/
export const genericMap: GenericNodeTransformer<(
    nodes: NodeMap,
    nodeId: NodeId,
    mapper: (node: Im<ReductNode>, id: NodeId) => [ReductNode, NodeMap],
    filter?: (nodes: NodeMap, node: ReductNode) => boolean,
    top?: boolean
) => [ReductNode, NodeMap]> =
    (getSubExpressions) => function map(nodes, nodeId, f, filter?, top = true) {
        let currentStore = nodes;
        if (top) currentStore = currentStore.asMutable();
        const currentNode = nodes.get(nodeId);

        if (!filter?.(currentStore, currentNode)) {
            return [currentNode, currentStore];
        }

        const node = currentNode.withMutations((n) => {
            for (const field of getSubExpressions(n)) {
                const [newNode, newStore] = map(currentStore, n.get(field), f, filter, false);
                currentStore = newStore.set(newNode.get('id'), newNode);
                n.set(field, newNode.get('id'));
            }
        });
            // Function returns [new node, new store]
        const result = f(currentStore.set(node.get('id'), node), node.get('id'));
        if (top) return [result[0], result[1].asImmutable()];
        return result;
    };

/** Given a [nodeId], returns the node
* with the corresponding ID or its subexpressions
* that return true when passed into the function f.
*/
export const genericSearch: GenericNodeTransformer<(
    nodes: NodeMap,
    nodeId: NodeId,
    predicate: (nodes: NodeMap, nodeId: NodeId) => boolean
) => NodeId[]> =
    (getSubExpressions) => (nodes, nodeId, f) => {
        const queue = [nodeId];
        const result = [];
        while (queue.length > 0) {
            const id = queue.pop();
            if (f(nodes, id)) {
                result.push(id);
            }

            const n = nodes.get(id);
            for (const field of getSubExpressions(n)) {
                queue.push(n.get(field));
            }
        }
        return result;
    };

export const genericEqual = (
    getSubExpressions: (node: ReductNode | Im<ReductNode>) => string[],
    comparer: (left: ReductNode | Im<ReductNode>, right: ReductNode | Im<ReductNode>) => boolean
) => function equal(id1: NodeId, id2: NodeId, state: Im<RState>) {
    const n1 = state.getIn(['nodes', id1]);
    const n2 = state.getIn(['nodes', id2]);

    if (!comparer(n1, n2)) return false;
    for (const field of getSubExpressions(n1)) {
        if (!equal(n1.get(field), n2.get(field), state)) {
            return false;
        }
    }
    return true;
};

export const genericClone: GenericNodeCreator<(
    id: NodeId,
    nodeMap: ImMap<NodeId, Im<ReductNode>>,
    locked?: boolean
) => [Im<ReductNode>, ImList<Im<ReductNode>>, ImMap<NodeId, Im<ReductNode>>]> =
    (nextId, getSubExpressions) => function clone(id, nodeMap, locked = true) {
        const node = nodeMap.get(id);
        const newNodes: Im<ReductNode>[] = [];

        let currentStore = nodeMap;
        const result = node.withMutations((n) => {
            const newId = nextId();
            n.set('id', newId);

            for (const field of getSubExpressions(node)) {
                const [childClone, descendantClones, descendantNodeMap] = clone(node.get(field), currentStore, locked);
                currentStore = descendantNodeMap;

                const res = childClone.withMutations((sc) => {
                    sc.set('parent', newId);
                    sc.set('parentField', field);
                    sc.set('locked', locked);
                });

                newNodes.push(...descendantClones, res);

                n.set(field, childClone.get('id'));
                // TODO: delete any cached __missing fields
            }

            currentStore = currentStore.set(newId, n);
        });

        return [result, ImList(newNodes), currentStore];
    };

/**
 * A generic function to apply a list of arguments to an expression.
 * returns [topNode, resultNodeIds, newNodes] where
 * [topNode] = original lambda node
 * [resultNodeIds] = IDs of the resulting node
 * [newNodes] = All the new added nodes (includs the children of the parent node
    as well.)
 */
export function genericBetaReduce(semant, state, config) {
    const { topNode, targetNode, argIds } = config;
    const nodes = state.get('nodes');
    // Prevent application when there are missing nodes
    const missingNodes = semant.search(
        nodes,
        topNode.get('id'),
        (nodes, id) => {
            const node = nodes.get(id);
            if (node.get('type') === 'missing') {
                return true;
            }
            if (node.get('type') === 'lambdaVar') {
                // Look for binder
                let current = node;
                while (current.get('parent')) {
                    current = nodes.get(current.get('parent'));
                    if (current.get('type') === 'lambda'
                        && nodes.get(current.get('arg')).get('name') === node.get('name')) {
                        return false;
                    }
                }
                return true;
            }
        }
    ).filter((id) => {
        const node = nodes.get(id);
        if (node.get('type') === 'lambdaVar') return true;
        if (!node.get('parent')) return true;
        const parent = nodes.get(node.get('parent'));
        const substepFilter = semant.interpreter.substepFilter(parent.get('type'));
        return substepFilter(semant, state, parent, node.get('parentField'));
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
            if (nodes.get(argId).get('type') === 'missing') continue;

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

            curState = curState.withMutations((cs) => {
                cs.set('nodes', cs.get('nodes').withMutations((nds) => {
                    for (const node of newNodes) {
                        allAddedNodes.push(node);
                        nds.set(node.get('id'), node);
                    }
                }));
            });

            // TODO: check if result is actually a lambda
            curTopNode = curState.getIn(['nodes', resultNodeIds[0]]);
            curTargetNode = curState.getIn(['nodes', curTopNode.get('arg')]);
        }

        return [topNode, curResult, allAddedNodes];
    }

    // Check that arguments are complete
    for (const argId of argIds) {
        if (nodes.get(argId).get('type') === 'lambdaVar') {
            if (config.animateInvalidArg) {
                config.animateInvalidArg(argId);
            }
            return null;
        }
        const missingArgNodes = semant.search(
            nodes,
            argId,
            (nodes, id) => nodes.get(id).get('type') === 'missing'
        ).filter((id) => {
            const node = nodes.get(id);
            if (!node.get('parent')) return true;
            const parent = nodes.get(node.get('parent'));
            const substepFilter = semant.interpreter.substepFilter(parent.get('type'));
            return substepFilter(semant, state, parent, node.get('parentField'));
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
    let [bodyClone, newNodes, curNodes] = semant.clone(topNode.get('body'), nodes);
    newNodes.push(bodyClone);

    let [newTop] = semant.map(curNodes, bodyClone.get('id'), (nodes, id) => {
        const node = nodes.get(id);
        if (config.isVar(node) && config.varName(node) === name) {
            const [cloned, resultNewNodes, nodesStore] = semant.clone(argIds[0], nodes);
            const result = cloned.withMutations((n) => {
                n.set('parent', node.get('parent'));
                n.set('parentField', node.get('parentField'));
                n.set('locked', true);
            });
            newNodes.push(result);
            newNodes = newNodes.concat(resultNewNodes);
            return [result, nodesStore.set(result.get('id'), result)];
        }

        const [result, resultNewNodes, nodesStore] = semant.clone(id, nodes);
        newNodes.push(result);
        newNodes = newNodes.concat(resultNewNodes);
        return [result, nodesStore.set(result.get('id', result))];
    }, (nodes, node) => {
        if (config.isCapturing(node)) {
            return config.captureName(nodes, node) !== name;
        }
        return true;
    });
    newTop = newTop.delete('parent').delete('parentField');

    if (newTop.get('type') === 'vtuple') {
        // Spill vtuple onto the board
        // TODO: should we delete parent/parentField?
        return [
            topNode.get('id'),
            semant.subexpressions(newTop).map((field) => newTop.get(field)),
            newNodes.slice(1).map((node) => (node.get('parent') === newTop.get('id')
                ? node.delete('parent').delete('parentField')
                : node))
        ];
    }

    return [
        topNode.get('id'),
        [newTop.get('id')],
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
    const newNodes = semant.flatten(resultExpr).map(immutable.Map);
    // console.log(`New nodes are ${newNodes}`);
    return [
        sourceExpr.get('id'),
        [newNodes[0].get('id')],
        newNodes
    ];
}
