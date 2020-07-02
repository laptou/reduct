import { NodeId, NodeMap } from '@/semantics';
import type { ImStack } from '@/util/im';
import { UndoableState } from './undo';


export interface RState {
  /**
   * Maps all of the IDs of nodes that currently exist to their respective
   * nodes.
   */
  nodes: NodeMap;

  /**
   * IDs of nodes which are currently in the goal area.
   */
  goal: Set<NodeId>;

  /**
   * IDs of nodes which are currently on the board.
   */
  board: Set<NodeId>;

  /**
   * IDs of nodes which are currently in the toolbox.
   */
  toolbox: Set<NodeId>;


  globals: Map<string, NodeId>;

  /**
   * Nodes which were added by the most recent action. The values are the
   * "sources" of the nodes: for example, if you step an addition operator and
   * get a number, the "source" of the number node is the addition node.
   */
  added: Map<NodeId, NodeId | null>;

  /**
   * Nodes which were removed by the most recent action.
   */
  removed: Set<NodeId>;

  /**
   * A 'call stack' that keeps track of which nodes are being stepped.
   */
  stack: NodeId[];
}

export interface GlobalState {
  program: UndoableState<RState>;
}
