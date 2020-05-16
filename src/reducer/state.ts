import type { Im, ImMap, ImList } from '@/util/im';
import type { RNode, RId } from '@/semantics/defs';


export interface RState {
  nodes: ImMap<RId, Im<RNode>>;
  goal: ImList<RId>;
  board: ImList<RId>;
  toolbox: ImList<RId>;
  globals: ImMap<string, RId>;
}