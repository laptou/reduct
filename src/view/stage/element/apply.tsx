import { ApplyNode } from '@/semantics/defs';
import '@resources/style/react/element/apply.scss';
import React, { FunctionComponent } from 'react';
import { StageElement } from './base';

interface ApplyElementOwnProps {
    node: ApplyNode;
}

export const ApplyElement: FunctionComponent<ApplyElementOwnProps> = 
  (props) => {
    return (
      <div className='element apply'>
        <div className='apply-callee'>
          <StageElement nodeId={props.node.callee} />
        </div>
        <div className='apply-param'>
          <StageElement nodeId={props.node.argument} />
        </div>
      </div>
    )
  };
