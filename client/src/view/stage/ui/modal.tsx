import React from 'react';
import { createPortal } from 'react-dom';

export const Modal: React.FC = (props) => {
  return createPortal(
    <div id="reduct-modal-overlay">
      {props.children}
    </div>,
    document.getElementById('reduct-modal')!
  );
};
