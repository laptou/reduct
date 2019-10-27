export default {
    letExpr: {
        kind: "expression",
        fields: [],
        subexpressions: ["variable", "e1", "e2"],
        projection: {
            type: "default",
            shape: "()",
            color: "#3dfff3",
            fields: ["'let'", "variable", "'='", "e1", "'in'", "e2"],
            subexpScale: 0.9,
            padding: {
                left: 25,
                right: 25,
                inner: 10,
                top: 0,
                bottom: 0,
            },
        },
        validateStep: (semant, state, expr) =>{
            const nodes = state.get("nodes");
            const valueId = expr.get("value");
            const valueExpr = nodes.get(valueId);

            if(valueExpr.get("type") !== "bool") {
                return [valueId, `! can only NOT booleans`];
            }

            return null;
        },
        smallStep: (semant,stage,state,expr) => {
            const nodes = state.get("nodes");
            return semant.bool(!nodes.get(expr.get("value")).get("value"));
        },
    }
};
