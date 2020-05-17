import * as immutable from 'immutable';

import { ActionKind } from './action';

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
    const initialState = immutable.Map({
        $present: reducer(undefined, {}),
        $past: immutable.Stack(),
        $future: immutable.Stack(),
        // "Extra" state (used to store node positions)
        $presentExtra: {},
        $pastExtra: immutable.Stack(),
        $futureExtra: immutable.Stack()
    });

    return function(state = initialState, action) {
        const $present = state.get('$present');
        const $past = state.get('$past');
        const $future = state.get('$future');

        // Additional state to preserve that isn't part of Redux.
        const $presentExtra = state.get('$presentExtra');
        const $pastExtra = state.get('$pastExtra');
        const $futureExtra = state.get('$futureExtra');

        switch (action.type) {
        case ActionKind.StartLevel: {
            return initialState.withMutations((is) => {
                is.set('$present', reducer($present, action));
                is.set('$presentExtra', {});
            });
        }
        case ActionKind.Undo: {
            if ($past.isEmpty()) return state;

            const newState = state.withMutations((map) => {
                map
                    .set('$past', $past.shift())
                    .set('$present', $past.peek())
                    .set('$future', $future.unshift($present))
                    .set('$pastExtra', $pastExtra.shift())
                    .set('$presentExtra', $pastExtra.peek())
                    .set('$futureExtra', $futureExtra.unshift($presentExtra));
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
            const newPresent = reducer($present, action);
            if (newPresent === $present) {
                return state;
            }
            if (options.actionFilter && options.actionFilter(action)) {
                return state.set('$present', newPresent);
            }

            const extraState = options.extraState($present, newPresent);
            return state.withMutations((map) => {
                map
                    .set('$past', $past.unshift($present))
                    .set('$present', newPresent)
                    .set('$future', immutable.Stack())
                    .set('$pastExtra', $pastExtra.unshift($presentExtra))
                    .set('$presentExtra', extraState)
                    .set('$futureExtra', immutable.Stack());
            });
        }
        }
    };
}
