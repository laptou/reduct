import { InvocationNode, InvocationNode2 } from '@/semantics/defs';
import '@resources/style/react/element/reference.scss';
import React, { FunctionComponent } from 'react';
import { StageElement } from './base';
import { NodeId } from '@/semantics';

interface ReferenceElementOwnProps {
    node: InvocationNode | InvocationNode2;
}

/**
 * TODO It might be more accurate to call this node/element 'invocation', since
 * it's just used for invoking functions.
 */

export const ReferenceElement: FunctionComponent<ReferenceElementOwnProps> = 
  (props) => {
    let paramIds: Record<string, NodeId> | null = null;

    if ('params' in props.node) {
      paramIds = {};
      for (const param of props.node.params) {
        paramIds[param] = props.node[`arg_${param}`];
      }
    }

    return (
      <div className='element invocation'>
        <div className='signature'>
          <div className='name'>
            {props.node.name}
          </div>
          {
            paramIds
              ? (
                <ul className='params'>
                  {
                    Object
                      .entries(paramIds)
                      .map(([param, id]) => <li className='param' key={param}><StageElement nodeId={id}/></li>)
                  }
                </ul>
              )
              : null
          }
        </div>
      </div>
    )
  };
  