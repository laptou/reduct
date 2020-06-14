import { BinOpNode, OpNode } from '@/semantics/defs';
import '@resources/style/react/projection/binop.scss';
import React, { FunctionComponent } from 'react';
import { StageProjection } from './base';
import { connect } from 'react-redux';
import { GlobalState } from '@/reducer/state';
import { Im } from '@/util/im';
import { NumberShape } from '../shape/number';
import { BooleanShape } from '../shape/boolean';

interface BinOpProjectionOwnProps {
  node: BinOpNode;
}

interface BinOpProjectionStoreProps {
  op: OpNode['name'] | null;
}

type BinOpProjectionProps = BinOpProjectionOwnProps & BinOpProjectionStoreProps;

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
              <StageProjection nodeId={props.node.left} />
            </div>
            <div className='operation'>
              <StageProjection nodeId={props.node.op} />
            </div>
            <div className='right'>
              <StageProjection nodeId={props.node.right} />
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
              <StageProjection nodeId={props.node.left} />
            </div>
            <div className='operation'>
              <StageProjection nodeId={props.node.op} />
            </div>
            <div className='right'>
              <StageProjection nodeId={props.node.right} />
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

export const BinOpProjection = connect((store: Im<GlobalState>, ownProps: BinOpProjectionOwnProps) => {
  const opNode = store.get('program').get('$present').get('nodes').get(ownProps.node.op)?.toJS();

  if (opNode && opNode.type === 'op') {
    return { op: opNode.name }
  }

  return { op: null }
})(BinOpProjectionImpl);
