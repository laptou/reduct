import React, { FunctionComponent } from 'react';

import { BooleanShape } from '../shape/boolean';

import { StageProjection } from './base';

import { NotNode } from '@/semantics/defs';
import { DRF } from '@/util/helper';

import '@resources/style/react/projection/not.scss';






interface NotProjectionOwnProps {
  node: DRF<NotNode>;
}

type NotProjectionProps =
  NotProjectionOwnProps;

export const NotProjection: FunctionComponent<NotProjectionProps> =
  (props) => {
    return (
      <div className='projection not'>
        <BooleanShape>
          <span>not</span>
          <StageProjection nodeId={props.node.subexpressions.value} />
        </BooleanShape>
      </div>
    );
  };
