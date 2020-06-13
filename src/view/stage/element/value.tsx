import { BoolNode, NumberNode, StrNode } from '@/semantics/defs/value';
import cx from 'classnames';
import React, { Component } from 'react';
import '@resources/style/react/element/value.scss';

interface ValueElementOwnProps {
    node: StrNode | BoolNode | NumberNode;
}

export class ValueElement extends Component<ValueElementOwnProps> {
  public render() {
    switch (this.props.node.type) {
    case 'bool':
      return (
        <div className={cx('element', this.props.node.type)}>
          <svg className='decoration' viewBox='0 0 20 32' preserveAspectRatio='none'>
            <polygon points='0 16 20 0 20 32' />
          </svg>
          <div className='content'>
            {this.props.node.value.toString()}
          </div>
          <svg className='decoration' viewBox='0 0 20 32' preserveAspectRatio='none'>
            <polygon points='20 16 0 0 0 32' />
          </svg>
        </div>
      );
    case 'string':
      return (
        <div className={cx('element', this.props.node.type)}>
          <svg className='decoration' viewBox='0 0 12 32' preserveAspectRatio='none'>
            <polygon points='12 0 0 10 0 22 12 32' />
          </svg>
          <div className='content'>
            {this.props.node.value}
          </div>
          <svg className='decoration' viewBox='0 0 12 32' preserveAspectRatio='none'>
            <polygon points='0 0 12 10 12 22 0 32' />
          </svg>
        </div>
      );
    case 'number':
      return (
        <div className={cx('element', this.props.node.type)}>
          <svg className='decoration' viewBox='0 0 4 32' preserveAspectRatio='none'>
            <path d='M4 0 A4 4 0 0 0 0 4 L0 28 A4 4 0 0 0 4 32 Z' />
          </svg>
          <div className='content'>
            {this.props.node.value.toString()}
          </div>
          <svg className='decoration' viewBox='0 0 4 32' preserveAspectRatio='none'>
            <path d='M0 0 A4 4 0 0 1 4 4 L4 28 A4 4 0 0 1 0 32 Z' />
          </svg>
        </div>
      );
    }
    
  }
}

export default ValueElement;
