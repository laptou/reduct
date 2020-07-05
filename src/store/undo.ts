import { castDraft, produce } from 'immer';
import type { Reducer } from 'redux';
import { ActionKind, ReductAction } from './action';
import { NodeError as GameError } from './errors';

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
export function undoable<S>(reducer: Reducer<S>) {
  const initialState: UndoableState<S> = {
    $present: reducer(),
    $past: [] as S[],
    $future: [] as S[],
    $error: null
  };

  return function(state: UndoableState<S> = initialState, action?: ReductAction): UndoableState<S> {
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
        draft.$error = null;
      });

      return newState;
    }

    case ActionKind.Redo: {
      if (state.$future.length === 0) return state;

      const newState = produce(state, draft => {
        draft.$past.unshift(castDraft(state.$present));
        draft.$present = draft.$future.shift()!;
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
        const newPresent = reducer(state.$present, action);
        return produce(state, draft => {
        // use state.$present, do not allow draft objects to escape from this function

          if (newPresent === state.$present) {
            return;
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
