import React, { useState } from 'react';
import { useTransition, animated } from 'react-spring';

import { DocInfo, DocsPage } from './docs-page';

import { createGoToTutorial } from '@/store/action/game';
import { store } from '@/store';

// get all documentation files from Webpack
const context = require.context('@resources/docs/', true, /\.md$/);

// can't use React-Redux connect() here b/c the documentation panel has its own
// separate store but navigation state is kept in the global store
function goToTutorial () {
  store.dispatch(createGoToTutorial());
}

export const DocsListing: React.FC = () => {
  const [activeDoc, setActiveDoc] = useState<DocInfo | null>(null);

  const docs = context.keys().map(key => context(key));

  return (
    <div className='docs-listing-container'>
      <ul className='docs-listing-list'>
        <li
          className='docs-listing-item'
          onClick={goToTutorial}
        >
          Tutorial video
        </li>
        {docs.map(doc => (
          <li
            key={doc.attributes.type}
            className='docs-listing-item'
            onClick={() => setActiveDoc(doc)}
          >
            {doc.attributes.name}
          </li>
        ))}
      </ul>
      {activeDoc && <DocsPage doc={activeDoc} onExit={() => setActiveDoc(null)} />}
    </div>
  );
};
