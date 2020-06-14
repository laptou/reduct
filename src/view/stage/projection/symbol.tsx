import { SymbolNode } from '@/semantics/defs/value';
import '@resources/style/react/element/symbol.scss';
import React, { FunctionComponent } from 'react';

interface SymbolElementOwnProps {
    node: SymbolNode;
}

export const SymbolElement: FunctionComponent<SymbolElementOwnProps> = 
  (props) => {
    switch (props.node.name) {
    case 'circle':
      return (
        <div className='element symbol circle'>
          <svg className='symbol-view' viewBox='0 0 32 32'>
            <circle className='symbol-item' cx='16' cy='16' r='16' />
          </svg>
        </div>
      );
    case 'rect':
      return (
        <div className='element symbol circle'>
          <svg className='symbol-view' viewBox='0 0 32 32'>
            <rect className='symbol-item' width='32' height='32' />
          </svg>
        </div>
      );
    case 'triangle':
      return (
        <div className='element symbol circle'>
          <svg className='symbol-view' viewBox='0 0 32 32'>
            <polygon className='symbol-item' points='0 32 16 0 32 32' />
          </svg>
        </div>
      );
    case 'star':
      return (
        <div className='element symbol circle'>
          <svg className='symbol-view' viewBox='0 0 32 32'>
            {/* lol, todo */}
            <text className='symbol-item'>STAR</text>
          </svg>
        </div>
      );
    }
  };
