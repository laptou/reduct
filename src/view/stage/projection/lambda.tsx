import { LambdaNode, LambdaArgNode, LambdaVarNode } from '@/semantics/defs';
import '@resources/style/react/projection/lambda.scss';
import React, { FunctionComponent } from 'react';
import { connect } from 'react-redux';
import { StageProjection } from './base';

interface LambdaArgProjectionOwnProps {
  node: LambdaArgNode;
}

export const LambdaArgProjection: FunctionComponent<LambdaArgProjectionOwnProps> = 
  (props) => {
    return (
      <div className='projection lambda-arg'>
        {props.node.name}
      </div>
    );
  };

  interface LambdaVarProjectionOwnProps {
    node: LambdaVarNode;
  }

export const LambdaVarProjection: FunctionComponent<LambdaVarProjectionOwnProps> = 
  (props) => {
    return (
      <div className='projection lambda-var'>
        {props.node.name}
      </div>
    );
  };

interface LambdaProjectionOwnProps {
  node: LambdaNode;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface LambdaProjectionDispatchProps {
  // TODO
}

type LambdaProjectionProps = 
  LambdaProjectionOwnProps & 
  LambdaProjectionDispatchProps;

export const LambdaProjectionImpl: FunctionComponent<LambdaProjectionProps> = 
  (props) => {
    return (
      <div className='projection lambda'>
        <div className='arg'>
          <StageProjection nodeId={props.node.arg} />
        </div>
        <span className='arrow'>
          =&gt;
        </span>
        <div className='body'>
          <StageProjection nodeId={props.node.body} />
        </div>
      </div>
    );
  };

export const LambdaProjection = connect(
  null, 
  (dispatch, ownProps: LambdaProjectionOwnProps) => ({
    // TODO
  })
)(LambdaProjectionImpl);
