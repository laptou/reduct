import { OpNode } from '@/semantics/defs';
import '@resources/style/react/projection/op.scss';
import React, { FunctionComponent } from 'react';

interface OpProjectionOwnProps {
    node: OpNode;
}

export const OpProjection: FunctionComponent<OpProjectionOwnProps> = 
  (props) => {
    return (
      <div className='projection op'>
        {props.node.fields.name}
      </div>
    )
  };
