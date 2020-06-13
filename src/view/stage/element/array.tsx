import { RState } from '@/reducer/state';
import { ReductNode } from '@/semantics';
import { ArrayNode } from '@/semantics/defs';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import StageElement from './base';
import { getElementForNode } from '.';

interface ArrayElementOwnProps {
    node: ArrayNode;
}

interface ArrayElementStoreProps {
    items: ReductNode[];
}

type ArrayProps = ArrayElementOwnProps & ArrayElementStoreProps;

export class ArrayElement extends Component<ArrayProps> {
  public render() {
    return (
      <div className='element array'>
        {
          this.props.items.map(item => 
            <div className='item' key={item.id}><StageElement node={item} /></div>
          )
        }
      </div>
    )
  }
}

export default connect((state: RState, ownProps: ArrayElementOwnProps) => {
  const items = [];
  for (let i = 0; i < ownProps.node.length; i++) {
    const item = state.nodes.get(ownProps.node[`elem${i}`]);
    if (item) items.push(item.toJS());
  }
  return { items };
})(ArrayElement);
