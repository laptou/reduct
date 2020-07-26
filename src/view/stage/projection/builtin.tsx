import cx from 'classnames';
import React, { FunctionComponent } from 'react';

import type { BuiltInReferenceNode } from '@/semantics/defs';
import { DRF } from '@/util/helper';

import '@resources/style/react/projection/builtin.scss';

interface BuiltInReferenceProjectionOwnProps {
  node: DRF<BuiltInReferenceNode>;
}

type BuiltInReferenceProjectionProps = 
  BuiltInReferenceProjectionOwnProps;

export const BuiltInReferenceProjection: FunctionComponent<BuiltInReferenceProjectionProps> = 
  (props) => {
    return (
      <div className={cx('projection builtin-reference')}>
        <div className='builtin-reference-name'>
          {props.node.fields.name}
        </div>
      </div>
    );
  };
