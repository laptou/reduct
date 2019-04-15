import * as progression from "../../game/progression";
import * as core from "../core";
import { builtins, genericValidate } from "./builtins";
import * as immutable from "immutable";
import * as action from "../../reducer/action";
import * as gfxCore from "../../gfx/core";
import * as animate from "../../gfx/animate";
import Loader from "../../loader";

export default {

  autograder: {
      kind: "expression",
      fields: ["alienName","goalId","color"],
      subexpressions: ["result"],
      projection: {
        type:"hbox",
        color: (expr) => expr.get("color"),
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
            fields: ["goalId"],
            image: (expr) => expr.get("alienName"),
            scale: 0.4,
            subexpScale: 1.0
          },
        ],
      },
      validateStep: (semant, state, expr) =>{

        return null;
      },
      smallStep: (semant,stage,state,expr) => {

        const nodes = state.get("nodes");
        const max_goals = 5;

        //const k = 1;
        //console.log("numTests: " + stage.numTests);
        //const max = stage.input.length;

        const allInputs = stage.input.slice();
        const allOutputs = stage.output.slice();

        const fId = expr.get("result");
        const fExpr = state.get("nodes").get(fId);
        const f_type = fExpr.get("type");
        let goal_id = expr.get("goalId");
        const color = expr.get("color");
        //console.log("f_type: " + JSON.stringify(f_type));


        /**
        * Generate Input/Output ------------------------------------------------
        */
        if(f_type == "reference"){
        //const f = semant.hydrate(nodes, nodes.get(expr.get("result")));
        let finalExpr = [];
        let finalOutput = [];

        //for(let i=1;i<=k;i++) {

        /** Cloning the "result" function [f] as it we want it to
        * be a new node. We need a new node so that it acts separatley
        * then the previous node.
        */
        const [cloned_f, added_f] = semant.clone(fId, nodes);
        const allAdded_f = added_f.concat([ cloned_f ]);

        const tempFuncNodes = state.get("nodes").withMutations((nodes) => {
          for(const node of allAdded_f) {
            nodes.set(node.get("id"), node);
          }
        });

        /** Hydrate the function so as to make a new node out of it
        */

        const f = semant.hydrate(tempFuncNodes, cloned_f);

        if(goal_id == 0){

          //Generate function definition string
          const refStr = semant.parser.unparse(f);
          const defId = state.getIn(["globals", refStr]);
          const defNode = nodes.get(defId);
          const defStr = semant.parser.unparse(semant.hydrate(nodes, defNode));
          const funName = defStr.match(/function (?<name>[a-zA-Z]+)/).groups.name;
          const funHalfBody = defStr.match(/>(?<body>[^>]+)$/).groups.body;
          const funBody = "{ " + "return " + funHalfBody;
          const funArgsRegx = /\(([a-zA-Z]+)\) =>/g;
          let funArgs = "";
          var match;
          while (match = funArgsRegx.exec(defStr)) {
              funArgs += match[1];
              funArgs += ",";
          }
          funArgs = funArgs.slice(0,-1);
          let funFinal = "function " + funName + "(" + funArgs + ") " + funBody;

          //Find an adversarial pair.
          let advIndex = null;
          for(let i = 0;i<allInputs.length;i++){
            let out = null;
            if(allInputs[i].includes(",")){
               out = eval(funFinal + funName + allInputs[i]);
            }
            else {
              out = eval(funFinal + funName + "(" + allInputs[i] + ")");
            }
            if(out != allOutputs[i]){
              advIndex = i;
              break;
            }
          }

          //Update the input and output arrays so that the
          // adversarial pair is at index 0.
          if(advIndex != null){
            let tmp = allOutputs[0];
            allOutputs[0] = allOutputs[advIndex];
            allOutputs[advIndex] = tmp;
            stage.output = allOutputs;

            tmp = allInputs[0];
            allInputs[0] = allInputs[advIndex];
            allInputs[advIndex] = tmp;
            stage.input = allInputs;
          }
        }

        /** Get the input
        */
        //const r = Math.floor(Math.random() * (+max - i));
        const s = allInputs[goal_id];

        /** Each input may have several arguments -example:
        * 2 argument function, etc.
        * NOTE - currently just works with numbers
        */
        const args = s.match(/\d+/g);

        /** Generate the result expression and push it in the list
        * of all input expressions created.
        */
        let result = semant.apply(f, semant.parser.parse(args[0],[]));
        for (const a of args.slice(1)){
          result = semant.apply(result, semant.parser.parse(a,[]));
        }

        finalExpr.push(semant.autograder(expr.get("alienName"),goal_id,color,result));
        //console.log("Inoput generated");

        /**Now generate expected output

        if(goal_id % max_goals == 0){
          finalOutput.push(semant.unsol("red", semant.parser.parse(allOutputs[goal_id])));
        }*/
        finalOutput.push(semant.unsol(color, semant.parser.parse(allOutputs[goal_id],[])));



        /** Generate new test cases from left over elements.
        */
        //allInputs.splice(r, 1);
        //allOutputs.splice(r, 1);
        //console.log("auto_res:");
        //console.log(JSON.stringify(result));
        //console.log("finalExpr: ");
        //console.log(JSON.stringify(finalExpr.length));
        //}
        /**
        * Display expected output in the place of goal--------------------------.
        */
        let addedOutput = [];
        let newOutputIds = [];
        //for(let j =0;j<finalOutput.length;j++){
        const o = finalOutput[0];
        addedOutput.push(...semant.flatten(o).map(immutable.Map));
        //}

        const tempOutputNodes = state.get("nodes").withMutations((nodes) => {
            for (const node of addedOutput) {
                nodes.set(node.get("id"), node);
            }
        });

        for(const nn of addedOutput) {
          newOutputIds.push(nn.get("id"));
          stage.views[nn.get("id")] = stage.semantics.project(stage,tempOutputNodes,nn);
        }

       stage.store.dispatch(action.changeGoal(goal_id, [newOutputIds[0]], addedOutput));
       //console.log("newthing: " + JSON.stringify(addedOutput));

       /* Displaying input------------------------------------------------------.
        */
       // Assumes clicks always dispatched to top-level node
       let origPos = {
           x: gfxCore.centerPos(stage.getView(expr.get("id"))).x,
           y: gfxCore.centerPos(stage.getView(expr.get("id"))).y,
       };


       let newInputIds = [];
       //for(let i=0;i<k;i++){
        const f1 = finalExpr[0];
        //f1.goal = 1;
        const addedTarget = semant.flatten(f1).map(immutable.Map);

        //console.log("newthing 2: " + JSON.stringify(addedTarget));
        const tempInputNodes = state.get("nodes").withMutations((nodes) => {
          for (const node of addedTarget) {
            nodes.set(node.get("id"), node);
          }
        });

        for(const aa of addedTarget) {
          newInputIds.push(aa.get("id"));
          stage.views[aa.get("id")] = stage.semantics.project(stage,tempInputNodes,aa);
        }


        stage.views[newInputIds[0]].anchor.x = 0.5;
        stage.views[newInputIds[0]].anchor.y = 0.5;
        stage.views[newInputIds[0]].pos.x = origPos.x;
        stage.views[newInputIds[0]].pos.y = origPos.y;

        //console.log("Added Target: " + JSON.stringify(addedTarget));
        //if(i == 0){
        stage.store.dispatch(action.smallStep(expr.get("id"),[newInputIds[0]], addedTarget));
        //}
      //}
    }
    else{
      const finalGoal = semant.parser.parse(allOutputs[goal_id]);
      //console.log("finalGoal: " + JSON.stringify(finalGoal.value));
      //console.log("givenGoal: " + JSON.stringify(fExpr.get("value")));
      if(finalGoal.value !== fExpr.get("value")){
        animate.fx.error(this, stage.views[fExpr.get("id")]);
        stage.feedback.update("#000", [ `This isn't the output I want! I want `+finalGoal.value ]);
        return null;
      }

      else {
        /* Form new goal - success.
         */
        let addedGoalNodes = [];
        let newGoalIds = [];
        addedGoalNodes.push(...semant.flatten(finalGoal).map(immutable.Map));

        const tempGoalNodes = state.get("nodes").withMutations((nodes) => {
            for (const node of addedGoalNodes) {
                nodes.set(node.get("id"), node);
            }
        });

        for(const nn of addedGoalNodes) {
          newGoalIds.push(nn.get("id"));
          stage.views[nn.get("id")] = stage.semantics.project(stage,tempGoalNodes,nn);
        }

       stage.store.dispatch(action.changeGoal(goal_id, [newGoalIds[0]], addedGoalNodes));

       /* Return the final expression.
        */
       //console.log("final_id:"+ finalGoal.id);
       const [cloned_fin, added_fin] = semant.clone(finalGoal.id, tempGoalNodes);
       //console.log("cloned_fin:" + cloned_fin);
       const allAdded_fin = added_fin.concat([ cloned_fin ]);

       const tempFinalNodes= state.get("nodes").withMutations((nodes) => {
         for(const node of allAdded_fin) {
           nodes.set(node.get("id"), node);
         }
       });

       for (const node of allAdded_fin) {
          stage.views[node.get("id")] = stage.semantics.project(stage, tempFinalNodes, node);
       }

      return core.makeResult(expr, cloned_fin, semant);
      }
      //stage.store.dispatch(action.changeGoal(goal_id, [newNodeIds[1]], addedNodes));
      //return state.get("nodes").get(fId);
    }


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
