import React, { FunctionComponent } from 'react';

import { StageProjection } from './base';

import type { Flat } from '@/semantics';
import type { LetNode } from '@/semantics/defs';

import '@resources/style/react/projection/let.scss';

interface LetProjectionOwnProps {
  node: Flat<LetNode>;
}

type LetProjectionProps =
  LetProjectionOwnProps;

export const LetProjection: FunctionComponent<LetProjectionProps> =
  (props) => {
    return (
      <div className='projection let'>
        <span className='let-keyword'>let</span>
        <div className='let-identifier'>
          <StageProjection nodeId={props.node.subexpressions.variable} />
        </div>
        <span className='let-equals'> = </span>
        <div className='let-value'>
          <StageProjection nodeId={props.node.subexpressions.value} />
        </div>
        <div className='let-in'>
          <span>in</span>
        </div>
        <div className='let-body'>
          <StageProjection nodeId={props.node.subexpressions.body} />
        </div>
      </div>
    );
  };
