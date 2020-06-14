import { NodeId, NodeMap, ReductNode } from '@/semantics';
import { ImList, ImMap, ImSet } from '@/util/im';

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
}

export interface StartLevelAction {
  type: ActionKind.StartLevel;
  nodes: NodeMap;
  goal: ImSet<NodeId>;
  board: ImSet<NodeId>;
  toolbox: ImSet<NodeId>;
  globals: ImMap<string, NodeId>;
}

export interface AddNodeToBoardAction {
  type: ActionKind.AddNodeToBoard;
  nodeId: NodeId;
}

export type ReductAction = 
  StartLevelAction |
  AddNodeToBoardAction;

/**
 * Creates an action which will add the specified node to the board, removing it
 * from the toolbox if necessary.
 * @param nodeId The node to add to the board.
 */
export function createAddNodeToBoard(nodeId: NodeId) {
  return { type: ActionKind.AddNodeToBoard, nodeId };
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
 * @param {basestage.BaseStage} stage
 * @param {Array} goal - List of (mutable) expressions for the goal.
 * @param {Array} board - List of (mutable) expressions for the board.
 * @param {Array} toolbox - List of (mutable) expressions for the toolbox.
 * @param {Object} globals - Map of (mutable) expressions for globals.
 */
export function startLevel(stage, goal, board, toolbox, globals): StartLevelAction {
    const { semantics } = stage;

    let _nodes: Record<number, ReductNode> = {};
    let _goal: NodeId[] = [];
    let _board: NodeId[] = [];
    let _toolbox: NodeId[] = [];
    let _globals: Record<string, NodeId> = {};

    for (const expr of goal) {
        for (const newExpr of semantics.flatten(expr)) {
            _nodes[newExpr.id] = newExpr;
        }
        _goal.push(expr.id);
    }
    for (const expr of board) {
        for (const newExpr of semantics.flatten(expr)) {
            _nodes[newExpr.id] = newExpr;
        }
        _board.push(expr.id);
    }
    for (const expr of toolbox) {
        for (const newExpr of semantics.flatten(expr)) {
            _nodes[newExpr.id] = newExpr;
        }
        _toolbox.push(expr.id);
    }
    for (const [name, expr] of Object.entries(globals)) {
        for (const newExpr of semantics.flatten(expr)) {
            _nodes[newExpr.id] = newExpr;
        }
        _globals[name] = expr.id;
    }


    ({
        nodes: _nodes,
        goal: _goal,
        board: _board,
        toolbox: _toolbox,
        globals: _globals
    } = semantics.parser.postParse(_nodes, _goal, _board, _toolbox, _globals));

    const finalNodes = ImMap(
        Object
            .values(_nodes)
            .map((node: BaseNode) => [node.id, ImMap(node)])
    );

    finalNodes.forEach((node, nodeId) => {
        stage.views[nodeId] = semantics.project(stage, finalNodes, node);
    });

    return {
        type: ActionKind.StartLevel,
        nodes: finalNodes,
        goal: ImSet(_goal),
        board: ImSet(_board),
        toolbox: ImSet(_toolbox),
        globals: ImMap(_globals)
    };
}

export function addToolboxItem(newNodeId, newNodes) {
    return {
        type: ActionKind.AddToolboxItem,
        newNodeId,
        addedNodes: newNodes
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

/**
 * Node ``nodeId`` took a small step to produce ``newNode`` which
 * contains ``newNodes`` as nested nodes. All of these are immutable
 * nodes.
 */
export function smallStep(nodeId, newNodeIds, newNodes) {
    console.log(JSON.stringify(newNodes));
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
