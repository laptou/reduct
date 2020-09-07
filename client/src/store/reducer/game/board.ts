import { castDraft, produce } from 'immer';

import {
  ActionKind, createDetach, createMoveNodeToBoard, ReductAction,
} from '../../action/game';
import {
  InvalidActionError, MissingNodeError, RecursiveNodeError, WrongTypeError,
} from '../../errors';
import { GameState } from '../../state';

import { cloneNodeAndAddDeep, findNodesDeep, isAncestorOf } from '@/util/nodes';
import { DeepReadonly } from '@/util/helper';
import { createMissingNode, getKindForNode } from '@/semantics/util';

export function gameBoardReducer(
  state: DeepReadonly<GameState>,
  act?: ReductAction
): DeepReadonly<GameState> {
  if (!act) return state;

  switch (act.type) {

  case ActionKind.Cleanup: {
    const { target } = act;
    if (!state.removed.has(target)) return state;

    // if all of the nodes in the removed set have been marked as ready for
    // cleanup, delete them
    if ([...state.removed.values()].every(i => i)) {
      return produce(state, draft => {
        for (const removed of state.removed.keys()) {
          draft.nodes.delete(removed);
          draft.removed.delete(removed);
        }
      });
    } else {
      // otherwise, just mark as ready for cleanup
      return produce(state, draft => {
        draft.removed.set(target, true);
      });
    }
  }

  case ActionKind.MoveNodeToBoard: {
    if (state.board.has(act.nodeId) || state.removed.has(act.nodeId))
      return state;

    const node = state.nodes.get(act.nodeId);

    if (!node) return state;

    if (node.type === 'missing') {
      throw new MissingNodeError(node.id);
    }

    if (state.toolbox.has(act.nodeId)) {
      return produce(state, draft => {
        draft.added.clear();

        // if there is a meta tag that specifies unlimited uses, clone the node
        // instead of moving it
        if (node.__meta?.toolbox?.unlimited) {
          const [clonedNode, clonedDescendants, newNodeMap] = cloneNodeAndAddDeep(act.nodeId, state.nodes);

          draft.nodes = castDraft(newNodeMap);

          // a Set iterates in insertion order; we want the new toolbox to be
          // in the same order as the old one
          const toolbox = [...draft.toolbox];
          const idx = toolbox.findIndex(id => id === act.nodeId);
          toolbox[idx] = clonedNode.id;
          draft.toolbox = new Set(toolbox);

          draft.added.set(clonedNode.id, act.nodeId);
          for (const clonedDescendant of clonedDescendants) {
            draft.added.set(clonedDescendant.id, act.nodeId);
          }
        } else {
          draft.toolbox.delete(act.nodeId);
        }

        draft.board.add(act.nodeId);
      });
    }

    // if it's not in the board and not in the toolbox, just detach it
    // TODO: handle defs

    if (node.parent) {
      return gameBoardReducer(state, createDetach(node.id));
    }

    return state;
  }

  case ActionKind.MoveNodeToSlot: {
    const { slotId, nodeId } = act;

    state = gameBoardReducer(state, createMoveNodeToBoard(nodeId));

    if (isAncestorOf(slotId, nodeId, state.nodes))
      throw new RecursiveNodeError(slotId);

    const newState = produce(state, draft => {
      const slot = draft.nodes.get(slotId);

      if (!slot) return;

      // this should be impossible
      if (!slot.parent)
        throw new Error(`Slot ${slotId} has no parent!`);

      const parent = draft.nodes.get(slot.parent)!;
      const child = draft.nodes.get(nodeId);

      if (!child) return;

      if (child.type === 'missing') {
        throw new MissingNodeError(child.id);
      }

      const childKind = getKindForNode(child, draft.nodes);

      if (childKind === 'syntax' || childKind === 'statement')
        throw new InvalidActionError(child.id);

      draft.board.delete(nodeId);

      // Cache the hole in the parent, so that we don't have to create a new
      // hole if the user detaches this child later
      if (!parent.__meta)
        parent.__meta = {};

      if (!parent.__meta.slots)
        parent.__meta.slots = {};

      parent.__meta.slots[slot.parentField!] = slotId;

      parent.subexpressions[slot.parentField!] = child.id;
      child.parentField = slot.parentField;
      child.parent = slot.parent;
      child.locked = false;
    });

    return newState;
  }

  case ActionKind.MoveNodeToDefs: {
    const { nodeId } = act;

    const defNode = state.nodes.get(nodeId)!;

    state = gameBoardReducer(state, createMoveNodeToBoard(nodeId));

    if (defNode.type !== 'define')
      throw new WrongTypeError(nodeId, 'define', defNode.type);

    // search for any unfilled slots
    const slots = findNodesDeep(nodeId, state.nodes, (node) => node.type === 'missing');

    if (slots.length > 0)
      throw new MissingNodeError(slots[0].id);

    return produce(state, draft => {
      draft.globals.set(defNode.fields.name, nodeId);
      draft.board.delete(nodeId);
    });
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
    const newNodes = state.nodes
      .withMutations((n) => {
        for (const node of act.addedNodes) {
          n.set(node.id, node);
        }
      });

    const len = state.goal.size;

    let newGoal = state.goal;
    newGoal = newGoal.splice(act.goal_id, 1, ...act.newNodeIds);

    return state
      .set('nodes', newNodes)
      .set('goal', newGoal);
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
    if (!parentId) throw new Error(`Can't detach node ${act.nodeId} with no parent!`);

    return produce(state, (draft) => {
      draft.board.add(act.nodeId);
      const node = draft.nodes.get(act.nodeId)!;
      const parent = draft.nodes.get(parentId)!;
      const oldHole = parent.__meta?.slots?.[node.parentField];

      if (oldHole) {
        parent.subexpressions[node.parentField] = oldHole;
        delete parent.__meta!.slots![`${node.parentField}:hole`];
      } else {
        const newSlot = createMissingNode();
        draft.nodes.set(newSlot.id, newSlot);
        newSlot.parent = parentId;
        newSlot.parentField = node.parentField;
        parent.subexpressions[node.parentField] = newSlot.id;
      }

      node.parentField = null;
      node.parent = null;
    });
  }

  default: return state;
  }
}
