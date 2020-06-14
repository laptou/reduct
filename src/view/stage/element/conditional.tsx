import { ConditionalNode } from '@/semantics/defs';
import '@resources/style/react/element/conditional.scss';
import React, { FunctionComponent } from 'react';
import StageElement from './base';

interface ConditionalElementOwnProps {
    node: ConditionalNode;
}

export const ConditionalElement: FunctionComponent<ConditionalElementOwnProps> = 
  (props) => {
    return (
      <div className='element conditional'>
        <div className='if'>
          <span>if</span>
          <StageElement nodeId={props.node.condition} />
        </div>
        <div className='positive'>
          <StageElement nodeId={props.node.positive} />
        </div>
        <div className='else'>
          <span>else</span>
        </div>
        <div className='negative'>
          <StageElement nodeId={props.node.negative} />
        </div>
      </div>
    )
  };
  