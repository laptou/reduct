import { OpNode } from '@/semantics/defs';
import '@resources/style/react/projection/op.scss';
import React, { FunctionComponent } from 'react';

interface OpElementOwnProps {
    node: OpNode;
}

export const OpElement: FunctionComponent<OpElementOwnProps> = 
  (props) => {
    return (
      <div className='element op'>
        {props.node.name}
      </div>
    )
  };
