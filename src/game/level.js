import * as action from "../reducer/action";

export function startLevel(description, parse, store, stage) {
    const macros = Object.assign({}, description.macros);
    for (let macroName of Object.keys(macros)) {
        // Needs to be a thunk in order to allocate new ID each time
        let macro = macros[macroName];
        macros[macroName] = () => parse(macro, {});
    }

    store.dispatch(action.startLevel(
        stage,
        description.goal.map((str) => parse(str, macros)),
        description.board.map((str) => parse(str, macros)),
        description.toolbox.map((str) => parse(str, macros))
    ));
}

export function checkVictory(state, semantics) {
    const board = state.get("board");
    const goal = state.get("goal");

    if (board.size !== goal.size) {
        return false;
    }

    const used = {};
    let success = true;
    goal.forEach((nodeId) => {
        let found = false;
        board.forEach((candidateId, idx) => {
            if (used[idx]) return;
            if (semantics.equal(nodeId, candidateId, state)) {
                used[idx] = true;
                found = true;
                return false;
            }
        });
        if (!found) {
            success = false;
            return false;
        }
    });

    return success;
}