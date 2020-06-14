import { NotNode } from '@/semantics/defs';
import '@resources/style/react/projection/not.scss';
import React, { FunctionComponent } from 'react';
import { BooleanShape } from '../shape/boolean';
import { StageElement } from './base';

interface NotElementOwnProps {
    node: NotNode;
}

export const NotElement: FunctionComponent<NotElementOwnProps> = 
  (props) => {
    return (
      <div className='element not'>
        <BooleanShape>
          <span>not</span>
          <StageElement nodeId={props.node.value} />
        </BooleanShape>
      </div>
    )
  };
