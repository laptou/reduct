import React from 'react';
import cx from 'classnames';

/**
 * A functional component which creates the shape (as in, the actual shape seen
 * on screen) that corresponds to string values.
 */
export function StringShape({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={cx('shape', 'string', className)}>
      <svg className='decoration' viewBox='0 0 12 32' preserveAspectRatio='none'>
        <polygon points='12 0 0 10 0 22 12 32' />
      </svg>
      <div className='content'>
        {children}
      </div>
      <svg className='decoration' viewBox='0 0 12 32' preserveAspectRatio='none'>
        <polygon points='0 0 12 10 12 22 0 32' />
      </svg>
    </div>
  );
}
