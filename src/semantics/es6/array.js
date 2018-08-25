import * as core from "../core";
import * as gfx from "../../gfx/core";
import * as animate from "../../gfx/animate";
import * as immutable from "immutable";

// Returns the names of the subexpressions of an array: elem0, elem1, etc.
// Requires: arr is a hydrated array node or an immutable map for an array node
function arraySubexprs(module, arr) {
    const n = typeof arr.length == "number"
              ? arr.length
              : arr.get("length");
    const result = [];
    for (let i = 0; i < n; i++) {
        result.push(`elem${i}`);
    }
    return result;
}

// Returns the fields that are supposed to be displayed by
// the projection of an array
function arrayDisplayParts(expr) {
    const a = arraySubexprs(null, immutable.Map(expr));
    const result = [];
    let first = true;
    result.push("'['");
    for (const e of a) {
        if (!first) result.push("','");
        first = false;
        result.push(e);
    }
    result.push("']'");
    return result;
}

export default {
    array: {
        kind: (arr, semant, state) => {
            const nodes = state.get("nodes");
            for (const field of semant.subexpressions(arr)) {
                const subexp = nodes.get(arr.get(field))
                if (semant.kind(state, subexp) == "expression" ||
                    subexp.get("type") == "missing") {
                    return "expression";
                }
            }
            return "value";
        },
        type: "array",
        fields: ["length"],
        subexpressions: arraySubexprs,
        projection: {
            type: "default",
            fields: arrayDisplayParts,
            subexpScale: 0.9,
            color: "#bed"
        },
        complete: true
    },
}
