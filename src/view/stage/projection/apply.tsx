import React, { FunctionComponent } from 'react';

import { StageProjection } from './base';

import { ApplyNode } from '@/semantics/defs';
import { DRF } from '@/util/helper';

import '@resources/style/react/projection/apply.scss';


interface ApplyProjectionOwnProps {
  node: DRF<ApplyNode>;
}

export const ApplyProjection: FunctionComponent<ApplyProjectionOwnProps> =
  (props) => {
    return (
      <div className='projection apply'>
        <div className='apply-callee'>
          <StageProjection nodeId={props.node.subexpressions.callee} />
        </div>
        <div className='apply-param'>
          <StageProjection nodeId={props.node.subexpressions.argument} />
        </div>
      </div>
    );
  };
