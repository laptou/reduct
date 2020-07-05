import { castDraft, produce } from 'immer';
import type { Reducer } from 'redux';
import { ActionKind, ReductAction } from './action';
import { NodeError } from './errors';

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

export interface UndoableState<S>
{
  $present: S;
  $past: S[];
  $future: S[];
  $error: NodeError | null;

  $presentExtra: any;
  $pastExtra: any[];
  $futureExtra: any[];
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
export function undoable<S>(reducer: Reducer<S>, options = {}) {
  const initialState: UndoableState<S> = {
    $present: reducer(),
    $past: [] as S[],
    $future: [] as S[],
    $error: null,
    // "Extra" state (used to store node positions)
    $presentExtra: {},
    $pastExtra: [],
    $futureExtra: []
  };

  return function(state: UndoableState<S> = initialState, action?: ReductAction): UndoableState<S> {
    switch (action?.type) {
    case ActionKind.StartLevelLegacy:
    case ActionKind.StartLevel: {
      return produce(state, draft => {
        draft.$past = [];
        draft.$future = [];
        draft.$present = castDraft(reducer(state.$present, action));
        draft.$presentExtra = {};
      });
    }
    case ActionKind.Undo: {
      if (state.$past.length === 0) return state;

      const newState = produce(state, draft => {
        draft.$future.unshift(castDraft(state.$present));
        draft.$present = draft.$past.shift()!;
        draft.$futureExtra.unshift(state.$presentExtra);
        draft.$presentExtra = draft.$pastExtra.shift();
      });

      return newState;
    }
    case ActionKind.Redo: {
      if (state.$future.length === 0) return state;

      const newState = produce(state, draft => {
        draft.$past.unshift(castDraft(state.$present));
        draft.$present = draft.$future.shift()!;
        draft.$pastExtra.unshift(state.$presentExtra);
        draft.$presentExtra = draft.$futureExtra.shift();
      });

      return newState;
    }
    case ActionKind.ClearError: {
      return {
        ...state,
        $error: null
      };
    }
    default: {
      return produce(state, draft => {
        try {
        // use state.$present, do not allow draft objects to escape from this function
          const newPresent = reducer(state.$present, action);

          if (newPresent === state.$present) {
            return;
          }
  
          if (options.actionFilter && options.actionFilter(action)) {
            draft.$present = newPresent;
            return;
          }
  
          // use state.$present, do not allow draft objects to escape from this function
          const extraState = options.extraState(state.$present, newPresent);
  
          draft.$past.unshift(draft.$present);
          draft.$present = newPresent;
          draft.$future = [];
  
          draft.$pastExtra.unshift(draft.$presentExtra);
          draft.$presentExtra = extraState;
          draft.$futureExtra = [];
        } catch (error) {
          if (error instanceof NodeError) {
            draft.$error = error;
          } else {
            throw error;
          }
        }
      });
    }
    }
  };
}
