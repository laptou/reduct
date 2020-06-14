import { NodeId } from '@/semantics';
import { ArrayNode } from '@/semantics/defs';
import '@resources/style/react/element/array.scss';
import React, { FunctionComponent } from 'react';
import { StageElement } from './base';

interface ArrayElementOwnProps {
    node: ArrayNode;
}

export const ArrayElement: FunctionComponent<ArrayElementOwnProps> = 
  (props) => {
    const itemIds: Array<NodeId | null> = [];
    
    // array nodes have members elem0, elem1, ... elem{length - 1}
    for (let i = 0; i < props.node.length; i++) {
      itemIds.push(props.node[`elem${i}`] ?? null);
    }

    return (
      <div className='element array'>
        {
          itemIds.map((itemId, index) => 
            <div className='array-item' key={index}><StageElement nodeId={itemId} /></div>
          )
        }
      </div>
    )
  };
