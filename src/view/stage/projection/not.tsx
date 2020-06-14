import { NotNode } from '@/semantics/defs';
import '@resources/style/react/projection/not.scss';
import React, { FunctionComponent } from 'react';
import { BooleanShape } from '../shape/boolean';
import { StageProjection } from './base';

interface NotProjectionOwnProps {
    node: NotNode;
}

export const NotProjection: FunctionComponent<NotProjectionOwnProps> = 
  (props) => {
    return (
      <div className='projection not'>
        <BooleanShape>
          <span>not</span>
          <StageProjection nodeId={props.node.value} />
        </BooleanShape>
      </div>
    )
  };
