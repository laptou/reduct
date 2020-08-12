import React, { FunctionComponent } from 'react';

import { StageProjection } from './base';

import { VTupleNode } from '@/semantics/defs';
import { Flat } from '@/semantics';
import '@resources/style/react/projection/vtuple.scss';

interface VTupleProjectionOwnProps {
  node: Flat<VTupleNode>;
}

export const VTupleProjection: FunctionComponent<VTupleProjectionOwnProps> =
  (props) => {
    const childIds = [];

    for (let i = 0; i < props.node.fields.size; i++) {
      childIds.push(props.node.subexpressions[i]);
    }

    return (
      <ul className='projection vtuple'>
        {childIds.map((childId, index) => <li className='vtuple-item' key={index}><StageProjection nodeId={childId} /></li>)}
      </ul>
    );
  };
