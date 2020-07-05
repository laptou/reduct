import { NodeId } from '@/semantics';
import { ArrayNode } from '@/semantics/defs';
import { DRF } from '@/util/helper';
import '@resources/style/react/projection/array.scss';
import React, { FunctionComponent } from 'react';
import { StageProjection } from './base';

interface ArrayProjectionOwnProps {
  node: DRF<ArrayNode>;
}

export const ArrayProjection: FunctionComponent<ArrayProjectionOwnProps> = 
  (props) => {
    const itemIds: Array<NodeId | null> = [];
    
    for (let i = 0; i < props.node.fields.length; i++) {
      itemIds.push(props.node.subexpressions[i] ?? null);
    }

    return (
      <div className='projection array'>
        {
          itemIds.map((itemId, index) => 
            <div className='array-item' key={index}><StageProjection nodeId={itemId} /></div>
          )
        }
      </div>
    )
  };
