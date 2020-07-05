import React from 'react';

interface ErrorDisplayProps {
  resetError(): void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = (props) => {
  return (
    <div className='reduct-banner-page'>
      <h1 id='error-message'>Uh oh.</h1>
      <p>
        Reduct has crashed. We&apos;ve been notified about this issue, and will fix it ASAP.
      </p>

      <div className='reduct-banner-actions'>
        <button type='button' onClick={() => props.resetError()}>
          Reset
        </button>
      </div>
    </div>
  );
}
