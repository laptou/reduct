import { OpNode } from '@/semantics/defs';
import '@resources/style/react/element/op.scss';
import React, { Component } from 'react';

interface OpElementOwnProps {
    node: OpNode;
}

export class OpElement extends Component<OpElementOwnProps> {
  public render() {
    return (
      <div className='element op'>
        {this.props.node.name}
      </div>
    )
  }
}
