import { NodeId } from '@/semantics';
import { InvocationNode, InvocationNode2 } from '@/semantics/defs';
import { DRF } from '@/util/helper';
import '@resources/style/react/projection/reference.scss';
import React, { FunctionComponent } from 'react';
import { StageProjection } from './base';

interface ReferenceProjectionOwnProps {
  node: DRF<InvocationNode | InvocationNode2>;
}

/**
 * TODO It might be more accurate to call this node/projection 'invocation', since
 * it's just used for invoking functions.
 */

export const ReferenceProjection: FunctionComponent<ReferenceProjectionOwnProps> = 
  (props) => {
    let paramIds: Record<string, NodeId> | null = null;

    if ('params' in props.node.fields) {
      paramIds = {};
      for (const param of props.node.fields.params) {
        paramIds[param] = props.node.subexpressions[`arg_${param}`];
      }
    }

    return (
      <div className='projection invocation'>
        <div className='invocation-signature'>
          <div className='invocation-name'>
            {props.node.fields.name}
          </div>
          {
            paramIds
              ? (
                <ul className='invocation-params'>
                  {
                    Object
                      .entries(paramIds)
                      .map(([param, id]) => 
                        <li className='invocation-param' key={param}>
                          <StageProjection nodeId={id}/>
                        </li>
                      )
                  }
                </ul>
              )
              : null
          }
        </div>
      </div>
    )
  };
  