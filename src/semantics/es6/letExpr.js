export default {
    // let expressions: let variable = e1 in e2
    // syntax for defining this node: variable = e1 in e2
    letExpr: {
        kind: "expression",
        fields: ["variable"],
        subexpressions: ["e1", "e2"],
        projection: {
            type: "hbox",
            shape: "()",
            subexpScale: 1.0,
            color: "salmon",
            padding: {
                top: 10,
                left: 15,
                inner: 5,
                right: 10,
                bottom: 10,
            },
            children: [
                {
                    type: "text",
                    text: "let ",
                },
                {
                    type: "text",
                    text: "{variable}",
                },
                {
                    type: "text",
                    text: "="
                },
                {
                    type: "default",
                    shape: "none",
                    fields: ["e1"],
                    subexpScale: 1.0,
                },
                {
                    type: "text",
                    text: "in"
                },
                {
                    type: "default",
                    shape: "none",
                    fields: ["e2"],
                    subexpScale: 1.0,
                },
            ]
        },
        validateStep: (semant, state, expr) =>{
            const callee = state.getIn([ "nodes", expr.get("e2") ]);
            const kind = semant.kind(state, callee);
            if (kind === "value" &&
                callee.get("type") !== "lambda" &&
                callee.get("type") !== "reference") {
                return [ expr.get("callee"), "We can only apply functions!" ];
            }
            return null;
        },
        smallStep: (semant,stage,state,expr) => {
            const [ topNodeId, newNodeIds, addedNodes ] = semant.interpreter.betaReduce(
                stage,
                state, expr.get("e2"),
                [ expr.get("e1") ]
            );

            return [ expr.get("id"), newNodeIds, addedNodes ];

        },
    }
};
