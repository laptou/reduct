import { BoolNode, NumberNode, StrNode } from '@/semantics/defs/value';
import '@resources/style/react/projection/value.scss';
import cx from 'classnames';
import React, { FunctionComponent } from 'react';
import { BooleanShape } from '../shape/boolean';
import { NumberShape } from '../shape/number';
import { StringShape } from '../shape/string';

interface ValueProjectionOwnProps {
    node: StrNode | BoolNode | NumberNode;
}

export const ValueProjection: FunctionComponent<ValueProjectionOwnProps> = 
  (props) => {
    switch (props.node.type) {
    case 'bool':
      return (
        <div className='projection bool'>
          <BooleanShape>
            {props.node.fields.value.toString()}
          </BooleanShape>
        </div>
      );
    case 'string':
      return (
        <div className='projection string'>
          <StringShape>
            {props.node.fields.value.toString()}
          </StringShape>
        </div>
      );
    case 'number':
      return (
        <div className='projection number'>
          <NumberShape>
            {props.node.fields.value.toString()}
          </NumberShape>
        </div>
      );
    }
  };
