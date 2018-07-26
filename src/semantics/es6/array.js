import * as core from "../core";
import * as gfx from "../../gfx/core";
import * as animate from "../../gfx/animate";
import * as immutable from "immutable";

// Returns the names of the subexpressions of an array: elem0, elem1, etc.
function arraySubexprs(module, map) {
    const n = map.get("elements").length
    const result = []
    for (let i = 0; i < n; i++) {
        result.push(`elem${i}`);
    }
    return result;
}

// Returns the fields that are supposed to be displayed by
// the projection of an array
function arrayFields(expr) {
    const a = arraySubexprs(null, immutable.Map(expr));
    const result = [];
    let first = true;
    for (const e of a) {
        result.push(first ? "'['" : "','");
        first = false;
        result.push(e);
    }
    result.push("']'");
    return result
}

export default {
    array: {
        kind: "expression", // transform.kind computes this dynamically
        type: "array",
        fields: ["elements"],
        subexpressions: arraySubexprs,
        projection: {
            type: "default",
            fields: arrayFields,
            subexpScale: 1.0,
            color: "#bed"
        }
    }
}
