import { castDraft, produce } from 'immer';
import { Reducer } from 'redux';

import {
  ActionKind, ReductAction, UndoAction, RedoAction,
} from '../action/game';
import { GameError } from '../errors';
import { GameState } from '../state';

import type { gameReducer } from './game';


/** Undo the last action. */
export function undo(): UndoAction {
  return {
    type: ActionKind.Undo,
  };
}

/** Redo the last undone action. */
export function redo(): RedoAction {
  return {
    type: ActionKind.Redo,
  };
}

export interface UndoableGameState
{
  $present: GameState;
  $past: Array<GameState>;
  $future: Array<GameState>;
  $error: GameError | null;
}

/**
 * Given a game reducer, return a reducer that supports undo/redo and handles game
 * errors.
 */
export function undoableReducer(
  reducer: typeof gameReducer
): Reducer<UndoableGameState, ReductAction> {
  const initialState: UndoableGameState = {
    $present: reducer(),
    $past: [],
    $future: [],
    $error: null,
  };

  return (state = initialState, action?) => {
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
        $error: null,
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
            || action.type === ActionKind.CreateDocNodes
            || action.type === ActionKind.DeleteDocNodes
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
          return {
            ...state,
            $error: error,
          };
        } else {
          throw error;
        }
      }
    }
    }
  };
}
