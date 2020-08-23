import { GameState } from '@/store/state';
import {
  DeepReadonly, DRF, withChild, withParent,
} from '@/util/helper';
import { CloneResult } from '@/util/nodes';

/**
 * Helper function that will construct a new game state with cloned nodes added.
 *
 * @param self The builtin identifier node which was called.
 * @param cloneResult The result of calling cloneNodesDeep or mapNodesDeep.
 * @param state The current game state.
 * @returns A new game state where the cloned/mapped nodes have been added to
 * the game.
 */

export function addClonedNodes(
  self: DRF,
  [clonedRoot, , newNodeMap]: CloneResult,
  state: DeepReadonly<GameState>
): DeepReadonly<GameState> {
  const added = new Map();

  if (self.parent && self.parentField) {
    if (self.parent !== clonedRoot.parent || self.parentField !== clonedRoot.parentField) {
      clonedRoot = withParent(clonedRoot, self.parent, self.parentField);

      let parent = state.nodes.get(clonedRoot.parent!)!;
      parent = withChild(parent, clonedRoot.id, self.parentField);

      newNodeMap = new Map([
        ...newNodeMap,
        [clonedRoot.id, clonedRoot],
        [parent.id, parent],
      ]);
    }
  }

  added.set(clonedRoot.id, self.id);

  return {
    ...state,
    added,
    nodes: newNodeMap,
  };
}
