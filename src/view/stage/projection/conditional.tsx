import React, { FunctionComponent } from 'react';

import { StageProjection } from './base';

import { Flat } from '@/semantics';
import { ConditionalNode } from '@/semantics/defs';

import '@resources/style/react/projection/conditional.scss';

interface ConditionalProjectionOwnProps {
  node: Flat<ConditionalNode>;
}

type ConditionalProjectionProps =
  ConditionalProjectionOwnProps;

export const ConditionalProjection: FunctionComponent<ConditionalProjectionProps> = 
  (props) => {
    return (
      <div className='projection conditional'>
        <div className='if'>
          <span>if</span>
          <StageProjection nodeId={props.node.subexpressions.condition} />
        </div>
        <div className='positive'>
          <StageProjection nodeId={props.node.subexpressions.positive} />
        </div>
        <div className='else'>
          <span>else</span>
        </div>
        <div className='negative'>
          <StageProjection nodeId={props.node.subexpressions.negative} />
        </div>
      </div>
    );
  };
