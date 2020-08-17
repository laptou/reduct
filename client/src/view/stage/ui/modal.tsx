import React from 'react';
import { createPortal } from 'react-dom';

export const Modal: React.FC = (props) => {
  return createPortal(
    <div id="react-reduct-modal-overlay">
      {props.children}
    </div>,
    document.getElementById('react-reduct-modal-container')!
  );
};
