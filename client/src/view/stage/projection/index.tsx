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
import { IdentifierProjection } from './identifier';
import { SymbolProjection } from './symbol';
import { LetProjection } from './let';
import { ValueProjection } from './value';
import { VTupleProjection } from './vtuple';
import { BuiltInReferenceProjection } from './builtin';
import { PTupleProjection } from './ptuple';
import { NoteProjection } from './note';
import { ReferenceProjection } from './reference';
import { VoidProjection } from './void';

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
  case 'builtin': return <BuiltInReferenceProjection node={node} key={node.id} />;
  case 'op': return <OpProjection node={node} key={node.id} />;
  case 'conditional': return <ConditionalProjection node={node} key={node.id} />;
  case 'define': return <DefineProjection node={node} key={node.id} />;
  case 'boolean':
  case 'number':
  case 'string':
    return <ValueProjection node={node} key={node.id} />;
  case 'missing': return <MissingProjection node={node} key={node.id} />;
  case 'not': return <NotProjection node={node} key={node.id} />;
  case 'note': return <NoteProjection node={node} key={node.id} />;
  case 'lambda': return <LambdaProjection node={node} key={node.id} />;
  case 'lambdaArg': return <LambdaArgProjection node={node} key={node.id} />;
  case 'lambdaVar': return <LambdaVarProjection node={node} key={node.id} />;
  case 'ptuple': return <PTupleProjection node={node} key={node.id} />;
  case 'symbol': return <SymbolProjection node={node} key={node.id} />;
  case 'identifier': return <IdentifierProjection node={node} key={node.id} />;
  case 'reference': return <ReferenceProjection node={node} key={node.id} />;
  case 'vtuple': return <VTupleProjection node={node} key={node.id} />;
  case 'let': return <LetProjection node={node} key={node.id} />;
  case 'void': return <VoidProjection key={node.id} />;
  default: return <span>{`{${node.type}}`}</span>;
  }
}
