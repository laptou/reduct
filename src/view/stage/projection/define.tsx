import { DefineNode } from '@/semantics/defs';
import { DRF } from '@/util/helper';
import '@resources/style/react/projection/define.scss';
import React, { FunctionComponent } from 'react';
import { StageProjection } from './base';

interface DefineProjectionOwnProps {
    node: DRF<DefineNode>;
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
  