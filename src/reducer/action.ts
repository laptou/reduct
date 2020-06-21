import { NodeId, NodeMap, ReductNode } from '@/semantics';
import { ImList, ImMap, ImSet } from '@/util/im';
import { Semantics } from '@/semantics/transform';
import BaseStage from '@/stage/basestage';

export enum ActionKind {
  UseToolbox = 'use-toolbox',
  Raise = 'raise',
  Detach = 'detach',
  FillSlot = 'fill-slot',
  AttachNotch = 'attach-notch',
  SmallStep = 'small-step',
  Unfold = 'unfold',
  BetaReduce = 'beta-reduce',
  StartLevel = 'start-level',
  Victory = 'victory',
  Fade = 'fade',
  Unfade = 'unfade',
  Define = 'define',
  AddToolboxItem = 'add-toolbox-item',
  AddBoardItem = 'add-board-item',
  AddGoalItem = 'add-goal-item',
  ChangeGoal = 'change-goal',
  Hover = 'hover',

  AddNodeToBoard = 'add-node-to-stage',
  EvalLambda = 'apply-lambda'
}


export interface AddNodeToBoardAction {
  type: ActionKind.AddNodeToBoard;
  nodeId: NodeId;
}

export type ReductAction = 
  StartLevelAction |
  AddNodeToBoardAction |
  AddNodeToToolboxAction |
  SmallStepAction |
  EvalLambdaAction;

/**
 * Creates an action which will add the specified node to the board, removing it
 * from the toolbox if necessary.
 * @param nodeId The node to add to the board.
 */
export function createAddNodeToBoard(nodeId: NodeId) {
  return { type: ActionKind.AddNodeToBoard, nodeId };
}

export interface StartLevelAction {
  type: ActionKind.StartLevel;
  nodes: NodeMap;
  goal: Set<NodeId>;
  board: Set<NodeId>;
  toolbox: Set<NodeId>;
  globals: Map<string, NodeId>;
}

/**
 * Redux action to start a new level.
 *
 * Takes trees of normal AST nodes and flattens them into immutable
 * nodes, suitable to store in Redux. Also runs the semantics module's
 * postParse hook, if defined, and creates the initial views for these
 * expressions.
 *
 * Flattened trees are doubly-linked: children know their parent, and
 * which parent field they are stored in.
 *
 * @param stage
 * @param goal - List of expressions for the goal.
 * @param board - List of expressions for the board.
 * @param toolbox - List of expressions for the toolbox.
 * @param globals - Map of expressions for globals.
 */
export function startLevel(
  stage: BaseStage,
  goal: Iterable<ReductNode>, 
  board: Iterable<ReductNode>, 
  toolbox: Iterable<ReductNode>, 
  globals: Record<string, ReductNode>
): StartLevelAction {
  const { semantics } = stage;
  const _nodes: Map<NodeId, ReductNode> = new Map();
  const _goal: Set<NodeId> = new Set();
  const _board: Set<NodeId> = new Set();
  const _toolbox: Set<NodeId> = new Set();
  const _globals: Map<string, NodeId> = new Map();

  for (const expr of goal) {
    for (const newExpr of semantics.flatten(expr)) {
      _nodes.set(newExpr.id, newExpr);
    }

    _goal.add(expr.id);
  }
  for (const expr of board) {
    for (const newExpr of semantics.flatten(expr)) {
      _nodes.set(newExpr.id, newExpr);
    }

    _board.add(expr.id);
  }

  for (const expr of toolbox) {
    for (const newExpr of semantics.flatten(expr)) {
      _nodes.set(newExpr.id, newExpr);
    }

    _toolbox.add(expr.id);
  }

  for (const [name, expr] of Object.entries(globals)) {
    for (const newExpr of semantics.flatten(expr)) {
      _nodes.set(newExpr.id, newExpr);
    }

    _globals.set(name, expr.id);
  }

  // TODO: remove
  for (const [nodeId, node] of _nodes.entries())
    stage.views[nodeId] = semantics.project(stage, _nodes, node);

  return {
    type: ActionKind.StartLevel,
    nodes: _nodes,
    goal: _goal,
    board: _board,
    toolbox: _toolbox,
    globals: _globals
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
    addedNodes: newNodes
  };
}

export interface EvalLambdaAction {
  type: ActionKind.EvalLambda;
  paramNodeId: NodeId;
  lambdaNodeId: NodeId;
}

/**
 * Returns an action which will evaluate a lambda using a given parameter.
 *
 * @param paramNodeId The ID of the node that represents the parameter that is
 * given to this lambda.
 * @param lambdaNodeId The ID of the node that represents the lambda being
 * called.
 */
export function createEvalLambda(
  paramNodeId: NodeId, 
  lambdaNodeId: NodeId
): EvalLambdaAction {
  return {
    type: ActionKind.EvalLambda,
    paramNodeId,
    lambdaNodeId
  };
}

export function addGoalItem(newNodeId, newNodes) {
  return {
    type: ActionKind.AddGoalItem,
    newNodeId,
    addedNodes: newNodes
  };
}

export function changeGoal(goal_id, newNodeIds, newNodes) {
  return {
    type: ActionKind.ChangeGoal,
    goal_id,
    newNodeIds,
    addedNodes: newNodes
  };
}

export function addBoardItem(newNodeIds, addedNodes) {
  return {
    type: ActionKind.AddBoardItem,
    newNodeIds,
    addedNodes
  };
}

export interface SmallStepAction {
  type: ActionKind.SmallStep;
  topNodeId: NodeId;
  newNodeIds: NodeId[];
  addedNodes: ReductNode[];
}

/**
 * Node ``nodeId`` took a small step to produce ``newNode`` which
 * contains ``newNodes`` as nested nodes.
 */
export function smallStep(
  nodeId: NodeId, 
  newNodeIds: Iterable<NodeId>, 
  newNodes: Iterable<ReductNode>
): SmallStepAction {
  return {
    type: ActionKind.SmallStep,
    topNodeId: nodeId,
    newNodeIds,
    addedNodes: newNodes
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
    addedNodes
  };
}

/**
 * Node ``topNodeId`` was applied to ``argNodeId`` to produce
 * ``newNodeIds`` which contain ``addedNodes`` as nested nodes.
 *
 * A beta-reduction can produce multiple result nodes due to
 * replicators.
 */
export function betaReduce(topNodeId, argNodeId, newNodeIds, addedNodes) {
  return {
    type: ActionKind.BetaReduce,
    topNodeId,
    argNodeId,
    newNodeIds,
    addedNodes
  };
}

/**
 * Raise the given node to the top.
 *
 * This is a visual concern, but the stage draws nodes in the order
 * they are in the store, so this changes the z-index. We could make
 * the board an immutable.Set and store the draw-order elsewhere, but
 * we would have to synchronize it with any changes to the store. I
 * figured it was easier to just break separation in this case.
 */
export function raise(nodeId) {
  return {
    type: ActionKind.Raise,
    nodeId
  };
}

/**
 * Detach the given node from its parent.
 */
export function detach(nodeId) {
  return {
    type: ActionKind.Detach,
    nodeId
  };
}

/**
 * Replace the given hole by the given expression.
 */
export function fillHole(holeId, childId) {
  return {
    type: ActionKind.FillSlot,
    holeId,
    childId
  };
}

/**
 * Attach the child to the given parent through the given notches
 */
export function attachNotch(parentId, notchIdx, childId, childNotchIdx) {
  return {
    type: ActionKind.AttachNotch,
    parentId,
    childId,
    notchIdx,
    childNotchIdx
  };
}

/**
 * Take the given node out of the toolbox.
 */
export function useToolbox(nodeId, clonedNodeId = null, addedNodes = null) {
  return {
    type: ActionKind.UseToolbox,
    nodeId,
    clonedNodeId,
    addedNodes
  };
}

/**
 * We've won the level.
 *
 * Clear the board/goal, which has the side effect of stopping them
 * from drawing anymore.
 */
export function victory() {
  return {
    type: ActionKind.Victory
  };
}

/**
 * Add a flag to the action indicating not to record this on the
 * undo/redo stack.
 */
export function skipUndo(action) {
  action.skipUndo = true;
  return action;
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
    addedNodes
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
    fadedId
  };
}

/**
 * Define the given name as the given node ID.
 */
export function define(name, id) {
  return {
    type: ActionKind.Define,
    name,
    id
  };
}
