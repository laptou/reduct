import { BinOpNode } from '@/semantics/defs';
import React, { Component } from 'react';
import StageElement from './base';

interface BinOpElementOwnProps {
    node: BinOpNode;
}

export class BinOpElement extends Component<BinOpElementOwnProps> {
  public render() {
    return (
      <div className='element binop'>
        <div className='left'>
          <StageElement nodeId={this.props.node.left} />
        </div>
        <div className='right'>
          <StageElement nodeId={this.props.node.right} />
        </div>
      </div>
    )
  }
}
