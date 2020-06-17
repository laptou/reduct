import { VTupleNode } from '@/semantics/transform';
import '@resources/style/react/projection/vtuple.scss';
import React, { FunctionComponent } from 'react';
import { StageProjection } from './base';

interface VTupleProjectionOwnProps {
    node: VTupleNode;
}

export const VTupleProjection: FunctionComponent<VTupleProjectionOwnProps> = 
  (props) => {
    const childIds = [];

    for (let i = 0; i < props.node.fields.numChildren; i++) {
      childIds.push(props.node.subexpressions[`child${i}`]);
    }

    return (
      <ul className='projection vtuple'>
        {childIds.map((childId, index) => <li className='vtuple-item' key={index}><StageProjection nodeId={childId} /></li>)}
      </ul>
    );
  };
