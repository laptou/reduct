import React, { FunctionComponent } from 'react';

import { OpNode } from '@/semantics/defs';
import { Flat } from '@/semantics';
import '@resources/style/react/projection/op.scss';

interface OpProjectionOwnProps {
  node: Flat<OpNode>;
}

export const OpProjection: FunctionComponent<OpProjectionOwnProps> = 
  (props) => {
    return (
      <div className='projection op'>
        {props.node.fields.name}
      </div>
    );
  };
