import type { Im, ImMap, ImList } from '@/util/im';
import type { BaseNode, NodeId } from '@/semantics/defs';
import { NodeMap } from '@/semantics';


export interface RState {
  nodes: NodeMap;
  goal: ImList<NodeId>;
  board: ImList<NodeId>;
  toolbox: ImList<NodeId>;
  globals: ImMap<string, NodeId>;
}