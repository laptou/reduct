import React from 'react';
import { createPortal } from 'react-dom';
import '@resources/style/react/ui/modals.scss';

export const Modal: React.FC<React.HTMLAttributes<HTMLDivElement>> =
  (props) => {
    return createPortal(
      <div id="reduct-modal-overlay" {...props} />,
      document.getElementById('reduct-modal')!
    );
  };
