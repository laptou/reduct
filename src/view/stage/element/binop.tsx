import { BinOpNode } from '@/semantics/defs';
import React, { Component } from 'react';
import StageElement from './base';
import '@resources/style/react/element/binop.scss';

interface BinOpElementOwnProps {
    node: BinOpNode;
}

export class BinOpElement extends Component<BinOpElementOwnProps> {
  public render() {
    return (
      <div className='element binop'>
        <svg className='decoration' viewBox='0 0 20 32' preserveAspectRatio='none'>
          <polygon points='0 16 20 0 20 32' />
        </svg>
        <div className='content'>
          <div className='left'>
            <StageElement nodeId={this.props.node.left} slot={true} />
          </div>
          <div className='operation'>
            <StageElement nodeId={this.props.node.op} slot={true} />
          </div>
          <div className='right'>
            <StageElement nodeId={this.props.node.right} slot={true} />
          </div>
        </div>
        <svg className='decoration' viewBox='0 0 20 32' preserveAspectRatio='none'>
          <polygon points='20 16 0 0 0 32' />
        </svg>
      </div>
    )
  }
}
