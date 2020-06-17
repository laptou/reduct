// import Map as ImMap to avoid conflicting with built-in
// Map type, and the others for consistency
import { compose } from 'redux';
import { combineReducers } from 'redux-immutable';

import {
  Im, ImList, ImMap, ImSet 
} from '@/util/im';
import type {
  NodeId, BaseNode, ReductNode, NodeMap 
} from '@/semantics';
import type { Semantics } from '@/semantics/transform';
import { ActionKind, ReductAction } from './action';
import * as gfx from '../gfx/core';
import * as animate from '../gfx/animate';
import { undoable } from './undo';
import { RState } from './state';
import { produce } from 'immer';

const initialProgram: RState = {
  nodes: new Map(),
  goal: new Set(),
  board: new Set(),
  toolbox: new Set(),
  globals: new Map()
};

let idCounter = 0;

/**
 * Returns the next unique ID. Used to assign IDs to nodes and views.
 */
export function nextId(): NodeId {
  return idCounter++;
}

// To speed up type checking, we only type check nodes that have
// changed.
let dirty = new Set<NodeId>();
function markDirty(nodes: NodeMap, id: NodeId) {
  let node = nodes.get(id)!; // warning: assuming node w/ given ID exists
  let parentId = node.parent;

  // travel to the root node
  while (typeof parentId === 'number') {
    node = nodes.get(parentId)!;
    parentId = node.parent;
  }

  // add root node to dirty set
  dirty.add(node.id);
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
  function program(state = initialProgram, act: ReductAction): RState {
    switch (act.type) {
    case ActionKind.AddNodeToBoard: {
      // if this node was in the toolbox, remove it from there unless it has a
      // meta tag that specifies that it has infinite uses

      const node = state.nodes.get(act.nodeId);

      if (!node) return state;

      if (!node.__meta?.toolbox?.unlimited) {
        return produce(state, draft => {
          draft.toolbox.delete(act.nodeId);
          draft.board.add(act.nodeId);
        });
      } else {
        return state;
      }
    }

    case ActionKind.StartLevel: {
      act.nodes.forEach((n) => markDirty(act.nodes, n.id));
      act.toolbox.forEach((n) => markDirty(act.nodes, n));
      return {
        nodes: act.nodes,
        goal: act.goal,
        board: act.board,
        toolbox: act.toolbox,
        globals: act.globals
      };
    }

    case ActionKind.Raise: {
      if (state.board.has(act.nodeId)) {
        return produce(state, draft => {
          draft.board.delete(act.nodeId);
          draft.board.add(act.nodeId);
        });
      }

      return state;
    }

    case ActionKind.SmallStep: {
      // console.log("@@SMALL_STEP_REDUCE@@");
      const oldNode = state.nodes.get(act.topNodeId)!;

      if (oldNode.parent && act.newNodeIds.length !== 1)
      // TODO: handle this more gracefully? Create a vtuple?
      // TODO: handle when an expression doesn't create anything??
        throw new Error('Cannot small-step a child expression to multiple new expressions.');
          
      const newNodeId = act.newNodeIds[0];

      const newState = produce(state, draft => {
        // update the node map
        for (const node of act.addedNodes) {
          draft.nodes.set(node.id, node);
        }

        if (oldNode.parent) {
          const parent = draft.nodes.get(oldNode.parent)!;
          // TODO: refactor child node structure
          parent[newNodeId] = act.newNodeIds[0];

          const child = draft.nodes.get(newNodeId)!;
          child.parent = parent.id;
          child.parentField = oldNode.parentField;

          draft.nodes.set(oldNode.parent, parent);
          draft.nodes.set(newNodeId, child);
        }

        // update the board
        draft.board.delete(act.topNodeId);

        // if the old node was a top level node, add the nodes that it was
        // turned into to the board
        if (!oldNode.parent)
          for (const newNodeId of act.newNodeIds)
            draft.board.add(newNodeId);
      });

      act.newNodeIds.forEach((id) => markDirty(newState.nodes, id));
      
      return newState;
    }

    case ActionKind.AddToolboxItem: {
      return produce(state, draft => {
        for (const node of act.addedNodes) {
          draft.nodes.set(node.id, node);
        }

        draft.toolbox.add(act.newNodeId);
      });
    }

    case ActionKind.AddGoalItem: {
      return produce(state, draft => {
        for (const node of act.addedNodes) {
          draft.nodes.set(node.id, node);
        }

        draft.goal.add(act.newNodeId);
      });
    }

    case ActionKind.AddBoardItem: {
      return produce(state, draft => {
        for (const node of act.addedNodes) {
          draft.nodes.set(node.id, node);
        }

        for (const nodeId of act.newNodeIds) {
          draft.board.add(nodeId);
        }

        draft.board.add(act.newNodeId);
      });
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
      const removedNodes: Record<number, boolean> = {};

      const addedNodes = act.addedNodes.map((n) => {
        const id = n.id;
        if (act.newNodeIds.indexOf(id) >= 0) {
          const orphaned = produce(n, draft => {
            delete draft.parent;
            delete draft.parentField;
          });
          return [id, orphaned];
        }

        return [id, n];
      });

      while (queue.length > 0) {
        const current = queue.pop();
        const currentNode = state.nodes.get(current)!;
        removedNodes[current] = true;
        for (const subexpField of semantics.subexpressions(currentNode)) {
          queue.push(currentNode.subexpressions[subexpField]);
        }
      }

      const oldNode = state.nodes.get(act.topNodeId)!;

      return produce(state, draft => {
        for (const [key, removed] of Object.entries(removedNodes)) {
          if (removed) {
            draft.nodes.delete(key);
            draft.board.delete(key);
            draft.toolbox.delete(key);
          }
        }

        for (const [key, node] of Object.entries(addedNodes)) {
          draft.nodes.set(key, node);
        }

        if (act.newNodeIds.length > 1) {
          console.error('Can\'t beta reduce nested lambda that produced multiple new nodes!');
          return;
        }
        const parent = draft.nodes.get(oldNode.parent)!;
        parent.subexpressions[oldNode.parentField] = act.newNodeIds[0];
        
        if (!oldNode.parent) {
          for (const newNodeId of act.newNodeIds) {
            draft.board.add(newNodeId);
          }
        }
        act.newNodeIds.forEach((id) => markDirty(draft.nodes, id));
      });
    }
    case ActionKind.FillSlot: {
      const newState = produce(state, draft => {
        const hole = draft.nodes.get(act.holeId)!;
        if (!hole.parent) throw `Hole ${act.holeId} has no parent!`;
  
        const parent = draft.nodes.get(hole.parent);
        const child = draft.nodes.get(act.childId)!;
        if (child.parent) throw 'Dragging objects from one hole to another is unsupported.';

        draft.board.delete(act.childId);
        draft.toolbox.delete(act.childId);

        // Cache the hole in the parent, so that we
        // don't have to create a new hole if they
        // detach the field later.
        parent[`${hole.parentField}__hole`] = parent[hole.parentField];

        child.parentField = hole.parentField;
        child.parent = hole.parent;
        child.locked = false;
      });

      markDirty(newState.nodes, act.childId);

      return newState;
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
      if (state.toolbox.has(act.nodeId)) {
        // If node has __meta indicating infinite uses, clone
        // instead.
        if (act.clonedNodeId) {
          return produce(state, draft => {
            for (const node of act.addedNodes) {
              draft.nodes.set(node.id, node);
            }

            draft.board.add(act.clonedNodeId);
          });
        }

        return produce(state, draft => {
          draft.board.add(act.nodeId);
          draft.toolbox.delete(act.nodeId);
        });
      }

      return state;
    }
    case ActionKind.Detach: {
      const node = state.nodes.get(act.nodeId)!;

      const parentId = node.parent;
      if (parentId === undefined) throw `Can't detach node ${act.nodeId} with no parent!`;

      return produce(state, (draft) => {
        draft.board.add(act.nodeId);
        
        const parent = draft.nodes.get(parentId)!;
        const oldHole = parent.subexpressions[`${node.parentField}__hole`];
        if (oldHole) {
          parent.subexpressions[node.parentField] = oldHole;
          delete parent.subexpressions[`${node.parentField}__hole`];
        } else if (node.parentField.startsWith('notch')) {
          delete parent.subexpressions[node.parentField];
        } else {
          throw 'Unimplemented: creating new hole';
        }

        // TODO: refactor
        if (node.parentField.startsWith('notch')) {
          const notchIdx = parseInt(node.parentField.slice(5), 10);
          const defn = semantics.definition.expressions[parent.type];
          if (defn && defn.notches[notchIdx]) {
            const notch = defn.notches[notchIdx];
            if (notch.onDetach) {
              notch.onDetach(semantics, draft, parent.id, node.id);
            }
          }

          for (const id of [...state.board, ...state.toolbox]) {
            markDirty(draft.nodes, id);
          }
        }

        const node = draft.nodes.get(act.nodeId)!;
        delete node.parentField;
        delete node.parentField;

        markDirty(draft.nodes, parentId);
      });
    }
    case ActionKind.Victory: {
      return produce(state, draft => {
        draft.board.clear();
        draft.goal.clear();
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
      return produce(state, draft => {
        draft[act.source] = act.fadedId;
      });

      // return state.withMutations((s) => {
      //   s.set(
      //     act.source,
      //     s.get(act.source).map((n) => (n === act.unfadedId ? act.fadedId : n))
      //   );
      // });
    }
    case ActionKind.Define: {
      return produce(state, draft => {
        draft.globals.set(act.name, act.id);
        draft.board.delete(act.id);
      });
    }
    default: return state;
    }
  }

  function annotateTypes(state = initialProgram) {
    return produce(state, draft => {
      for (const id of dirty.values()) {
        const { types, completeness } = semantics.collectTypes(draft, draft.nodes.get(id));
        for (const [exprId, expr] of draft.nodes.entries()) {
          if (types.has(exprId)) {
            expr.ty = types.get(exprId);
          }
          if (completeness.has(exprId)) {
            expr.complete = completeness.get(exprId);
          }
        }
      }
      dirty = new Set();
    });
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
          for (const id of state.board) {
            if (views[id]) {
              const pos = { ...gfx.absolutePos(views[id]) };
              if (pos.x === 0 && pos.y === 0) continue;
              result[id] = pos;
            }
          }
          for (const id of newState.board) {
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

          for (const id of state.board) {
            if (!oldState.board.has(id)) {
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
          for (const id of state.toolbox) {
            if (!oldState.toolbox.contains(id)) {
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
