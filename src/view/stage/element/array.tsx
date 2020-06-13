import { ArrayNode } from '@/semantics/defs';
import React, { Component } from 'react';
import StageElement from './base';
import { NodeId } from '@/semantics';

interface ArrayElementOwnProps {
    node: ArrayNode;
}

export class ArrayElement extends Component<ArrayElementOwnProps> {
  public render() {
    const itemIds: Array<NodeId | null> = [];
    
    // array nodes have members elem0, elem1, ... elem{length - 1}
    for (let i = 0; i < this.props.node.length; i++) {
      itemIds.push(this.props.node[`elem${i}`] ?? null);
    }

    return (
      <div className='element array'>
        {
          itemIds.map((itemId, index) => 
            <div className='item' key={index}><StageElement nodeId={itemId} slot={true} /></div>
          )
        }
      </div>
    )
  }
}
