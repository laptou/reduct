import React, { useEffect } from 'react';

import { Modal } from '../modal';

import { log } from '@/logging/logger';

interface ErrorDisplayProps {
  resetError(): void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = (props) => {
  useEffect(() => {
    log('game:crash');
  }, []);

  return (
    <Modal>
      <div
        className='reduct-error-modal'
      >
        <h1 className='reduct-error-modal-title'>Uh oh.</h1>

        <p className='reduct-error-modal-text'>
          Reduct has crashed. We&apos;ve been notified about this issue, and will fix it ASAP.

        </p>

        <div className='reduct-error-modal-actions'>
          <button
            type='button'
            onClick={() => props.resetError()}
            className='btn btn-primary'
          >
            Reset
          </button>
        </div>
      </div>
    </Modal>
  );
};
