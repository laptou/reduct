import { ConditionalNode } from '@/semantics/defs';
import '@resources/style/react/element/conditional.scss';
import React, { Component } from 'react';
import StageElement from './base';

interface ConditionalElementOwnProps {
    node: ConditionalNode;
}

export class ConditionalElement extends Component<ConditionalElementOwnProps> {
  public render() {
    return (
      <div className='element conditional'>
        <div className='if'>
          <span>if</span>
          <StageElement nodeId={this.props.node.condition} />
        </div>
        <div className='positive'>
          <StageElement nodeId={this.props.node.positive} />
        </div>
        <div className='else'>
          <span>else</span>
        </div>
        <div className='negative'>
          <StageElement nodeId={this.props.node.negative} />
        </div>
      </div>
    )
  }
}
