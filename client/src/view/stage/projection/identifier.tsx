import React, { FunctionComponent } from 'react';
import { connect } from 'react-redux';
import cx from 'classnames';

import { IdentifierNode } from '@/semantics/defs';
import { DRF, DeepReadonly } from '@/util/helper';
import { getDefinitionForName } from '@/semantics/util';
import { GlobalState } from '@/store/state';
import '@resources/style/react/projection/identifier.scss';

interface IdentifierProjectionOwnProps {
  node: DRF<IdentifierNode>;
}

interface IdentifierProjectionStoreProps {
  /** Is true when the name of this identifier is found in the current scope. */
  valid: boolean;
}

type IdentifierProjectionProps =
  IdentifierProjectionOwnProps &
  IdentifierProjectionStoreProps;

const IdentifierProjectionImpl: FunctionComponent<IdentifierProjectionProps> =
  (props) => {
    const { valid } = props;

    return (
      <div className={cx('projection identifier', { valid })}>
        <div className='identifier-name'>
          {props.node.fields.name}
        </div>
      </div>
    );
  };

export const IdentifierProjection = connect(
  (
    store: DeepReadonly<GlobalState>,
    ownProps: IdentifierProjectionOwnProps
  ) => ({
    valid: getDefinitionForName(ownProps.node.fields.name, ownProps.node, store.game.$present) !== null,
  })
)(IdentifierProjectionImpl);
