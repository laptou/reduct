import { NodeId, NodeMap } from '@/semantics';
import type { ImStack } from '@/util/im';


export interface RState {
  nodes: NodeMap;
  goal: Set<NodeId>;
  board: Set<NodeId>;
  toolbox: Set<NodeId>;
  globals: Map<string, NodeId>;
}

export interface GlobalState {
  program: ProgramState;
}

export interface ProgramState {
  $present: RState;
  $past: ImStack<any>;
  $future: ImStack<any>;
  $presentExtra: any;
  $pastExtra: any;
  $futureExtra: any;
}
