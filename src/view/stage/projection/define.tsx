import { DefineNode } from '@/semantics/defs';
import '@resources/style/react/projection/define.scss';
import React, { FunctionComponent } from 'react';
import { StageProjection } from './base';
import { Flat } from '@/semantics';

interface DefineProjectionOwnProps {
    node: Flat<DefineNode>;
}

export const DefineProjection: FunctionComponent<DefineProjectionOwnProps> = 
  (props) => {
    return (
      <div className='projection define'>
        <label className='define-label'>
          def
        </label>
        <div className='define-signature'>
          <div className='define-name'>
            {props.node.fields.name}
          </div>
          <ul className='define-params'>
            {props.node.fields.params.map(param => <li className='define-param' key={param}>{param}</li>)}
          </ul>
        </div>
        <div className='define-body'>
          <StageProjection nodeId={props.node.subexpressions.body} />
        </div>
      </div>
    )
  };
  