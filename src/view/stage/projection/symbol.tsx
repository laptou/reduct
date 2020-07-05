import { SymbolNode } from '@/semantics/defs/value';
import '@resources/style/react/projection/symbol.scss';
import React, { FunctionComponent } from 'react';
import { Flat } from '@/semantics';

interface SymbolProjectionOwnProps {
  node: Flat<SymbolNode>;
}

export const SymbolProjection: FunctionComponent<SymbolProjectionOwnProps> = 
  (props) => {
    switch (props.node.fields.name) {
    case 'circle':
      return (
        <div className='projection symbol circle'>
          <svg className='symbol-view' viewBox='0 0 32 32'>
            <circle className='symbol-item' cx='16' cy='16' r='16' />
          </svg>
        </div>
      );
    case 'rect':
      return (
        <div className='projection symbol rect'>
          <svg className='symbol-view' viewBox='0 0 32 32'>
            <rect className='symbol-item' width='32' height='32' />
          </svg>
        </div>
      );
    case 'triangle':
      return (
        <div className='projection symbol triangle'>
          <svg className='symbol-view' viewBox='0 0 32 32'>
            <polygon className='symbol-item' points='0 32 16 0 32 32' />
          </svg>
        </div>
      );
    case 'star':
      return (
        <div className='projection symbol star'>
          <svg className='symbol-view' viewBox='0 0 32 32'>
            <path className='symbol-item' d="M16 0L19.5922 11.0557H31.2169L21.8123 17.8885L25.4046 28.9443L16 22.1115L6.59544 28.9443L10.1877 17.8885L0.783095 11.0557H12.4078L16 0Z" />
          </svg>
        </div>
      );
    }
  };
