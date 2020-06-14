import { VTupleNode } from '@/semantics/transform';
import '@resources/style/react/projection/vtuple.scss';
import React, { FunctionComponent } from 'react';
import { StageElement } from './base';

interface VTupleElementOwnProps {
    node: VTupleNode;
}

export const VTupleElement: FunctionComponent<VTupleElementOwnProps> = 
  (props) => {
    const childIds = [];

    for (let i = 0; i < props.node.numChildren; i++) {
      childIds.push(props.node[`child${i}`]);
    }

    return (
      <ul className='element vtuple'>
        {childIds.map((childId, index) => <li className='vtuple-item' key={index}><StageElement nodeId={childId} /></li>)}
      </ul>
    );
  };
