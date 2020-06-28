import { FlatReductNode } from '@/semantics';
import React from 'react';
import { ApplyProjection } from './apply';
import { ArrayProjection } from './array';
import { BinOpProjection } from './binop';
import { ConditionalProjection } from './conditional';
import { DefineProjection } from './define';
import { LambdaArgProjection, LambdaProjection, LambdaVarProjection } from './lambda';
import { MissingProjection } from './missing';
import { NotProjection } from './not';
import { OpProjection } from './op';
import { ReferenceProjection } from './reference';
import { SymbolProjection } from './symbol';
import { ValueProjection } from './value';
import { VTupleProjection } from './vtuple';
import { DRF } from '@/util/helper';

/**
 * Definitions:
 *  - "node": a computational item within the game
 *  - "projection": the UI component corresponding to a node
 *  - "stage projection": an projection that has event handlers attached and is ready
 *    to be placed on the stage
 */

/**
 * Gets the stage projection for the given node.
 * @param node The node that is to be displayed on the stage.
 */
export function getProjectionForNode(node: DRF | null) {
  if (!node) return null;

  switch (node.type) {
  case 'apply': return <ApplyProjection node={node} key={node.id} />;
  case 'array': return <ArrayProjection node={node} key={node.id} />;
  case 'binop': return <BinOpProjection node={node} key={node.id} />;
  case 'op': return <OpProjection node={node} key={node.id} />;
  case 'conditional': return <ConditionalProjection node={node} key={node.id} />;
  case 'define': return <DefineProjection node={node} key={node.id} />;
  case 'boolean': 
  case 'number':
  case 'string':
    return <ValueProjection node={node} key={node.id} />;
  case 'missing': return <MissingProjection node={node} key={node.id} />;
  case 'not': return <NotProjection node={node} key={node.id} />;
  case 'lambda': return <LambdaProjection node={node} key={node.id} />;
  case 'lambdaArg': return <LambdaArgProjection node={node} key={node.id} />;
  case 'lambdaVar': return <LambdaVarProjection node={node} key={node.id} />;
  case 'symbol': return <SymbolProjection node={node} key={node.id} />;
  case 'reference': return <ReferenceProjection node={node} key={node.id} />;
  case 'vtuple': return <VTupleProjection node={node} key={node.id} />;
  default: return <span>{`{${node.type}}`}</span>;
  }
}
