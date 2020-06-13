import { ApplyNode } from '@/semantics/defs';
import React, { Component } from 'react';
import StageElement from './base';

interface ApplyElementOwnProps {
    node: ApplyNode;
}

export class ApplyElement extends Component<ApplyElementOwnProps> {
  public render() {
    return (
      <div className='element apply'>
        <div className='callee'>
          <StageElement nodeId={this.props.node.callee} slot={true} />
        </div>
        <div className='argument'>
          <StageElement nodeId={this.props.node.argument} slot={true} />
        </div>
      </div>
    )
  }
}
