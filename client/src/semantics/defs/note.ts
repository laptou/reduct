import type { BaseNode, ReductNode } from '..';

export interface NoteNode extends BaseNode {
  type: 'note';

  fields: {
    text: string;
  };
}
