import { NodeId, NodeMap, ReductNode, BaseNode } from '@/semantics';
import { ImList, ImMap } from '@/util/im';

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
    Hover = 'hover'
}

export interface StartLevelAction {
    type: ActionKind.StartLevel;
    nodes: NodeMap;
    goal: ImList<NodeId>;
    board: ImList<NodeId>;
    toolbox: ImList<NodeId>;
    globals: ImMap<string, NodeId>;
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
export function startLevel(stage: any, goal: any, board: any, toolbox: any, globals: any): StartLevelAction {


    const { semantics } = stage;

    // initialize data structures for level
    let _nodes: Record<number, ReductNode> = {};
    let _goal: NodeId[] = [];
    let _board: NodeId[] = [];
    let _toolbox: NodeId[] = [];
    let _globals: Record<string, NodeId> = {};

    // fill the goal nodes for the stage
    for (const expr of goal) {
        for (const newExpr of semantics.flatten(expr)) {
            _nodes[newExpr.id] = newExpr;
        }
        _goal.push(expr.id);
    }

    // fill the board nodes for the stage
    for (const expr of board) {
        for (const newExpr of semantics.flatten(expr)) {
            _nodes[newExpr.id] = newExpr;
        }
        _board.push(expr.id);
    }

    // fill the toolbox nodes for the stage
    for (const expr of toolbox) {
        for (const newExpr of semantics.flatten(expr)) {
            _nodes[newExpr.id] = newExpr;
        }
        _toolbox.push(expr.id);
    }

    // fill the global variables for the stage
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
        goal: ImList(_goal),
        board: ImList(_board),
        toolbox: ImList(_toolbox),
        globals: ImMap(_globals)
    };
}

/**
 * Adds a new node with newNodeId to the toolbox
 */
export function addToolboxItem(newNodeId: NodeId, newNodes: NodeId[]) {
    return {
        type: ActionKind.AddToolboxItem,
        newNodeId,
        addedNodes: newNodes
    };
}

/**
 * Adds a new goal node to goal nodes 
 */
export function addGoalItem(newNodeId: NodeId, newNodes: NodeId[]) {
    return {
        type: ActionKind.AddGoalItem,
        newNodeId,
        addedNodes: newNodes
    };
}

/**
 * Changes the goal of a state
 */
export function changeGoal(goal_id: NodeId, newNodeIds: NodeId[], newNodes: NodeId[]) {
    return {
        type: ActionKind.ChangeGoal,
        goal_id,
        newNodeIds,
        addedNodes: newNodes
    };
}
/**
 * Adds a new item to the board
 */
export function addBoardItem(newNodeIds: NodeId[], addedNodes: NodeId[]) {
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
export function smallStep(nodeId: NodeId, newNodeIds: NodeId[], newNodes: NodeId[]) {
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
export function unfold(nodeId: NodeId, newNodeId: NodeId, addedNodes: NodeId[]) {
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
export function betaReduce(topNodeId: NodeId, argNodeId: NodeId, newNodeIds: NodeId[], addedNodes: NodeId[]) {
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
export function raise(nodeId: NodeId) {
    return {
        type: ActionKind.Raise,
        nodeId
    };
}

/**
 * Detach the given node from its parent.
 */
export function detach(nodeId: NodeId) {
    return {
        type: ActionKind.Detach,
        nodeId
    };
}

/**
 * Place the node with childId in the slot given by holeId
 */
export function fillHole(holeId: NodeId, childId: NodeId) {
    return {
        type: ActionKind.FillSlot,
        holeId,
        childId
    };
}

/**
 * Attach the child to the given parent through the given notches
 * not fucntional as of now
 */
export function attachNotch(parentId: NodeId, notchIdx: any, childId: NodeId, childNotchIdx: any) {
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
export function useToolbox(nodeId: NodeId, clonedNodeId = null, addedNodes = null) {
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
export function skipUndo(action: any) {
    action.skipUndo = true;
    return action;
}

/**
 * Replace a node with its unfaded variant temporarily.
 */
export function unfade(source: any, nodeId: NodeId, newNodeId: NodeId, addedNodes: NodeId[]) {
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
export function fade(source: any, unfadedId: NodeId, fadedId: NodeId) {
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
export function define(name: NodeId, id: NodeId) {
    return {
        type: ActionKind.Define,
        name,
        id
    };
}
