import { NodeId, NodeMap, ReductNode } from '@/semantics';
import Loader from '@/loader';
import { parseProgram, MacroMap } from '@/syntax/es6';
import { createReferenceNode, createBuiltInReferenceNode } from '@/semantics/util';
import { flatten } from '@/util/nodes';
import { builtins } from '@/semantics/defs/builtins';

export enum ActionKind {
  UseToolbox = 'use-toolbox',
  Raise = 'raise',
  Detach = 'detach',
  Unfold = 'unfold',
  BetaReduce = 'beta-reduce',
  Victory = 'victory',
  Fade = 'fade',
  Unfade = 'unfade',
  AddToolboxItem = 'add-toolbox-item',
  AddBoardItem = 'add-board-item',
  AddGoalItem = 'add-goal-item',
  ChangeGoal = 'change-goal',
  Hover = 'hover',

  StartLevel = 'start-level',

  MoveNodeToBoard = 'move-node-to-stage',
  MoveNodeToSlot = 'move-node-to-slot',
  MoveNodeToDefs = 'move-node-to-defs',

  Cleanup = 'cleanup',
  Eval = 'eval',
  EvalLambda = 'eval-lambda',
  EvalOperator = 'eval-operator',
  EvalConditional = 'eval-conditional',
  EvalNot = 'eval-not',
  EvalApply = 'eval-apply',
  EvalReference = 'eval-reference',
  EvalLet = 'eval-let',

  Execute = 'exec',
  Stop = 'stop',
  Step = 'step',

  DetectCompletion = 'detect-end',
  Undo = 'undo',
  Redo = 'redo',
  ClearError = 'clear-error',

  CreateDocNodes = 'create-docs',
  DeleteDocNodes = 'delete-docs',
}

export type ReductAction =
  StartLevelAction |
  MoveNodeToBoardAction |
  MoveNodeToSlotAction |
  MoveNodeToDefsAction |
  AddNodeToToolboxAction |
  EvalLambdaAction |
  EvalLambdaAction |
  EvalOperatorAction |
  EvalConditionalAction |
  EvalNotAction |
  EvalApplyAction |
  EvalReferenceAction |
  ExecuteAction |
  StopAction |
  StepAction |
  CleanupAction |
  DetectCompletionAction |
  ClearErrorAction |
  RaiseAction |
  DetachAction |
  EvalLetAction |
  CreateDocsAction |
  DeleteDocsAction;


export interface ClearErrorAction {
  type: ActionKind.ClearError;
}

/**
   * This action clears any error currently held by the store.
   */
export function createClearError(): ClearErrorAction {
  return { type: ActionKind.ClearError };
}

export interface CleanupAction {
  type: ActionKind.Cleanup;
  target: NodeId;
}

/**
 * Nodes are not immediately deleted from the node map when they are removed
 * from the game, to facilitate animation. Cleanup is called when the
 * animation is finished, to delete a removed node from the node map. Has no
 * effect if the target node is not removed.
 * 
 * @param target The node to delete.
 */
export function createCleanup(target: NodeId): CleanupAction {
  return {
    type: ActionKind.Cleanup,
    target, 
  };
}

export interface MoveNodeToBoardAction {
  type: ActionKind.MoveNodeToBoard;
  nodeId: NodeId;
}

/**
 * Creates an action which will add the specified node to the board, removing it
 * from the toolbox if necessary.
 * @param nodeId The node to add to the board.
 */
export function createMoveNodeToBoard(nodeId: NodeId): MoveNodeToBoardAction {
  return {
    type: ActionKind.MoveNodeToBoard,
    nodeId, 
  };
}

export interface MoveNodeToDefsAction {
  type: ActionKind.MoveNodeToDefs;
  nodeId: NodeId;
}

/**
 * Create a definition in the global scope based on the given node.
 */
export function createMoveNodeToDefs(nodeId: NodeId): MoveNodeToDefsAction {
  return {
    type: ActionKind.MoveNodeToDefs,
    nodeId,
  };
}

export interface MoveNodeToSlotAction {
  type: ActionKind.MoveNodeToSlot;
  slotId: NodeId;
  nodeId: NodeId;
}

/**
 * Replaces a slot node (which represents the absence of a value) with another
 * node.
 * @param slotId The ID of the slot to be replaced.
 * @param nodeId The ID of the node to put in the position of the slot.
 */
export function moveNodeToSlot(slotId: NodeId, nodeId: NodeId): MoveNodeToSlotAction {
  return {
    type: ActionKind.MoveNodeToSlot,
    slotId: slotId,
    nodeId: nodeId,
  };
}

export interface StartLevelAction {
  type: ActionKind.StartLevel;
  level: number;
  nodes: NodeMap;
  goal: Set<NodeId>;
  board: Set<NodeId>;
  toolbox: Set<NodeId>;
  globals: Map<string, NodeId>;
}

/**
 * Redux action to start a new level.
 * 
 * @param index The index of the level to start.
 */
export function createStartLevel(index: number): StartLevelAction {
  const levelDefinition = Loader.progressions.Elementary.levels[index];

  const macros: MacroMap = new Map();

  for (const name of Object.keys(builtins)) {
    macros.set(name, () => createBuiltInReferenceNode(name));
  }

  if (levelDefinition.macros) {
    for (const [name, script] of Object.entries(levelDefinition.macros)) {
      // TODO: remove override for builtins, remove defs for builtin methods in levels
      if (name in builtins) continue;

      // Needs to be a thunk in order to allocate new ID each time
      macros.set(name, () => parseProgram(script, macros));
    }
  }

  // Parse the defined names carried over from previous levels, the
  // globals added for this level, and any definitions on the board.
  const prevDefinedNames = levelDefinition.extraDefines
    ? levelDefinition.extraDefines
      .map((script: string) => {
        const node = parseProgram(script, macros);

        if (node.type !== 'define') {
          return null;
        }

        return [node.fields.name, () => createReferenceNode(node.fields.name)];
      })
      .filter((define) => define !== null)
    : [];

  const globalDefinedNames = Object.entries(levelDefinition.globals)
    .map(([name, script]) => {
      const node = parseProgram(script, macros);

      if (node.type !== 'define') {
        return null;
      }

      return [name, () => createReferenceNode(name)];
    });

  const newDefinedNames = levelDefinition.board
    .map((script: string) => {
      const node = parseProgram(script, macros);

      if (node.type !== 'define') {
        return null;
      }

      return [node.fields.name, () => createReferenceNode(node.fields.name)];
    })
    .filter((define) => define !== null);

  // Turn these defines into "macros", so that the name resolution
  // system can handle lookup.
  for (const [name, expr] of [...prevDefinedNames, ...newDefinedNames, ...globalDefinedNames]) {
    // TODO: remove override for builtins, remove defs for builtin methods in levels
    if (name in builtins) continue;

    macros.set(name, expr);
  }

  // parse the goal, board, and toolbox
  const goalNodes = levelDefinition.goal.map((script) => parseProgram(script, macros));
  const boardNodes = levelDefinition.board.map((script) => parseProgram(script, macros));
  const toolboxNodes = levelDefinition.toolbox.map((script) => parseProgram(script, macros));

  // Go back and parse the globals as well.
  const globals = new Map();
  levelDefinition.extraDefines
    .map((script) => parseProgram(script, macros))
    .forEach((node) => {
      if (node.type !== 'define') {
        return;
      }

      if (node.fields.name in builtins) return;

      globals.set(node.fields.name, node);
    });

  for (const [name, script] of Object.entries(levelDefinition.globals)) {
    // TODO: remove override for builtins, remove defs for builtin methods in levels
    if (name in builtins) continue;

    const node = parseProgram(script, macros);

    if (node.type !== 'define')
      continue;

    globals.set(name, node);
  }

  const flatNodes = new Map();
  const goal: Set<NodeId> = new Set();
  const board: Set<NodeId> = new Set();
  const toolbox: Set<NodeId> = new Set();
  const flatGlobals: Map<string, NodeId> = new Map();

  for (const goalNode of goalNodes) {
    for (const flatGoalNode of flatten(goalNode)) {
      flatNodes.set(flatGoalNode.id, flatGoalNode);
    }

    goal.add(goalNode.id);
  }

  for (const boardNode of boardNodes) {
    for (const flatBoardNode of flatten(boardNode)) {
      flatNodes.set(flatBoardNode.id, flatBoardNode);
    }

    board.add(boardNode.id);
  }

  for (const toolboxNode of toolboxNodes) {
    for (const flatToolboxNode of flatten(toolboxNode)) {
      flatNodes.set(flatToolboxNode.id, flatToolboxNode);
    }

    toolbox.add(toolboxNode.id);
  }

  for (const [name, globalNode] of globals) {
    for (const flatGlobalNode of flatten(globalNode)) {
      flatNodes.set(flatGlobalNode.id, flatGlobalNode);
    }

    flatGlobals.set(name, globalNode.id);
  }

  return {
    type: ActionKind.StartLevel,
    level: index,
    nodes: flatNodes,
    goal: goal,
    board: board,
    toolbox: toolbox,
    globals: flatGlobals,
  };
}

export interface CreateDocsAction {
  type: ActionKind.CreateDocNodes;
  key: string;
  rootId: number;
  nodes: NodeMap;
}

/**
 * Creates an action which will add nodes to the game to be displayed in the
 * documentation area.
 *
 * @param key The key that is used to group documentation nodes together and
 * link them to the document.
 * @param docScript JavaScript that represents the nodes to create.
 */
export function createCreateDocs(key: string, docScript: string): CreateDocsAction {
  const macros: MacroMap = new Map();

  for (const name of Object.keys(builtins)) {
    macros.set(name, () => createBuiltInReferenceNode(name));
  }
  
  const node = parseProgram(docScript, macros);

  const flatNodes = new Map();

  for (const flatNode of flatten(node)) {
    flatNode.__meta = flatNode.__meta ?? {};
    flatNode.__meta.doc = key;

    flatNodes.set(flatNode.id, flatNode);
  }

  return {
    type: ActionKind.CreateDocNodes,
    key,
    rootId: node.id,
    nodes: flatNodes,
  };
}

export interface DeleteDocsAction {
  type: ActionKind.DeleteDocNodes;
  key: string;
}

/**
 * Creates an action which will remove documentation nodes from the game.
 *
 * @param key The key that is used to group documentation nodes together and
 * link them to the document.
 */
export function createDeleteDocs(key: string): DeleteDocsAction {
  return {
    type: ActionKind.DeleteDocNodes,
    key,
  };
}

export interface AddNodeToToolboxAction {
  type: ActionKind.AddToolboxItem;
  newNodeId: NodeId;
  addedNodes: Iterable<ReductNode>;
}

/**
 * Adds a node and its descendants to the toolbox. Intended to be used on newly
 * created nodes, not on nodes that are already somewhere else (like on the
 * board.)
 *
 * @param newNodeId The ID of the node to be added to the toolbox.
 * @param newNodes The node being added, as well as all of its descendant nodes.
 */
export function addToolboxItem(
  newNodeId: NodeId,
  newNodes: Iterable<ReductNode>
): AddNodeToToolboxAction {
  return {
    type: ActionKind.AddToolboxItem,
    newNodeId,
    addedNodes: newNodes,
  };
}


export interface EvalLetAction {
  type: ActionKind.EvalLet;
  letNodeId: NodeId;

}

/**
 * Returns an action which will evaluate the variable to the first
 * expression inside of the second expression.
 * 
 * @param letNodeId The ID of the node that represents the let expression

 */
export function createEvalLet(
  letNodeId: NodeId,
): EvalLetAction {
  return {
    type: ActionKind.EvalLet,
    letNodeId,

  };
}

export interface EvalLambdaAction {
  type: ActionKind.EvalLambda;
  lambdaNodeId: NodeId;
  paramNodeId: NodeId;
}

/**
 * Returns an action which will apply the given parameter to the first unbound
 * argument of the lambda. If there aren't any, it just be ignored.
 *
 * @param lambdaNodeId The ID of the node that represents the lambda being
 * called.
 * @param paramNodeId The ID of the node that represents the parameter to
 * substitute.
 */
export function createEvalLambda(
  lambdaNodeId: NodeId,
  paramNodeId: NodeId,
): EvalLambdaAction {
  return {
    type: ActionKind.EvalLambda,
    paramNodeId,
    lambdaNodeId,
  };
}

export interface EvalOperatorAction {
  type: ActionKind.EvalOperator;
  operatorNodeId: NodeId;
}

/**
 * Returns an action which will evaluate a binary operator (+, -, >, ==, etc.)
 *
 * @param operatorNodeId The ID of the node that represents the binary operator.
 */
export function createEvalOperator(
  operatorNodeId: NodeId,
): EvalOperatorAction {
  return {
    type: ActionKind.EvalOperator,
    operatorNodeId,
  };
}

export interface EvalConditionalAction {
  type: ActionKind.EvalConditional;
  conditionalNodeId: NodeId;
}

/**
 * Returns an action which will evaluate a conditional (if-else) node.
 *
 * @param operatorNodeId The ID of the node that represents the conditional.
 */
export function createEvalConditional(
  conditionalNodeId: NodeId,
): EvalConditionalAction {
  return {
    type: ActionKind.EvalConditional,
    conditionalNodeId,
  };
}

export interface EvalNotAction {
  type: ActionKind.EvalNot;
  notNodeId: NodeId;
}

/**
 * Returns an action which will evaluate a conditional (if-else) node.
 *
 * @param notNodeId The ID of the node that represents the conditional.
 */
export function createEvalNot(
  notNodeId: NodeId,
): EvalNotAction {
  return {
    type: ActionKind.EvalNot,
    notNodeId,
  };
}

export interface EvalApplyAction {
  type: ActionKind.EvalApply;
  applyNodeId: NodeId;
}

/**
 * Returns an action which will evaluate an application node.
 *
 * @param applyNodeId The ID of the node that represents the application.
 */
export function createEvalApply(
  applyNodeId: NodeId,
): EvalApplyAction {
  return {
    type: ActionKind.EvalApply,
    applyNodeId,
  };
}

export interface EvalReferenceAction {
  type: ActionKind.EvalReference;
  referenceNodeId: NodeId;
}

/**
 * Returns an action which will evaluate an application node.
 *
 * @param referenceNodeId The ID of the node that represents the application.
 */
export function createEvalReference(
  referenceNodeId: NodeId,
): EvalReferenceAction {
  return {
    type: ActionKind.EvalReference,
    referenceNodeId,
  };
}

export interface EvalInvocationAction {
  type: ActionKind.EvalReference;
  referenceNodeId: NodeId;
  paramNodeId: NodeId;
}

/**
 * Returns an action which will evaluate an application node.
 *
 * @param referenceNodeId The ID of the node that represents the application.
 */
export function createEvalInvocation(
  referenceNodeId: NodeId,
  paramNodeId: NodeId
): EvalInvocationAction {
  return {
    type: ActionKind.EvalReference,
    referenceNodeId,
    paramNodeId,
  };
}

export interface StepAction {
  type: ActionKind.Step;
  targetNodeId: NodeId;
}

/**
 * Returns an action which will evaluate one subexpression of the target node,
 * or if it doesn't have any that need evaluating, the result of evaluating the
 * target node.
 *
 * @param targetNodeId The ID of the node to step.
 */
export function createStep(
  targetNodeId: NodeId
): StepAction {
  return {
    type: ActionKind.Step,
    targetNodeId,
  };
}

export interface ExecuteAction {
  type: ActionKind.Execute;
  targetNodeId: NodeId;
}

/**
 * Returns an action which will evaluate a node as far as possible,
 * automatically evaluating sub-expressions as necessary.
 *
 * @param targetNodeId The ID of the node to execute.
 */
export function createExecute(
  targetNodeId: NodeId
): ExecuteAction {
  return {
    type: ActionKind.Execute,
    targetNodeId,
  };
}

export interface StopAction {
  type: ActionKind.Stop;
  targetNodeId: NodeId;
}

/**
 * Returns an action which will halt an execution of a node.
 *
 * @param targetNodeId The ID of the node to stop executing.
 */
export function createStop(
  targetNodeId: NodeId
): StopAction {
  return {
    type: ActionKind.Stop,
    targetNodeId,
  };
}

export interface DetectCompletionAction {
  type: ActionKind.DetectCompletion;
}

/**
 * Returns an action which will check if the level has been completed (which
 * will send the game into the 'victory' state) or if the level is now
 * impossible (which will send the game into the 'defeat' state).
 */
export function createDetectCompetion(): DetectCompletionAction {
  return {
    type: ActionKind.DetectCompletion,
  };
}

export interface RaiseAction {
  type: ActionKind.Raise;
  nodeId: NodeId;
}

/**
 * Raise the given node to the top.
 *
 * This is a visual concern, but the stage draws nodes in the order
 * they are in the store, so this changes the z-index.
 */
export function createRaise(nodeId: NodeId): RaiseAction {
  return {
    type: ActionKind.Raise,
    nodeId,
  };
}

export interface DetachAction {
  type: ActionKind.Detach;
  nodeId: NodeId;
}

/**
 * Detach the given node from its parent.
 */
export function createDetach(nodeId: NodeId): DetachAction {
  return {
    type: ActionKind.Detach,
    nodeId,
  };
}

export function addGoalItem(newNodeId, newNodes) {
  return {
    type: ActionKind.AddGoalItem,
    newNodeId,
    addedNodes: newNodes,
  };
}

export function changeGoal(goal_id, newNodeIds, newNodes) {
  return {
    type: ActionKind.ChangeGoal,
    goal_id,
    newNodeIds,
    addedNodes: newNodes,
  };
}

export function addBoardItem(newNodeIds, addedNodes) {
  return {
    type: ActionKind.AddBoardItem,
    newNodeIds,
    addedNodes,
  };
}

/**
 * Unfold the definition of ``nodeId``, producing ``newNodeId`` (and
 * adding ``addedNodes`` to the store).
 */
export function unfold(nodeId, newNodeId, addedNodes) {
  return {
    type: ActionKind.Unfold,
    nodeId,
    newNodeId,
    addedNodes,
  };
}

/**
 * Replace a node with its unfaded variant temporarily.
 */
export function unfade(source, nodeId, newNodeId, addedNodes) {
  return {
    type: ActionKind.Unfade,
    source,
    nodeId,
    newNodeId,
    addedNodes,
  };
}

/**
 * Replace an unfaded node with its faded variant.
 */
export function fade(source, unfadedId, fadedId) {
  return {
    type: ActionKind.Fade,
    source,
    unfadedId,
    fadedId,
  };
}
