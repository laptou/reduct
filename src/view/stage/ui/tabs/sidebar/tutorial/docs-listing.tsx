import React from 'react';

// get all documentation files from Webpack
const context = require.context('@resources/docs/', true, /\.md$/);

export const DocsListing = () => {
  const docs = context.keys().map(key => context(key));
  return (
    <div className='docs-listing'>
      <ul>
        {docs.map(doc => <li key={doc.attributes.name}>{doc.attributes.name}</li>)}
      </ul>
    </div>
  );
};
