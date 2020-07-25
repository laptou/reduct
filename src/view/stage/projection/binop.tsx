import { GlobalState } from '@/store/state';
import { Flat, NodeId } from '@/semantics';
import { BinOpNode, OpNode } from '@/semantics/defs';
import { DeepReadonly } from '@/util/helper';
import '@resources/style/react/projection/binop.scss';
import React, { FunctionComponent } from 'react';
import { connect } from 'react-redux';
import { BooleanShape } from '../shape/boolean';
import { NumberShape } from '../shape/number';
import { StageProjection } from './base';
import { createEvalOperator } from '@/store/action/game';

interface BinOpProjectionOwnProps {
  node: Flat<BinOpNode>;
}

interface BinOpProjectionStoreProps {
  op: OpNode['fields']['name'] | null;
}

type BinOpProjectionProps = 
  BinOpProjectionOwnProps & 
  BinOpProjectionStoreProps;

// TODO: why do we need a separate node for the operation?
// Not Doing That seems simpler

const BinOpProjectionImpl: FunctionComponent<BinOpProjectionProps> = 
  (props) => {
    switch (props.op) {
    case '+':
    case '-':
      return (
        <div className='projection binop'>
          <NumberShape>
            <div className='left'>
              <StageProjection nodeId={props.node.subexpressions.left} />
            </div>
            <div className='operation'>
              <StageProjection nodeId={props.node.subexpressions.op} />
            </div>
            <div className='right'>
              <StageProjection nodeId={props.node.subexpressions.right} />
            </div>
          </NumberShape>
        </div>
      );
    case '<':
    case '>':
    case '&&':
    case '||':
    case '==':
      return (
        <div className='projection binop'>
          <BooleanShape>
            <div className='left'>
              <StageProjection nodeId={props.node.subexpressions.left} />
            </div>
            <div className='operation'>
              <StageProjection nodeId={props.node.subexpressions.op} />
            </div>
            <div className='right'>
              <StageProjection nodeId={props.node.subexpressions.right} />
            </div>
          </BooleanShape>
        </div>
      );
    default:
      return (
        <div className='projection binop'>
          {`{${props.op}}`}
        </div>
      );
    }
  };

export const BinOpProjection = connect(
  (store: DeepReadonly<GlobalState>, ownProps: BinOpProjectionOwnProps) => {
    const opNode = store.game.$present.nodes.get(ownProps.node.subexpressions.op);

    if (opNode && opNode.type === 'op') {
      return { op: opNode.fields.name }
    }

    return { op: null }
  }
)(BinOpProjectionImpl);
