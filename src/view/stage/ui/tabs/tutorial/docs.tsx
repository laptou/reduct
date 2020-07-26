/**
 * @file Component to render documentation from `resources/docs` so the user can
 * read it.
 */

import React from 'react';

import { parseProgram } from '@/syntax/es6';
import doc from  '@resources/docs/node/binop.md';

export const Docs: React.FC = () => {
  const { html, attributes } = doc;

  const setupElement = (el: HTMLDivElement | null) => {
    if (!el) return;
    
    // put HTML in div to parse it
    el.innerHTML = html;

    // search for code elements and sub them out with nodes
    const codeElements = el.getElementsByTagName('code');
  
    for (const codeElement of codeElements) {
      const content = codeElement.innerText;
      const program = parseProgram(content, new Map());
      codeElement.innerText = JSON.stringify(program);
    }
  };

  return (
    <div ref={setupElement} />
  );
};
