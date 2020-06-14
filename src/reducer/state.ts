import { NodeMap } from '@/semantics';
import type { NodeId } from '@/semantics/defs';
import type {
  Im, ImMap, ImSet, ImStack 
} from '@/util/im';


export interface RState {
  nodes: NodeMap;
  goal: ImSet<NodeId>;
  board: ImSet<NodeId>;
  toolbox: ImSet<NodeId>;
  globals: ImMap<string, NodeId>;
}

export interface GlobalState {
  program: Im<ProgramState>;
}

export interface ProgramState {
  $present: Im<RState>;
  $past: ImStack<any>;
  $future: ImStack<any>;
  $presentExtra: any;
  $pastExtra: any;
  $futureExtra: any;
}
