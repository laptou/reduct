import React, { FunctionComponent } from 'react';

import { StageProjection } from './base';

import { ReferenceNode } from '@/semantics/defs';
import { DRF } from '@/util/helper';

import '@resources/style/react/projection/reference.scss';

interface ReferenceProjectionOwnProps {
  node: DRF<ReferenceNode>;
}

type ReferenceProjectionProps =
  ReferenceProjectionOwnProps;

export const ReferenceProjection: FunctionComponent<ReferenceProjectionProps> =
  (props) => {

    return (
      <div className='projection reference'>
        <div className='reference-symbol'>
          @
        </div>
        <div className='reference-target'>
          <StageProjection nodeId={props.node.fields.target} />
        </div>
      </div>
    );
  };
