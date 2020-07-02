import { createEvalNot } from '@/reducer/action';
import { NotNode } from '@/semantics/defs';
import { DRF } from '@/util/helper';
import '@resources/style/react/projection/not.scss';
import React, { FunctionComponent } from 'react';
import { connect } from 'react-redux';
import { BooleanShape } from '../shape/boolean';
import { StageProjection } from './base';

interface NotProjectionOwnProps {
  node: DRF<NotNode>;
}

interface NotProjectionDispatchProps {
  eval(): void;
}

type NotProjectionProps = 
  NotProjectionOwnProps &
  NotProjectionDispatchProps;

const NotProjectionImpl: FunctionComponent<NotProjectionProps> = 
  (props) => {
    return (
      <div className='projection not'>
        <BooleanShape>
          <span>not</span>
          <StageProjection nodeId={props.node.subexpressions.value} />
        </BooleanShape>
      </div>
    )
  };

export const NotProjection = connect(
  null,
  (dispatch, ownProps: NotProjectionOwnProps) => {
    return {
      eval() { dispatch(createEvalNot(ownProps.node.id)); }
    }
  }
)(NotProjectionImpl);
