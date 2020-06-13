import { RState } from '@/reducer/state';
import { ReductNode } from '@/semantics';
import { BinOpNode } from '@/semantics/defs';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import StageElement from './base';

interface BinOpElementOwnProps {
    node: BinOpNode;
}

interface BinOpElementStoreProps {
    left: ReductNode | null;
    right: ReductNode | null;
}

type BinOpProps = BinOpElementOwnProps & BinOpElementStoreProps;

export class BinOpElement extends Component<BinOpProps> {
  public render() {
    return (
      <div className='element binop'>
        <div className='left'>
          <StageElement node={this.props.left} />
        </div>
        <div className='right'>
          <StageElement node={this.props.right} />
        </div>
      </div>
    )
  }
}

export default connect((state: RState, ownProps: BinOpElementOwnProps) => ({
  left: state.nodes.get(ownProps.node.left)?.toJS() ?? null,
  right: state.nodes.get(ownProps.node.right)?.toJS() ?? null
}))(BinOpElement);
