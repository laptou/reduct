import React, { Suspense } from 'react';
import { Provider } from 'react-redux';
import { createStore, combineReducers } from 'redux';

import '@resources/style/react/ui/tutorial.scss';

import { gameReducer } from '@/store/reducer/game';
import { undoableReducer } from '@/store/reducer/undo';

const DocsListing = React.lazy(() => 
  import('./docs-listing').then(({ DocsListing }) => ({ default: DocsListing }))
);

// docs get their own Redux store so that their state changes do not interfere
// with game
const rootReducer = combineReducers({
  game: undoableReducer(gameReducer),
});

const tutorialStore = createStore(rootReducer);

export const TutorialTab: React.FC = () => {
  return (
    <div id='reduct-tutorial'>
      <Provider store={tutorialStore}>
        <Suspense fallback={'loading the docs...'}>
          <DocsListing />
        </Suspense>
      </Provider>
    </div>
  );
};
