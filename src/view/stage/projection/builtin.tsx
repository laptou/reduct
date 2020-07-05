import type { BuiltInReferenceNode } from '@/semantics/defs';
import { DRF, DeepReadonly } from '@/util/helper';
import '@resources/style/react/projection/builtin.scss';
import React, { FunctionComponent } from 'react';
import { getDefinitionForName } from '@/semantics/util';
import { connect } from 'react-redux';
import cx from 'classnames';
import { GlobalState } from '@/reducer/state';

interface BuiltInReferenceProjectionOwnProps {
  node: DRF<BuiltInReferenceNode>;
}

interface BuiltInReferenceProjectionStoreProps {
  /** Is true when the name of this reference is found in the current scope. */
  valid: boolean;
}

type BuiltInReferenceProjectionProps = 
  BuiltInReferenceProjectionOwnProps &
  BuiltInReferenceProjectionStoreProps;

const BuiltInReferenceProjectionImpl: FunctionComponent<BuiltInReferenceProjectionProps> = 
  (props) => {
    const { valid } = props;

    return (
      <div className={cx('projection builtin-reference', { valid })}>
        <div className='builtin-reference-name'>
          {props.node.fields.name}
        </div>
      </div>
    )
  };

export const BuiltInReferenceProjection = connect(
  (
    store: DeepReadonly<GlobalState>, 
    ownProps: BuiltInReferenceProjectionOwnProps
  ) => ({
    valid: getDefinitionForName(ownProps.node.fields.name, ownProps.node, store.program.$present) !== null
  })
)(BuiltInReferenceProjectionImpl);
  