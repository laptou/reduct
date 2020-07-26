import React, { FunctionComponent } from 'react';
import { connect } from 'react-redux';
import cx from 'classnames';

import { ReferenceNode } from '@/semantics/defs';
import { DRF, DeepReadonly } from '@/util/helper';
import { getDefinitionForName } from '@/semantics/util';
import { GlobalState } from '@/store/state';
import '@resources/style/react/projection/reference.scss';

interface ReferenceProjectionOwnProps {
  node: DRF<ReferenceNode>;
}

interface ReferenceProjectionStoreProps {
  /** Is true when the name of this reference is found in the current scope. */
  valid: boolean;
}

type ReferenceProjectionProps = 
  ReferenceProjectionOwnProps &
  ReferenceProjectionStoreProps;

const ReferenceProjectionImpl: FunctionComponent<ReferenceProjectionProps> = 
  (props) => {
    const { valid } = props;

    return (
      <div className={cx('projection reference', { valid })}>
        <div className='reference-name'>
          {props.node.fields.name}
        </div>
      </div>
    );
  };

export const ReferenceProjection = connect(
  (
    store: DeepReadonly<GlobalState>, 
    ownProps: ReferenceProjectionOwnProps
  ) => ({
    valid: getDefinitionForName(ownProps.node.fields.name, ownProps.node, store.game.$present) !== null,
  })
)(ReferenceProjectionImpl);
  