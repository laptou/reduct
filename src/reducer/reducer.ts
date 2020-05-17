// import Map as ImMap to avoid conflicting with built-in
// Map type, and the others for consistency
import { List as ImList, Map as ImMap } from 'immutable';
import { compose } from 'redux';
import { combineReducers } from 'redux-immutable';

import type { Im } from '@/util/im';
import type { NodeId, BaseNode } from '@/semantics';
import type { Semantics } from '@/semantics/transform';
import { ActionKind } from './action';
import * as gfx from '../gfx/core';
import * as animate from '../gfx/animate';
import { undoable } from './undo';
import { RState } from './state';

const initialProgram = ImMap({
    nodes: ImMap(),
    goal: ImList(),
    board: ImList(),
    toolbox: ImList(),
    globals: ImMap()
}) as unknown as Im<RState>;

let idCounter = 0;

/**
 * Returns the next unique ID. Used to assign IDs to nodes and views.
 */
export function nextId(): NodeId {
    return idCounter++;
}

// To speed up type checking, we only type check nodes that have
// changed.
let dirty = new Set();
function markDirty(nodes: ImMap<number, Im<BaseNode>>, id: NodeId) {
    let expr = nodes.get(id); // warning: assuming node w/ given ID exists
    let parentId = expr.get('parent');

    // travel to the root node
    while (typeof parentId === 'number') {
        expr = nodes.get(parentId);
        parentId = expr.get('parent');
    }

    // add root node to dirty set
    dirty.add(expr.get('id'));
}

/**
 * The core reducer for Reduct-Redux. Interprets actions and generates
 * the new state. Needs a semantics module and the views, in order to
 * record positions of objects on the board for undo/redo.
 *
 * @param {Function} restorePos - a function that transforms the
 * position of a view after undo/redo. Useful to adjust positions so
 * that things stay within bounds (e.g. if the game has resized since
 * the view's position was recorded).
 */
export function reduct(semantics: Semantics, views, restorePos) {
    function program(state = initialProgram, act) {
        switch (act.type) {
        case ActionKind.StartLevel: {
            act.nodes.forEach((n) => markDirty(act.nodes, n.get('id')));
            act.toolbox.forEach((n) => markDirty(act.nodes, n));
            return state.merge({
                nodes: act.nodes,
                goal: act.goal,
                board: act.board,
                toolbox: act.toolbox,
                globals: act.globals
            });
        }
        case ActionKind.Raise: {
            const board = state.get('board');
            if (board.contains(act.nodeId)) {
                const newBoard = board.filter((n) => n !== act.nodeId).push(act.nodeId);
                return state.set('board', newBoard);
            }

            return state;
        }
        case ActionKind.SmallStep: {
            // console.log("@@SMALL_STEP_REDUCE@@");
            const oldNode: Im<BaseNode> = state.getIn(['nodes', act.topNodeId]);

            let newNodes = state.get('nodes')
                .withMutations((n) => {
                    for (const node of act.addedNodes) {
                        n.set(node.get('id'), node);
                    }
                });

            let newBoard = state.get('board').filter((id) => id !== act.topNodeId);
            if (!oldNode.get('parent')) {
                newBoard = newBoard.concat(act.newNodeIds);
            } else if (act.newNodeIds.length !== 1) {
                console.log('Cannot small-step a child expression to multiple new expressions.');
                // TODO: handle this more gracefully? Create a vtuple?
            } else {
                const parent = newNodes.get(oldNode.get('parent'))!
                    .set(oldNode.get('parentField'), act.newNodeIds[0]);

                const child = newNodes.get(act.newNodeIds[0])!.withMutations((nn) => {
                    nn.set('parent', parent.get('id'));
                    nn.set('parentField', oldNode.get('parentField'));
                });

                newNodes = newNodes.withMutations((n) => {
                    n.set(oldNode.get('parent'), parent);
                    n.set(act.newNodeIds[0], child);
                });
            }

            act.newNodeIds.forEach((id) => markDirty(newNodes, id));
            // console.log("@@SMALL_STEP_REDUCE - 2@@ " + newBoard);
            return state
                .set('nodes', newNodes)
                .set('board', newBoard);
        }
        case ActionKind.AddToolboxItem: {
            const newNodes = state.get('nodes')
                .withMutations((n) => {
                    for (const node of act.addedNodes) {
                        n.set(node.get('id'), node);
                    }
                });

            const newToolbox = state.get('toolbox').push(act.newNodeId);

            return state
                .set('nodes', newNodes)
                .set('toolbox', newToolbox);
        }
        case ActionKind.AddGoalItem: {
            const newNodes = state.get('nodes')
                .withMutations((n) => {
                    for (const node of act.addedNodes) {
                        n.set(node.get('id'), node);
                    }
                });

            const addedGoal = state.get('goal').push(act.newNodeId);

            return state
                .set('nodes', newNodes)
                .set('goal', addedGoal);
        }
        case ActionKind.AddBoardItem: {
            const newNodes = state.get('nodes')
                .withMutations((n) => {
                    for (const node of act.addedNodes) {
                        n.set(node.get('id'), node);
                    }
                });

            const newBoard = state.get('board').concat(act.newNodeIds);

            act.newNodeIds.forEach((id) => markDirty(newNodes, id));

            return state
                .set('nodes', newNodes)
                .set('board', newBoard);
        }
        case ActionKind.ChangeGoal: {
            const newNodes = state.get('nodes')
                .withMutations((n) => {
                    for (const node of act.addedNodes) {
                        n.set(node.get('id'), node);
                    }
                });

            const len = state.get('goal').size;

            let newGoal = state.get('goal');
            newGoal = newGoal.splice(act.goal_id, 1, ...act.newNodeIds);

            return state
                .set('nodes', newNodes)
                .set('goal', newGoal);
        }
        case ActionKind.Unfold: {
            const nodes = state.get('nodes');
            const ref = nodes.get(act.nodeId);

            let newState = state
                .set('nodes', nodes.withMutations((n) => {
                    for (const node of act.addedNodes) {
                        n.set(node.get('id'), node);
                    }

                    if (ref.has('parent')) {
                        const parentId = ref.get('parent');
                        n.set(
                            parentId,
                            n.get(parentId).set(ref.get('parentField'), act.newNodeId)
                        );
                        n.set('locked', true);
                    }
                }));

            if (!ref.has('parent')) {
                newState = newState
                    .set('board', state.get('board').map((id) => (id === act.nodeId ? act.newNodeId : id)));
            }

            return newState;
        }
        case ActionKind.BetaReduce: {
            const queue = [act.topNodeId, act.argNodeId];
            const removedNodes = {};

            const addedNodes = ImMap(act.addedNodes.map((n) => {
                const id = n.get('id');
                if (act.newNodeIds.indexOf(id) >= 0) {
                    return [id, n.delete('parent').delete('parentField')];
                }

                return [id, n];
            }));

            while (queue.length > 0) {
                const current = queue.pop();
                const currentNode = state.getIn(['nodes', current]);
                removedNodes[current] = true;
                for (const subexpField of semantics.subexpressions(currentNode)) {
                    queue.push(currentNode.get(subexpField));
                }
            }

            const oldNode = state.getIn(['nodes', act.topNodeId]);

            let newNodes = state.get('nodes').filter((key, value) => !removedNodes[key]).merge(addedNodes);

            let newBoard = state.get('board').filter((id) => !removedNodes[id]);
            if (!oldNode.get('parent')) {
                newBoard = newBoard.concat(act.newNodeIds);
            } else {
                if (act.newNodeIds.length > 1) {
                    console.error('Can\'t beta reduce nested lambda that produced multiple new nodes!');
                    return null;
                }
                const parent = newNodes.get(oldNode.get('parent'))
                    .set(oldNode.get('parentField'), act.newNodeIds[0]);
                newNodes = newNodes.set(oldNode.get('parent'), parent);
            }

            act.newNodeIds.forEach((id) => markDirty(newNodes, id));

            return state.withMutations((s) => {
                s.set('nodes', newNodes);
                s.set('board', newBoard);
                s.set('toolbox', s.get('toolbox').filter((id) => !removedNodes[id]));
            });
        }
        case ActionKind.FillSlot: {
            const hole = state.getIn(['nodes', act.holeId]);

            const holeParent = state.getIn(['nodes', act.holeId, 'parent']);
            if (holeParent === undefined) throw `Hole ${act.holeId} has no parent!`;

            const child = state.getIn(['nodes', act.childId]);
            if (child.get('parent')) throw 'Dragging objects from one hole to another is unsupported.';

            return state.withMutations((map) => {
                map.set('board', map.get('board').filter((n) => n != act.childId));
                map.set('toolbox', map.get('toolbox').filter((n) => n != act.childId));
                map.set('nodes', map.get('nodes').withMutations((nodes) => {
                    nodes.set(holeParent, nodes.get(holeParent).withMutations((holeParent) => {
                        // Cache the hole in the parent, so that we
                        // don't have to create a new hole if they
                        // detach the field later.
                        holeParent.set(`${hole.get('parentField')}__hole`, holeParent.get(hole.get('parentField')));
                        holeParent.set(hole.get('parentField'), act.childId);
                    }));
                    nodes.set(act.childId, child.withMutations((child) => {
                        child.set('parentField', hole.get('parentField'));
                        child.set('parent', holeParent);
                        child.set('locked', false);
                    }));
                }));

                markDirty(map.get('nodes'), act.childId);
            });
        }
        case ActionKind.AttachNotch: {
            const child = state.getIn(['nodes', act.childId]);
            if (child.get('parent')) throw 'Dragging objects from one hole to another is unsupported.';

            return state.withMutations((s) => {
                // s.set("board", s.get("board").filter(n => n !== act.childId));
                s.set('toolbox', s.get('toolbox').filter((n) => n !== act.childId));
                s.set('nodes', s.get('nodes').withMutations((nodes) => {
                    nodes.set(act.parentId, nodes.get(act.parentId).set(`notch${act.notchIdx}`, act.childId));
                    nodes.set(act.childId, child.withMutations((c) => {
                        c.set('parentField', `notch${act.notchIdx}`);
                        c.set('parent', act.parentId);
                        c.set('locked', false);
                    }));
                }));

                // TODO: refactor
                const defn = semantics.definition.expressions[s.getIn(['nodes', act.parentId, 'type'])];
                if (defn && defn.notches[act.notchIdx]) {
                    const notch = defn.notches[act.notchIdx];
                    if (notch.onAttach) {
                        notch.onAttach(semantics, s, act.parentId, act.childId);
                    }
                }

                if (s.get('board').contains(act.childId)) {
                    // Actually remove from the board
                    s.set('board', s.get('board').filter((n) => n !== act.childId));
                }

                const nodes = state.get('nodes');
                for (const id of state.get('board').concat(state.get('toolbox'))) {
                    markDirty(nodes, id);
                }
            });
        }
        case ActionKind.UseToolbox: {
            if (state.get('toolbox').contains(act.nodeId)) {
                // If node has __meta indicating infinite uses, clone
                // instead.
                if (act.clonedNodeId) {
                    return state.withMutations((mutState) => {
                        // TODO: don't delete entire metadata section
                        mutState.set('nodes', mutState.get('nodes').withMutations((nodes) => {
                            for (const node of act.addedNodes) {
                                nodes.set(node.get('id'), node);
                            }
                        }));
                        mutState.set('board', mutState.get('board').push(act.clonedNodeId));
                    });
                }

                return state.withMutations((mutState) => {
                    mutState.set('board', mutState.get('board').push(act.nodeId));
                    mutState.set('toolbox', mutState.get('toolbox').filter((n) => n !== act.nodeId));
                });
            }
            return state;
        }
        case ActionKind.Detach: {
            const node = state.getIn(['nodes', act.nodeId]);

            const parent = state.getIn(['nodes', act.nodeId, 'parent']);
            if (parent === undefined) throw `Can't detach node ${act.nodeId} with no parent!`;

            return state.withMutations((map) => {
                map.set('board', map.get('board').push(act.nodeId));
                map.set('nodes', map.get('nodes').withMutations((nodes) => {
                    nodes.set(parent, nodes.get(parent).withMutations((parent) => {
                        const oldHole = parent.get(`${node.get('parentField')}__hole`);
                        if (oldHole) {
                            parent.set(node.get('parentField'), oldHole);
                            parent.delete(`${node.get('parentField')}__hole`);
                        } else if (node.get('parentField').slice(0, 5) === 'notch') {
                            parent.delete(node.get('parentField'));
                        } else {
                            throw 'Unimplemented: creating new hole';
                        }
                    }));

                    // TODO: refactor
                    if (node.get('parentField').slice(0, 5) === 'notch') {
                        const notchIdx = parseInt(node.get('parentField').slice(5), 10);
                        const parentNode = map.getIn(['nodes', parent]);
                        const defn = semantics.definition.expressions[parentNode.get('type')];
                        if (defn && defn.notches[notchIdx]) {
                            const notch = defn.notches[notchIdx];
                            if (notch.onDetach) {
                                notch.onDetach(semantics, map, parentNode.get('id'), node.get('id'));
                            }
                        }

                        const nodes = state.get('nodes');
                        for (const id of state.get('board').concat(state.get('toolbox'))) {
                            markDirty(nodes, id);
                        }
                    }

                    nodes.set(act.nodeId, node.withMutations((node) => {
                        node.delete('parentField');
                        node.delete('parent');
                    }));

                    markDirty(nodes, parent);
                }));
            });
        }
        case ActionKind.Victory: {
            return state.withMutations((map) => {
                map.set('board', ImList());
                map.set('goal', ImList());
            });
        }
        case ActionKind.Unfade: {
            return state.withMutations((s) => {
                s.set('nodes', s.get('nodes').withMutations((n) => {
                    for (const newNode of act.addedNodes) {
                        n.set(newNode.get('id'), newNode);
                    }
                }));
                s.set(
                    act.source,
                    s.get(act.source).map((n) => (n === act.nodeId ? act.newNodeId : n))
                );
            });
        }
        case ActionKind.Fade: {
            return state.withMutations((s) => {
                s.set(
                    act.source,
                    s.get(act.source).map((n) => (n === act.unfadedId ? act.fadedId : n))
                );
            });
        }
        case ActionKind.Define: {
            return state.withMutations((s) => {
                s.set('globals', state.get('globals').set(act.name, act.id));
                s.set('board', state.get('board').filter((id) => id !== act.id));
            });
        }
        default: return state;
        }
    }

    function annotateTypes(state = initialProgram) {
        const annotatedNodes = state.get('nodes').withMutations((n) => {
            // for (const [ exprId, expr ] of n.entries()) {
            //     n.set(exprId, expr.set("ty", null));
            //     n.set(exprId, expr.set("complete", false));
            // }

            // for (const id of state.get("board").concat(state.get("toolbox"))) {
            for (const id of dirty.values()) {
                const { types, completeness } = semantics.collectTypes(state.set('nodes', n), n.get(id));
                for (const [exprId, expr] of n.entries()) {
                    let newExpr = expr;
                    if (types.has(exprId)) {
                        newExpr = newExpr.set('ty', types.get(exprId));
                    }
                    if (completeness.has(exprId)) {
                        newExpr = newExpr.set('complete', completeness.get(exprId));
                    }
                    n.set(exprId, newExpr);
                }
            }
            dirty = new Set();
        });
        return state.set('nodes', annotatedNodes);
    }

    return {
        reducer: combineReducers({
            program: undoable(compose(annotateTypes, program), {
                actionFilter: (act) => act.type === ActionKind.Raise
                    || act.type === ActionKind.Hover
                    // Prevent people from undoing start of level
                    || act.type === ActionKind.StartLevel
                    || act.skipUndo,
                extraState: (state, newState) => {
                    const result = {};
                    for (const id of state.get('board')) {
                        if (views[id]) {
                            const pos = { ...gfx.absolutePos(views[id]) };
                            if (pos.x === 0 && pos.y === 0) continue;
                            result[id] = pos;
                        }
                    }
                    for (const id of newState.get('board')) {
                        if (views[id]) {
                            const pos = { ...gfx.absolutePos(views[id]) };
                            if (pos.x === 0 && pos.y === 0) continue;
                            result[id] = pos;
                        }
                    }
                    return result;
                },
                restoreExtraState: (state, oldState, extraState) => {
                    if (!extraState) return;

                    for (const id of state.get('board')) {
                        if (!oldState.get('board').contains(id)) {
                            if (extraState[id]) {
                                Object.assign(views[id].pos, gfx.absolutePos(views[id]));
                                views[id].anchor.x = 0;
                                views[id].anchor.y = 0;
                                views[id].scale.x = 1.0;
                                views[id].scale.y = 1.0;
                                animate.tween(views[id].pos, restorePos(id, extraState[id]), {
                                    duration: 250,
                                    easing: animate.Easing.Cubic.Out
                                });
                            }
                        }
                    }
                    for (const id of state.get('toolbox')) {
                        if (!oldState.get('toolbox').contains(id)) {
                            views[id].pos = gfx.absolutePos(views[id]);
                            views[id].scale.x = 1.0;
                            views[id].scale.y = 1.0;
                        }
                    }
                }
            })
        })
    };
}
