import { ConditionalNode } from '@/semantics/defs';
import '@resources/style/react/projection/conditional.scss';
import React, { FunctionComponent } from 'react';
import { StageProjection } from './base';

interface ConditionalProjectionOwnProps {
    node: ConditionalNode;
}

export const ConditionalProjection: FunctionComponent<ConditionalProjectionOwnProps> = 
  (props) => {
    return (
      <div className='projection conditional'>
        <div className='if'>
          <span>if</span>
          <StageProjection nodeId={props.node.condition} />
        </div>
        <div className='positive'>
          <StageProjection nodeId={props.node.positive} />
        </div>
        <div className='else'>
          <span>else</span>
        </div>
        <div className='negative'>
          <StageProjection nodeId={props.node.negative} />
        </div>
      </div>
    )
  };
  