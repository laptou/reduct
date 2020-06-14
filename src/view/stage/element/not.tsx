import StageElement from './base';
import { NotNode } from '@/semantics/defs';
import '@resources/style/react/element/not.scss';
import React, { Component } from 'react';
import { BooleanShape } from '../shape/boolean';

interface NotElementOwnProps {
    node: NotNode;
}

export class NotElement extends Component<NotElementOwnProps> {
  public render() {
    return (
      <div className='element not'>
        <BooleanShape>
          <span>not</span>
          <StageElement nodeId={this.props.node.value} />
        </BooleanShape>
      </div>
    )
  }
}
