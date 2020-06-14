import { LambdaNode, LambdaArgNode, LambdaVarNode } from '@/semantics/defs';
import '@resources/style/react/element/lambda.scss';
import React, { FunctionComponent } from 'react';
import { connect } from 'react-redux';
import {StageElement} from './base';

interface LambdaArgElementOwnProps {
  node: LambdaArgNode;
}

export const LambdaArgElement: FunctionComponent<LambdaArgElementOwnProps> = 
  (props) => {
    return (
      <div className='element lambda-arg'>
        {props.node.name}
      </div>
    );
  };

  interface LambdaVarElementOwnProps {
    node: LambdaVarNode;
  }

export const LambdaVarElement: FunctionComponent<LambdaVarElementOwnProps> = 
  (props) => {
    return (
      <div className='element lambda-var'>
        {props.node.name}
      </div>
    );
  };

interface LambdaElementOwnProps {
  node: LambdaNode;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface LambdaElementDispatchProps {
  // TODO
}

type LambdaElementProps = 
  LambdaElementOwnProps & 
  LambdaElementDispatchProps;

export const LambdaElementImpl: FunctionComponent<LambdaElementProps> = 
  (props) => {
    return (
      <div className='element lambda'>
        <div className='arg'>
          <StageElement nodeId={props.node.arg} />
        </div>
        <span>
          =&gt;
        </span>
        <div className='body'>
          <StageElement nodeId={props.node.body} />
        </div>
      </div>
    );
  };

export const LambdaElement = connect(
  null, 
  (dispatch, ownProps: LambdaElementOwnProps) => ({
    // TODO
  })
)(LambdaElementImpl);
