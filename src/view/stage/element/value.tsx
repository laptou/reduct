import { ValueNode } from '@/semantics/defs/value';
import cx from 'classnames';
import React, { Component } from 'react';

interface ValueElementOwnProps<T> {
    node: ValueNode<T>;
}

export class ValueElement<T> extends Component<ValueElementOwnProps<T>> {
  public render() {
    return (
      <div className={cx('element', this.props.node.type)}>
        {this.props.node.value}
      </div>
    )
  }
}

export default ValueElement;
