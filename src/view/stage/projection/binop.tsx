import { BinOpNode, OpNode } from '@/semantics/defs';
import '@resources/style/react/projection/binop.scss';
import React, { FunctionComponent } from 'react';
import { StageElement } from './base';
import { connect } from 'react-redux';
import { GlobalState } from '@/reducer/state';
import { Im } from '@/util/im';
import { NumberShape } from '../shape/number';
import { BooleanShape } from '../shape/boolean';

interface BinOpElementOwnProps {
  node: BinOpNode;
}

interface BinOpElementStoreProps {
  op: OpNode['name'] | null;
}

type BinOpElementProps = BinOpElementOwnProps & BinOpElementStoreProps;

// TODO: why do we need a separate node for the operation?
// Not Doing That seems simpler

const BinOpElementImpl: FunctionComponent<BinOpElementProps> = 
  (props) => {
    switch (props.op) {
    case '+':
    case '-':
      return (
        <div className='element binop'>
          <NumberShape>
            <div className='left'>
              <StageElement nodeId={props.node.left} />
            </div>
            <div className='operation'>
              <StageElement nodeId={props.node.op} />
            </div>
            <div className='right'>
              <StageElement nodeId={props.node.right} />
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
        <div className='element binop'>
          <BooleanShape>
            <div className='left'>
              <StageElement nodeId={props.node.left} />
            </div>
            <div className='operation'>
              <StageElement nodeId={props.node.op} />
            </div>
            <div className='right'>
              <StageElement nodeId={props.node.right} />
            </div>
          </BooleanShape>
        </div>
      );
    default:
      return (
        <div className='element binop'>
          {`{${props.op}}`}
        </div>
      );
    }
  };

export const BinOpElement = connect((store: Im<GlobalState>, ownProps: BinOpElementOwnProps) => {
  const opNode = store.get('program').get('$present').get('nodes').get(ownProps.node.op)?.toJS();

  if (opNode && opNode.type === 'op') {
    return { op: opNode.name }
  }

  return { op: null }
})(BinOpElementImpl);
