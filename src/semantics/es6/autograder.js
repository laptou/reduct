import * as core from "../core";
import { builtins, genericValidate } from "./builtins";
import * as immutable from "immutable";
import * as action from "../../reducer/action";

export default {
  autograder: {
      kind: "expression",
      fields: ["levelId"],
      subexpressions: ["result"],
      projection: {
        type: "default",
        shape: "[]",
        color: "yellow",
        fields: ["result","'ORACLE'"],
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

        return null;
      },
      smallStep: (semant,stage,state,expr) => {

        const nodes = state.get("nodes");
        const k = stage.numTests;
        //console.log("numTests: " + stage.numTests);
        const max = stage.input.length;
        const allInputs = stage.input.slice();
        const allOutputs = stage.output.slice();
        const fId = expr.get("result");
        //const f = semant.hydrate(nodes, nodes.get(expr.get("result")));
        let finalExpr = [];
        let finalOutput = "[";

        for(let i=1;i<=k;i++) {

          /** Cloning the "result" function [f] as it we want it to
          * be a new node. We need a new node so that it acts separatley
          * then the previous node.
          */
          const [cloned_f, added_f] = semant.clone(fId, nodes);
          const allAdded_f = added_f.concat([ cloned_f ]);

          const tempNodes = state.get("nodes").withMutations((nodes) => {
            for(const node of allAdded_f) {
              nodes.set(node.get("id"), node);
            }
          });

          /** Hydrate the function so as to make a new node out of it
          */
          const f = semant.hydrate(tempNodes, cloned_f);

          /** Get the input
          */
          const r = Math.floor(Math.random() * (+max - i));
          const s = allInputs[r];
          /** Each input may have several arguments -example:
          * 2 argument function, etc.
          */
          const args = s.match(/\d+/g);

          /** Generate the result expression and push it in the list
          * of all input expressions created.
          */
          let result = semant.apply(f, semant.parser.parse(args[0],[]));
          for (const a of args.slice(1)){
            result = semant.apply(result, semant.parser.parse(a,[]));
          }

          finalExpr.push(result);

          /**Now generate expected output
          */
          finalOutput = finalOutput  + allOutputs[r];

          if(i != k) {
            finalOutput = finalOutput + ",";
          }

          /** Generate new test cases from left over elements.
          */
          allInputs.splice(r, 1);
          allOutputs.splice(r, 1);
          //console.log("auto_res:");
          //console.log(JSON.stringify(result));
          //console.log("finalExpr: ");
          //console.log(JSON.stringify(finalExpr.length));
        }
        /**
        * Display expected output in the place of goal.
        */
        finalOutput = finalOutput + "]";
        const o = semant.parser.parse(finalOutput,[]);
        const addedNodes = semant.flatten(o).map(immutable.Map);

        const tempNodes = state.get("nodes").withMutations((nodes) => {
            for (const node of addedNodes) {
                nodes.set(node.get("id"), node);
            }
        });

        for(const nn of addedNodes) {
          stage.views[nn.get("id")] = stage.semantics.project(stage,tempNodes,nn);
        }

       stage.store.dispatch(action.changeGoal(addedNodes[0].get("id"), addedNodes));


        /** finally, display test expressions in an array
        */
        const resultExpr =  semant.array(k,...finalExpr);
        //console.log(JSON.stringify(resultExpr));
        return core.makeResult(expr, resultExpr, semant);

      },
  }
};
