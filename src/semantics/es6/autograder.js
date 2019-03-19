import * as core from "../core";
import { builtins, genericValidate } from "./builtins";
import * as immutable from "immutable";
import * as action from "../../reducer/action";
import * as gfxCore from "../../gfx/core";


export default {
  autograder: {
      kind: "expression",
      fields: ["levelId"],
      subexpressions: ["result"],
      projection: {
        type: "hbox",
        color: "#e95888",
        subexpScale: 0.9,
        children:[
          {
            type: "default",
            shape:  "none",
            fields: ["result"],
            subexpScale: 1.0,
          },
          {
            type: "sprite",
            image: "ship-large",
            scale: 0.1,
            subexpScale: 1.0
          },
        ],
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
        let finalOutput = [];

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
          finalOutput.push(semant.parser.parse(allOutputs[r]));

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
        let addedNodes = [];
        let newNodeIds = [];
        for(let j =0;j<finalOutput.length;j++){
        const o = finalOutput[j];
        addedNodes.push(...semant.flatten(o).map(immutable.Map));
        }
        const tempNodes = state.get("nodes").withMutations((nodes) => {
            for (const node of addedNodes) {
                nodes.set(node.get("id"), node);
            }
        });

        for(const nn of addedNodes) {
          newNodeIds.push(nn.get("id"));
          stage.views[nn.get("id")] = stage.semantics.project(stage,tempNodes,nn);
        }

       stage.store.dispatch(action.changeGoal(newNodeIds, addedNodes));



       // Assumes clicks always dispatched to top-level node
       let origPos = {
           x: gfxCore.centerPos(stage.getView(expr.get("id"))).x,
           y: gfxCore.centerPos(stage.getView(expr.get("id"))).y,
       };


       for(let i=0;i<k;i++){
        const f1 = finalExpr[i];
        const addedTarget = semant.flatten(f1).map(immutable.Map);

        const tmp2 = state.get("nodes").withMutations((nodes) => {
          for (const node of addedTarget) {
            nodes.set(node.get("id"), node);
          }
        })

        let newNodeIds = [];
        for(const aa of addedTarget) {
          newNodeIds.push(aa.get("id"));
          stage.views[aa.get("id")] = stage.semantics.project(stage,tmp2,aa);
        }


        stage.views[newNodeIds[0]].anchor.x = 0.5;
        stage.views[newNodeIds[0]].anchor.y = 0.5;
        stage.views[newNodeIds[0]].pos.x = origPos.x;
        stage.views[newNodeIds[0]].pos.y = origPos.y - 45*i;

        //console.log("Added Target: " + JSON.stringify(addedTarget));
        if(i == 0){
          stage.store.dispatch(action.smallStep(expr.get("id"),[newNodeIds[0]], addedTarget));
        }
        else {
          stage.store.dispatch(action.addBoardItem([newNodeIds[0]], addedTarget));
        }
      }
        return null;

        /** finally, display test expressions in an array
        */
        //const f1 = semant.vtuple(...finalExpr);
        /*console.log("ssssssssssssssssss");
        const f1 = semant.lambda(semant.lambdaArg("x"),semant.vtuple([...finalExpr]));
        //console.log(JSON.stringify(f1));
        const argExpr =semant.number(1);
        const addedArg = semant.flatten(argExpr).map(immutable.Map);
        const addedTarget = semant.flatten(f1).map(immutable.Map);
        //console.log("arg Expr:" + JSON.stringify(addedTarget));

        const tempNodes2 = state.get("nodes").withMutations((nodes) => {
          for(const node of addedArg) {
            nodes.set(node.get("id"), node);
          }
          for(const node of addedTarget) {
            nodes.set(node.get("id"), node);
          }
        });

        const newState = state.set("nodes", tempNodes2);
        const [topNode, subExpr, newNodes] = semant.interpreter.betaReduce(stage, newState, addedTarget[0].get("id"), [addedArg[0].get("id")]);
        console.log("r from betareduce:" + JSON.stringify([topNode, subExpr, newNodes]));
        //console.log(JSON.stringify(tempNodes2));
        //const resultExpr =  semant.array(k,...finalExpr);

        for(const nn of newNodes){
          stage.views[nn.get("id")] = stage.semantics.project(stage,tempNodes2,nn);
        }

        return [topNode, subExpr, newNodes];*/
        //return f1;
        //console.log(JSON.stringify(resultExpr));
        //return core.makeResult(expr, resultExpr, semant);

      },
  }
};
