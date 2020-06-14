import { ApplyNode } from '@/semantics/defs';
import React, { FunctionComponent } from 'react';
import { StageElement } from './base';

interface ApplyElementOwnProps {
    node: ApplyNode;
}

export const ApplyElement: FunctionComponent<ApplyElementOwnProps> = 
  (props) => {
    return (
      <div className='element apply'>
        <div className='callee'>
          <StageElement nodeId={props.node.callee} />
        </div>
        <div className='argument'>
          <StageElement nodeId={props.node.argument} />
        </div>
      </div>
    )
  };
