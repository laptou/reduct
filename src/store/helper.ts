import { produce } from 'immer';

import { GameState } from './state';

import { getKindForNode } from '@/semantics/util';
import { DeepReadonly } from '@/util/helper';
import { compareNodesDeep } from '@/util/nodes';

/**
 * Returns true if the user has completed the current level (i.e., the nodes on
 * the board) match the nodes in the goal.
 * @param state The current game state.
 */
export function checkVictory(state: DeepReadonly<GameState>): boolean {
  // syntax nodes are ignored when detecting level completion
  const board = new Set(Array.from(state.board).filter((id) => {
    const node = state.nodes.get(id)!;
    if (getKindForNode(node, state.nodes) === 'syntax') return false;
    return true; 
  }));

  const goal = state.goal;
  
  if (board.size !== goal.size) {
    return false;
  }

  let success = true;
  for (const goalNodeId of goal) {
    let found = false;

    for (const candidateId of board) {
      if (compareNodesDeep(goalNodeId, candidateId, state.nodes)) {
        board.delete(candidateId);
        found = true;
        break;
      }
    }

    if (!found) {
      success = false;
      break;
    }
  }

  return success;
}

/**
 * Returns true if there are no possible moves remaining that would lead to
 * victory. You should check for victory first, as this function will return
 * true if the level is already in a victory state.
 * @param state The current game state.
 */
export function checkDefeat(state: DeepReadonly<GameState>): boolean {
  // if there are still expressions on the board that can be stepped, don't declare defeat yet
  const containsReduceableExpr = [...state.board.values(), ...state.toolbox.values()].some((id) => {
    const node = state.nodes.get(id)!;
    const kind = getKindForNode(node, state.nodes);
    return kind === 'expression'
        || kind === 'statement'
        || node.type === 'lambda'
        || node.type === 'identifier';
  });

  if (containsReduceableExpr) {
    return false;
  }

  // Level is not yet completed, no reducible expressions, and
  // nothing in toolbox -> level can't be completed
  if (state.toolbox.size === 0) {
    return true;
  }

  // Try adding any combination of toolbox items to the board -
  // does using them complete the level?

  // Thanks to Nina Scholz @ SO:
  // https://stackoverflow.com/a/42774126
  // Generates all array subsets (its powerset).
  const powerset = <U>(array: U[]) => {
    const result: U[][] = [];

    const fork = (i: number, t: U[]) => {
      if (i === array.length) {
        result.push(t);
        return;
      }
      fork(i + 1, t.concat([array[i]]));
      fork(i + 1, t);
    };

    fork(0, []);
    return result;
  };

  for (const subset of powerset(Array.from(state.toolbox))) {
    const victorious = checkVictory(produce(state, (draft) => {
      for (const subsetNodeId of subset) {
        draft.toolbox.delete(subsetNodeId);
        draft.board.add(subsetNodeId);
      }
    }));

    // there is a possible future in which the user wins
    if (victorious)
      return false;
  }

  // I saw 14,000,605 futures. The user loses in all of them.
  // (that is a joke)
  return true;
}
