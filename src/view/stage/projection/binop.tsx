import { GlobalState } from '@/reducer/state';
import { Flat, NodeId } from '@/semantics';
import { BinOpNode, OpNode } from '@/semantics/defs';
import { DeepReadonly } from '@/util/helper';
import '@resources/style/react/projection/binop.scss';
import React, { FunctionComponent } from 'react';
import { connect } from 'react-redux';
import { BooleanShape } from '../shape/boolean';
import { NumberShape } from '../shape/number';
import { StageProjection } from './base';
import { createEvalOperator } from '@/reducer/action';

interface BinOpProjectionOwnProps {
  node: Flat<BinOpNode>;
}

interface BinOpProjectionStoreProps {
  op: OpNode['fields']['name'] | null;
}

interface BinOpProjectionDispatchProps {
  eval(): void;
}

type BinOpProjectionProps = 
  BinOpProjectionOwnProps & 
  BinOpProjectionStoreProps & 
  BinOpProjectionDispatchProps;

// TODO: why do we need a separate node for the operation?
// Not Doing That seems simpler

function onClick(
  event: React.MouseEvent<HTMLDivElement>,
  props: BinOpProjectionProps
) {
  // cannot evaluate locked nodes
  if (props.node.locked && props.node.parent)
    return;

  // stop parent projections from hijacking the click
  event.stopPropagation();

  props.eval();
};

const BinOpProjectionImpl: FunctionComponent<BinOpProjectionProps> = 
  (props) => {
    switch (props.op) {
    case '+':
    case '-':
      return (
        <div className='projection binop' onClick={e => onClick(e, props)}>
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
        <div className='projection binop' onClick={e => onClick(e, props)}>
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
        <div className='projection binop' onClick={e => onClick(e, props)}>
          {`{${props.op}}`}
        </div>
      );
    }
  };

export const BinOpProjection = connect(
  (store: DeepReadonly<GlobalState>, ownProps: BinOpProjectionOwnProps) => {
    const opNode = store.program.$present.nodes.get(ownProps.node.subexpressions.op);

    if (opNode && opNode.type === 'op') {
      return { op: opNode.fields.name }
    }

    return { op: null }
  },
  (dispatch, ownProps) => {
    return {
      eval() { dispatch(createEvalOperator(ownProps.node.id)); }
    }
  })(BinOpProjectionImpl);
