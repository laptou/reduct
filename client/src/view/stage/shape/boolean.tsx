import React from 'react';
import cx from 'classnames';

/**
 * A functional component which creates the shape (as in, the actual shape seen
 * on screen) that corresponds to boolean values.
 */
export function BooleanShape({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={cx('shape', 'boolean', className)}>
      <svg className='decoration' viewBox='0 0 20 32' preserveAspectRatio='none'>
        <polygon points='0 16 20 0 20 32' />
      </svg>
      <div className='content'>
        {children}
      </div>
      <svg className='decoration' viewBox='0 0 20 32' preserveAspectRatio='none'>
        <polygon points='20 16 0 0 0 32' />
      </svg>
    </div>
  );
}
