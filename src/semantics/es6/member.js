export default {
  member: {
      kind: "expression",
      fields: [],
      subexpressions: ["array", "index"],
      projection: {
        type: "hbox",
        color: "red",
        subexpScale: 0.9,
        children:[
          {
            type: "default",
            shape:  "none",
            fields: ["array"],
            subexpScale: 1.0,
          },
          {
            type: "default",
            shape: "none",
            fields: ["'['","index", "']'"],
            subexpScale: 1.0
          },
        ],
      },
      validateStep: (semant, state, expr) =>{
        const nodes = state.get("nodes");
        const arrayId = expr.get("array");
        const indexId = expr.get("index");

        const array = nodes.get(arrayId);
        const index = nodes.get(indexId);

        if(array.get("type") !== "array") {
          return [arrayId, `This needs to be an array!`];
        }

        if(index.get("type") !== "number") {
          return [indexId, `This needs to be a number!`];
        }
        if(index.get("value") >= array.get("length")) {
          return [indexId, `Index cannnot be greater than the length!`];
        }

        return null;
      },
      smallStep: (semant,stage,state,expr) => {
        const nodes = state.get("nodes");

        const array = nodes.get(expr.get("array"));
        const index = nodes.get(expr.get("index"));
        const i = index.get("value");
        const res = nodes.get((array.get(`elem${i}`)));
        return res;
      },
  }
};
