import React from 'react';
import '@resources/style/react/ui/loading.scss';

export const LoadingAnimation: React.FC = () => {
  return (
    <svg className='reduct-loading-anim' viewBox='0 0 32 32'>
      <rect
        className='reduct-loading-anim-square'
        x='8' y='8'
        width='16' height='16'
      />
    </svg>
  );
};

export const LoadingAnimationWithText: React.FC = () => {
  return (
    <div className='reduct-loading-anim-with-text'>
      <LoadingAnimation />
      <span className='reduct-loading-text'>
        loading...
      </span>
    </div>
  );
};

export const LoadingPage: React.FC = () => {
  return (
    <div className='reduct-loading-page'>
      <LoadingAnimationWithText />
    </div>
  );
};
