import React from 'react';
import cx from 'classnames';

/**
 * A functional component which creates the shape (as in, the actual shape seen
 * on screen) that corresponds to numeric values.
 */
export function NumberShape({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={cx('shape', 'number', className)}>
      <svg className='decoration' viewBox='0 0 4 32' preserveAspectRatio='none'>
        <path d='M4 0 A4 4 0 0 0 0 4 L0 28 A4 4 0 0 0 4 32 Z' />
      </svg>
      <div className='content'>
        {children}
      </div>
      <svg className='decoration' viewBox='0 0 4 32' preserveAspectRatio='none'>
        <path d='M0 0 A4 4 0 0 1 4 4 L4 28 A4 4 0 0 1 0 32 Z' />
      </svg>
    </div>
  );
}
