import { NodeMap } from '@/semantics';
import type { NodeId } from '@/semantics/defs';
import type { Im, ImMap, ImSet, ImStack, ImList } from '@/util/im';


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
