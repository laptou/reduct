import '@resources/style/react/ui/sidebar.scss';
import React from 'react';

import { DefinitionsTab } from './definitions';
import { TutorialTab } from './tutorial';

export const Sidebar: React.FC = () => {
  return (
    <div id='reduct-sidebar'>
      <TutorialTab />
      <DefinitionsTab />
    </div>
  );
};
