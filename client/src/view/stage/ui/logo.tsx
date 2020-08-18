import React from 'react';

import ReductLogo from '@resources/graphics/titles/logo.svg';

export const Logo: React.FC<React.HTMLAttributes<HTMLImageElement>> = (props) => {
  return <img src={ReductLogo} {...props} />;
};
