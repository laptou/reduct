import { ReductNode } from '@/semantics';
import { ApplyElement } from './apply';
import { ArrayElement } from './array';
import { BinOpElement } from './binop';
import { ValueElement } from './value';
import React from 'react';
import { ValueNode } from '@/semantics/defs/value';
import { OpElement } from './op';
import { MissingElement } from './missing';

/**
 * Definitions:
 *  - "node": a computational item within the game
 *  - "element": the UI component corresponding to a node
 *  - "stage element": an element that has event handlers attached and is ready
 *    to be placed on the stage
 */

/**
 * Gets the stage element for the given node.
 * @param node The node that is to be displayed on the stage.
 */
export function getElementForNode(node: ReductNode | null) {
  if (!node) return null;

  switch (node.type) {
  case 'apply': return <ApplyElement node={node} key={node.id} />;
  case 'array': return <ArrayElement node={node} key={node.id} />;
  case 'binop': return <BinOpElement node={node} key={node.id} />;
  case 'op': return <OpElement node={node} key={node.id} />;
  case 'bool': 
  case 'number':
  case 'string':
    return <ValueElement node={node} key={node.id} />;
  case 'missing': return <MissingElement key={node.id} />;
  default: return null;
  }
}
