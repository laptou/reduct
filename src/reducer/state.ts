import type {
  Im, ImMap, ImList, ImStack 
} from '@/util/im';
import type { BaseNode, NodeId } from '@/semantics/defs';
import { NodeMap } from '@/semantics';


export interface RState {
  nodes: NodeMap;
  goal: ImList<NodeId>;
  board: ImList<NodeId>;
  toolbox: ImList<NodeId>;
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
