import * as immutable from 'immutable';

import { ActionKind } from './action';
import produce from 'immer';

/** Undo the last action. */
export function undo() {
  return {
    type: ActionKind.Undo
  };
}

/** Redo the last undone action. */
export function redo() {
  return {
    type: ActionKind.Redo
  };
}

/**
 * Given a reducer, return a reducer that supports undo/redo.
 *
 * @param {Object} options
 * @param {Function} options.restoreExtraState - After an undo or
 * redo, given the previous and new state, restore any state that
 * lives outside of Redux. (For instance, positions of expressions on
 * the board.)
 * @param {Function} options.actionFilter - Given an action, if true,
 * then simply modify the state and do not add the previous state to
 * the undo stack.
 * @param {Function} options.extraState - Given the previous and new
 * state, record any state that lives outside of Redux.
 */
export function undoable(reducer, options = {}) {
  const initialState = {
    $present: reducer(undefined, {}),
    $past: [],
    $future: [],
    // "Extra" state (used to store node positions)
    $presentExtra: {},
    $pastExtra: [],
    $futureExtra: []
  };

  return function(state = initialState, action) {
    switch (action.type) {
    case ActionKind.StartLevel: {
      return produce(state, draft => {
        draft.$present = reducer(draft.$present, action);
        draft.$presentExtra = {};
      });
    }
    case ActionKind.Undo: {
      if (state.$past.isEmpty()) return state;

      const newState = produce(state, draft => {
        draft.$future.unshift(draft.$present);
        draft.$present = draft.$past.shift();
        draft.$futureExtra.unshift(draft.$presentExtra);
        draft.$presentExtra = draft.$pastExtra.shift();
      });

      options.restoreExtraState($past.peek(), $present, $pastExtra.peek());
      return newState;
    }
    case ActionKind.Redo: {
      if ($future.isEmpty()) return state;

      const newState = state.withMutations((map) => {
        map
          .set('$past', $past.unshift($present))
          .set('$present', $future.peek())
          .set('$future', $future.shift())
          .set('$pastExtra', $pastExtra.unshift($presentExtra))
          .set('$presentExtra', $futureExtra.peek())
          .set('$futureExtra', $futureExtra.shift());
      });
      options.restoreExtraState($future.peek(), $present, $futureExtra.peek());
      return newState;
    }
    default: {
      return produce(state, draft => {
        const newPresent = reducer(draft.$present, action);

        if (newPresent === draft.$present) {
          return;
        }

        if (options.actionFilter && options.actionFilter(action)) {
          draft.$present = newPresent;
          return;
        }

        const extraState = options.extraState($present, newPresent);

        draft.$past.unshift(draft.$present);
        draft.$present = newPresent;
        draft.$future = [];

        draft.$pastExtra.unshift(draft.$presentExtra);
        draft.$presentExtra = extraState;
        draft.$futureExtra = [];
      });
    }
    }
  };
}
