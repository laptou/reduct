import React from 'react';
import cx from 'classnames';

export const Bubble = ({ children, className, ...props }: React.HTMLProps<HTMLDivElement>) => {
  return (
    <div className={cx('reduct-bubble', className)} {...props}>
      <svg className='reduct-bubble-pointer' viewBox='0 0 32 16'>
        <polygon points='16 0 0 16 32 16' />
      </svg>
      <div className='reduct-bubble-inner'>
        {children}
      </div>
    </div>
  );
}
