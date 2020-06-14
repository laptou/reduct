import { ApplyNode } from '@/semantics/defs';
import '@resources/style/react/projection/apply.scss';
import React, { FunctionComponent } from 'react';
import { StageProjection } from './base';

interface ApplyProjectionOwnProps {
    node: ApplyNode;
}

export const ApplyProjection: FunctionComponent<ApplyProjectionOwnProps> = 
  (props) => {
    return (
      <div className='projection apply'>
        <div className='apply-callee'>
          <StageProjection nodeId={props.node.callee} />
        </div>
        <div className='apply-param'>
          <StageProjection nodeId={props.node.argument} />
        </div>
      </div>
    )
  };
