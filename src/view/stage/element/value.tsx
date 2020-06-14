import { BoolNode, NumberNode, StrNode } from '@/semantics/defs/value';
import '@resources/style/react/element/value.scss';
import cx from 'classnames';
import React, { Component } from 'react';
import { BooleanShape } from '../shape/boolean';
import { NumberShape } from '../shape/number';
import { StringShape } from '../shape/string';

interface ValueElementOwnProps {
    node: StrNode | BoolNode | NumberNode;
}

export class ValueElement extends Component<ValueElementOwnProps> {
  public render() {
    switch (this.props.node.type) {
    case 'bool':
      return (
        <div className={cx('element', this.props.node.type)}>
          <BooleanShape>
            {this.props.node.value.toString()}
          </BooleanShape>
        </div>
      );
    case 'string':
      return (
        <div className={cx('element', this.props.node.type)}>
          <StringShape>
            {this.props.node.value}
          </StringShape>
        </div>
      );
    case 'number':
      return (
        <div className={cx('element', this.props.node.type)}>
          <NumberShape>
            {this.props.node.value.toString()}
          </NumberShape>
        </div>
      );
    }
    
  }
}

export default ValueElement;
