import { RNode, RId } from '@/semantics/defs';
import { Im } from '@/util/im';


export interface RState {
  nodes: ImMap<RId, Im<RNode>>;
  goal: ImList<RId>;
  board: ImList<RId>;
  toolbox: ImList<RId>;
  globals: ImMap<string, RId>;
}