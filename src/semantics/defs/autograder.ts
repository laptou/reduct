import * as fx from '../../gfx/fx';
import * as core from '../core';
import * as action from '../../store/action/game';
import * as gfxCore from '../../gfx/core';
import * as level from '../../game/level';
import { BaseNode, NodeId } from '..';

import type { NodeDef } from './base';

export interface AutograderNode extends BaseNode {
  type: 'autograder';
  alienName: any;
  goalId: any;
  color: any;

  result: NodeId;
}

export const autograder: NodeDef<AutograderNode> = {
  kind: 'expression',
  fields: ['alienName', 'goalId', 'color'],
  subexpressions: ['result'],
  projection: {
    type: 'hbox',
    color: (expr) => expr.color,
    subexpScale: 0.9,
    cols: [
      {
        type: 'default',
        shape: 'none',
        fields: ['result'],
        subexpScale: 1.0,
      },
      {
        type: 'sprite',
        fields: ['goalId'],
        image: (expr) => expr.alienName,
        scale: 0.4,
        subexpScale: 1.0,
      },
    ],
  },
  validateStep: (semant, state, expr) => null,
  smallStep: (semant, stage, state, expr) => {
    const nodes = state.nodes;
    const max_goals = 5;

    const allInputs = stage.input.slice();
    const allOutputs = stage.output.slice();

    const fId = expr.result;
    const fExpr = state.nodes.get(fId);
    const f_type = fExpr.type;
    const goalId = expr.goalId;
    const color = expr.color;

    /* Function to convert game definition to JS definition.
        */
    function extractAll() {
      let funFinal = '';
      for (const refStr of state.globals) {
        const defId = state.getIn(['globals', refStr[0]]);
        const defNode = nodes.get(defId);
        const defStr = semant.parser.unparse(semant.hydrate(nodes, defNode));
        const funName = defStr.match(/function ([a-zA-Z]+)/)[1];
        const funHalfBody = defStr.match(/>([^>]+)$/)[1];
        const funBody = `${'{ t--; if(t < 0) return -100000; return '}${funHalfBody}`;
        const funArgsRegx = /\(([a-zA-Z]+)\) =>/g;
        let funArgs = '';
        var match;
        while (match = funArgsRegx.exec(defStr)) {
          funArgs += match[1];
          funArgs += ',';
        }
        funArgs = funArgs.slice(0, -1);
        funFinal += `function ${funName}(${funArgs}) ${funBody}\n`;
      }
      return funFinal;
    }


    /**
        * Generate Input/Output ------------------------------------------------
        */
    if (f_type == 'reference' || f_type == 'lambda') {
      const finalExpr = [];
      const finalOutput = [];


      /** Cloning the "result" function [f] as it we want it to
        * be a new node. We need a new node so that it acts separatley
        * then the previous node.
        */
      const [clonedFn, addedFn] = semant.clone(fId, nodes);
      const allAddedFns = addedFn.concat([clonedFn]);

      const tempFuncNodes = state.nodes.withMutations((nodes) => {
        for (const node of allAddedFns) {
          nodes.set(node.id, node);
        }
      });

      /** Hydrate the function so as to make a new node out of it
        */
      const f = semant.hydrate(tempFuncNodes, clonedFn);

      // for the "red" autograder
      if (goalId == 0) {
        // Generate function definition string
        const funName = semant.parser.unparse(f);
        let funFinal = extractAll();

        // setting the timer
        funFinal = `let t = 100;\n${funFinal}`;

        // Find an adversarial pair.
        let advIndex = null;
        for (let i = 0; i < allInputs.length; i++) {
          let out = null;


          if (allInputs[i].includes(',')) {
            // console.log(funFinal + funName + allInputs[i]);
            // console.log(eval(funFinal + funName + allInputs[i]));
            out = eval(funFinal + funName + allInputs[i]);
          } else {
            // console.log(funFinal + funName + "(" + allInputs[i] + ")");
            // console.log(eval(funFinal + funName + "(" + allInputs[i] + ")"));
            out = eval(`${funFinal + funName}(${allInputs[i]})`);
          }
          if (out != allOutputs[i]) {
            if (out < 0) {
              fx.error(this, stage.views[fExpr.id]);
              stage.feedback.update('#000', ['The given function is non-terminating']);
              return null;
            }

            advIndex = i;
            break;
          }
        }

        // Update the input and output arrays so that the
        // adversarial pair is at index 0.
        if (advIndex != null) {
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
      const s = allInputs[goalId];

      /** Each input may have several arguments -example:
        * 2 argument function, etc.
        * NOTE - currently just works with numbers
        */
      const args = s.match(/[a-zA-Z0-9]+/g);

      /** Generate the result expression and push it in the list
        * of all input expressions created.
        */
      let result = semant.apply(f, semant.parser.parse(args[0], level.MACROS));
      for (const a of args.slice(1)) {
        result = semant.apply(result, semant.parser.parse(a, level.MACROS));
      }

      finalExpr.push(semant.autograder(expr.alienName, goalId, color, result));

      /** Now generate expected output
        */
      finalOutput.push(semant.unsol(color, semant.parser.parse(allOutputs[goalId], level.MACROS)));


      /**
        * Display expected output in the place of goal--------------------------.
        */
      const addedOutput = [];
      const newOutputIds = [];
      const o = finalOutput[0];
      addedOutput.push(...semant.flatten(o).map(immutable.Map));

      const tempOutputNodes = state.nodes.withMutations((nodes) => {
        for (const node of addedOutput) {
          nodes.set(node.id, node);
        }
      });

      for (const nn of addedOutput) {
        newOutputIds.push(nn.id);
        stage.views[nn.id] = stage.semantics.project(stage, tempOutputNodes, nn);
      }

      stage.store.dispatch(action.changeGoal(goalId, [newOutputIds[0]], addedOutput));

      /* Displaying input------------------------------------------------------.
        */
      // Assumes clicks always dispatched to top-level node
      const origPos = {
        x: gfxCore.centerPos(stage.getView(expr.id)).x,
        y: gfxCore.centerPos(stage.getView(expr.id)).y,
      };


      const newInputIds = [];
      const f1 = finalExpr[0];
      const addedTarget = semant.flatten(f1).map(immutable.Map);
      const tempInputNodes = state.nodes.withMutations((nodes) => {
        for (const node of addedTarget) {
          nodes.set(node.id, node);
        }
      });

      for (const aa of addedTarget) {
        newInputIds.push(aa.id);
        stage.views[aa.id] = stage.semantics.project(stage, tempInputNodes, aa);
      }


      stage.views[newInputIds[0]].anchor.x = 0.5;
      stage.views[newInputIds[0]].anchor.y = 0.5;
      stage.views[newInputIds[0]].pos.x = origPos.x;
      stage.views[newInputIds[0]].pos.y = origPos.y;

      stage.store.dispatch(action.smallStep(expr.id, [newInputIds[0]], addedTarget));
    } else {
      const finalGoal = semant.parser.parse(allOutputs[goalId], level.MACROS);
      // console.log("finalGoal: " + JSON.stringify(finalGoal.value));
      // console.log("givenGoal: " + JSON.stringify(fExpr.get("value")));
      if (finalGoal.value !== fExpr.value) {
        fx.error(this, stage.views[expr.id]);
        stage.feedback.update('#000', [`This isn't the output I want! I want ${finalGoal.value}`]);
        return null;
      }


      /* Form new goal - success.
         */
      const addedGoalNodes = [];
      const newGoalIds = [];
      addedGoalNodes.push(...semant.flatten(finalGoal).map(immutable.Map));

      const tempGoalNodes = state.nodes.withMutations((nodes) => {
        for (const node of addedGoalNodes) {
          nodes.set(node.id, node);
        }
      });

      for (const nn of addedGoalNodes) {
        newGoalIds.push(nn.id);
        stage.views[nn.id] = stage.semantics.project(stage, tempGoalNodes, nn);
      }

      stage.store.dispatch(action.changeGoal(goalId, [newGoalIds[0]], addedGoalNodes));

      /* Return the final expression.
        */
      const [clonedFinal, addedFinal] = semant.clone(finalGoal.id, tempGoalNodes);
      const allAddedFinal = addedFinal.concat([clonedFinal]);

      const tempFinalNodes = state.nodes.withMutations((nodes) => {
        for (const node of allAddedFinal) {
          nodes.set(node.id, node);
        }
      });

      for (const node of allAddedFinal) {
        stage.views[node.id] = stage.semantics.project(stage, tempFinalNodes, node);
      }

      return core.makeResult(expr, clonedFinal, semant);
    }
  },
};
