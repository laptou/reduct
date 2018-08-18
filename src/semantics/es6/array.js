import * as core from "../core";
import * as gfx from "../../gfx/core";
import * as animate from "../../gfx/animate";
import * as immutable from "immutable";

// Returns the names of the subexpressions of an array: elem0, elem1, etc.
// Requires: arr is a mutable array node or an immutable map for an array node
function arraySubexprs(module, arr) {
    const n = arr.elements ? arr.elements.length : arr.get("elements").length
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
            subexpScale: 0.9,
            color: "#bed"
        },
        complete: true
    },
    arrayvalue: {
        kind: "value",
        type: "arrayvalue",
        fields: ["elements"],
        subexpressions: arraySubexprs,
        projection: {
            type: "default",
            fields: arrayFields,
            subexpScale: 0.9,
            color: "#bed"
        },
        complete: true
    }
}
