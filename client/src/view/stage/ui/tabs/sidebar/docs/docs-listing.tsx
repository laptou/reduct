import React, { useState } from 'react';
import { useTransition, animated } from 'react-spring';

import { DocInfo, DocsPage } from './docs-page';

// get all documentation files from Webpack
const context = require.context('@resources/docs/', true, /\.md$/);

export const DocsListing: React.FC = () => {
  const [activeDoc, setActiveDoc] = useState<DocInfo | null>(null);

  const transition = useTransition(activeDoc, null, {
    from: { transform: 'translateX(100%)' },
    enter: { transform: 'translateX(0%)' },
    leave: { transform: 'translateX(100%)' },
  });

  const docs = context.keys().map(key => context(key));

  return (
    <div className='docs-listing-container'>
      <ul className='docs-listing-list'>
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
      {transition.map(({ item, key, props }) => item && (
        <animated.div className='docs-listing-view' key={key} style={props}>
          <button onClick={() => setActiveDoc(null)} type='button'>Back</button>
          <DocsPage doc={item} />
        </animated.div>
      ))}
    </div>
  );
};
