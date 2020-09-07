import React, { FunctionComponent } from 'react';


import { BooleanShape } from '../shape/boolean';
import { NumberShape } from '../shape/number';
import { StringShape } from '../shape/string';

import { BoolNode, NumberNode, StrNode } from '@/semantics/defs/value';
import { Flat } from '@/semantics';
import '@resources/style/react/projection/value.scss';

interface ValueProjectionOwnProps {
  node: Flat<StrNode> | Flat<BoolNode> | Flat<NumberNode>;
}

export const ValueProjection: FunctionComponent<ValueProjectionOwnProps> =
  (props) => {
    switch (props.node.type) {
    case 'boolean':
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
            &quot;{props.node.fields.value}&quot;
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
