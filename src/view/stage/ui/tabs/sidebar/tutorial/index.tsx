import React from 'react';

import { Docs } from './docs';

import '@resources/style/react/ui/tutorial.scss';

export const TutorialTab: React.FC = () => {
  return (
    <div id='reduct-tutorial'>
      <Docs />
    </div>
  );
};
