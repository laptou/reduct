import React from 'react';
import { createPortal } from 'react-dom';
import '@resources/style/react/ui/modals.scss';

export const Modal: React.FC = (props) => {
  return createPortal(
    <div id="reduct-modal-overlay">
      {props.children}
    </div>,
    document.getElementById('reduct-modal')!
  );
};
