import { BoolNode, NumberNode, StrNode } from '@/semantics/defs/value';
import '@resources/style/react/projection/value.scss';
import cx from 'classnames';
import React, { FunctionComponent } from 'react';
import { BooleanShape } from '../shape/boolean';
import { NumberShape } from '../shape/number';
import { StringShape } from '../shape/string';

interface ValueElementOwnProps {
    node: StrNode | BoolNode | NumberNode;
}

export const ValueElement: FunctionComponent<ValueElementOwnProps> = 
  (props) => {
    switch (props.node.type) {
    case 'bool':
      return (
        <div className={cx('element', props.node.type)}>
          <BooleanShape>
            {props.node.value.toString()}
          </BooleanShape>
        </div>
      );
    case 'string':
      return (
        <div className={cx('element', props.node.type)}>
          <StringShape>
            {props.node.value.toString()}
          </StringShape>
        </div>
      );
    case 'number':
      return (
        <div className={cx('element', props.node.type)}>
          <NumberShape>
            {props.node.value.toString()}
          </NumberShape>
        </div>
      );
    }
  };
