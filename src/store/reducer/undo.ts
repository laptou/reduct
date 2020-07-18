import { castDraft, produce } from 'immer';
import type { Reducer } from 'redux';
import { ActionKind, ReductAction } from '../action';
import { GameError } from '../errors';
import { RState } from '../state';

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
  $error: GameError | null;
}

/**
 * Given a reducer, return a reducer that supports undo/redo and handles game
 * errors.
 */
export function undoable(reducer: Reducer<RState>) {
  const initialState: UndoableState<RState> = {
    $present: reducer(),
    $past: [] as RState[],
    $future: [] as RState[],
    $error: null
  };

  return function(state: UndoableState<RState> = initialState, action?: ReductAction): UndoableState<S> {
    if (!action) return state;

    switch (action.type) {
    case ActionKind.StartLevel: {
      return produce(state, draft => {
        draft.$past = [];
        draft.$future = [];
        draft.$present = castDraft(reducer(state.$present, action));
        draft.$error = null;
      });
    }

    case ActionKind.Undo: {
      if (state.$past.length === 0) return state;

      const newState = produce(state, draft => {
        draft.$future.unshift(castDraft(state.$present));
        draft.$present = draft.$past.shift()!;
        draft.$present.executing.clear();
        draft.$error = null;
      });

      return newState;
    }

    case ActionKind.Redo: {
      if (state.$future.length === 0) return state;

      const newState = produce(state, draft => {
        draft.$past.unshift(castDraft(state.$present));
        draft.$present = draft.$future.shift()!;
        draft.$present.executing.clear();
        draft.$error = null;
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
      try {
        let newPresent = reducer(state.$present, action);
        return produce(state, draft => {
          if (newPresent === state.$present) {
            return;
          }

          // if an error was set (but not thrown), move it up into $error
          if (newPresent.error) {
            const { error, ...newPresentWithoutError } = newPresent;
            draft.$error = error;
            newPresent = newPresentWithoutError;
          }
  
          // don't store these actions in the undo history
          if (action.type === ActionKind.Cleanup
            || action.type === ActionKind.DetectCompletion
            || action.type === ActionKind.Raise) {
            draft.$present = castDraft(newPresent);
            return;
          }

          draft.$past.unshift(draft.$present);
          draft.$present = castDraft(newPresent);
          draft.$future = [];
        });
      } catch (error) {
        if (error instanceof GameError) {
          return { ...state, $error: error };
        } else {
          throw error;
        }
      }
    }
    }
  };
}
