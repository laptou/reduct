import type { BaseNode } from '..';

export interface MissingNode extends BaseNode {
  type: 'missing';
  locked: true;
}
