/**
 * @file Component to render documentation from `resources/docs` so the user can
 * read it.
 */

import React from 'react';

import doc from  '@resources/docs/node/binop.md';

export const Docs: React.FC = () => {
  const { html, attributes } = doc;
};
