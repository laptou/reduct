import { ReductNode } from '@/semantics';
import React from 'react';
import { ApplyElement } from './apply';
import { ArrayElement } from './array';
import { BinOpElement } from './binop';
import { ConditionalElement } from './conditional';
import { LambdaArgElement, LambdaElement, LambdaVarElement } from './lambda';
import { MissingElement } from './missing';
import { NotElement } from './not';
import { OpElement } from './op';
import { ValueElement } from './value';
import { SymbolElement } from './symbol';
import { DefineElement } from './define';
import { ReferenceElement } from './reference';

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
  case 'conditional': return <ConditionalElement node={node} key={node.id} />;
  case 'define': return <DefineElement node={node} key={node.id} />;
  case 'bool': 
  case 'number':
  case 'string':
    return <ValueElement node={node} key={node.id} />;
  case 'missing': return <MissingElement node={node} key={node.id} />;
  case 'not': return <NotElement node={node} key={node.id} />;
  case 'lambda': return <LambdaElement node={node} key={node.id} />;
  case 'lambdaArg': return <LambdaArgElement node={node} key={node.id} />;
  case 'lambdaVar': return <LambdaVarElement node={node} key={node.id} />;
  case 'symbol': return <SymbolElement node={node} key={node.id} />;
  case 'reference': return <ReferenceElement node={node} key={node.id} />;
  default: return <span>{`{${node.type}}`}</span>;
  }
}
