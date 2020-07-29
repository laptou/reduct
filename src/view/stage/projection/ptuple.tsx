import React, { FunctionComponent } from 'react';

import { StageProjection } from './base';

import { PTupleNode } from '@/semantics/defs';
import '@resources/style/react/projection/ptuple.scss';
import { Flat } from '@/semantics';

interface PTupleProjectionOwnProps {
  node: Flat<PTupleNode>;
}

export const PTupleProjection: FunctionComponent<PTupleProjectionOwnProps> = 
  (props) => {
    const children = [];

    for (let idx = 0; idx < props.node.fields.size; idx++) {
      const childId  = props.node.subexpressions[idx];
      if (idx > 0) {
        children.push(<li className='ptuple-separator' key={idx + '-sep'}>,</li>);
      }

      children.push(<li className='ptuple-item' key={idx}><StageProjection nodeId={childId} /></li>);
    }

    return (
      <ul className='projection ptuple'>
        {children}
      </ul>
    );
  };
