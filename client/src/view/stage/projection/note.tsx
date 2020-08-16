import React, { FunctionComponent } from 'react';

import { NoteNode } from '@/semantics/defs/note';
import { DRF } from '@/util/helper';

import '@resources/style/react/projection/value.scss';

interface NoteProjectionOwnProps {
  node: DRF<NoteNode>;
}

export const NoteProjection: FunctionComponent<NoteProjectionOwnProps> =
  (props) => {
    return (
      <div className='projection note'>
        {props.node.fields.text}
      </div>
    );
  };
