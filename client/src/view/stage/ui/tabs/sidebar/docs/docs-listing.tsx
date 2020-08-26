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
      <button
        type='button'
        className='btn btn-special docs-listing-tutorial'
        onClick={goToTutorial}
      >
        ▶️ Tutorial video
      </button>

      <ul className='docs-listing-list'>
        {docs.map(doc => (
          <li
            key={doc.attributes.type}
            className='docs-listing-item'
            onClick={() => setActiveDoc(doc)}
          >
            {doc.attributes.example && (
              <img
                className='docs-listing-item-thumbnail'
                src={require(`@resources/docs/node/${doc.attributes.example}`).default}
              />
            )}
            <label className='docs-listing-item-label'>
              {doc.attributes.name}
            </label>
          </li>
        ))}
      </ul>
      {activeDoc && <DocsPage doc={activeDoc} onExit={() => setActiveDoc(null)} />}
    </div>
  );
};
