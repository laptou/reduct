import { BinOpNode } from '@/semantics/defs';
import '@resources/style/react/element/binop.scss';
import React, { FunctionComponent } from 'react';
import { StageElement } from './base';

interface BinOpElementOwnProps {
    node: BinOpNode;
}

export const BinOpElement: FunctionComponent<BinOpElementOwnProps> = 
  (props) => {
    return (
      <div className='element binop'>
        <svg className='decoration' viewBox='0 0 20 32' preserveAspectRatio='none'>
          <polygon points='0 16 20 0 20 32' />
        </svg>
        <div className='content'>
          <div className='left'>
            <StageElement nodeId={props.node.left} />
          </div>
          <div className='operation'>
            <StageElement nodeId={props.node.op} />
          </div>
          <div className='right'>
            <StageElement nodeId={props.node.right} />
          </div>
        </div>
        <svg className='decoration' viewBox='0 0 20 32' preserveAspectRatio='none'>
          <polygon points='20 16 0 0 0 32' />
        </svg>
      </div>
    )
  };
