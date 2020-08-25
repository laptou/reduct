
import '@resources/style/react/ui/tutorial.scss';
import React from 'react';
import { connect } from 'react-redux';

import { Logo } from './stage/ui/logo';

import { createGoToTitle } from '@/store/action/game';

interface TutorialPageDispatchProps {
  goToTitle(): void;
}

const TutorialPageImpl: React.FC<TutorialPageDispatchProps> = (props) => {
  const { goToTitle } = props;

  return (
    <div id='reduct-tutorial'>
      <h1 id='reduct-tutorial-header'>
        <Logo /> | Tutorial
      </h1>

      <iframe
        src='https://www.youtube-nocookie.com/embed/9LYjOL72qO8?rel=0&apos;modestbranding=1'
        frameBorder='0'
        allow='accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture'
        allowFullScreen
      >
      </iframe>

      <button
        id='reduct-tutorial-continue'
        type='button'
        className='btn btn-primary'
        onClick={goToTitle}
      >
        Continue
      </button>
    </div>
  );
};

export const TutorialPage = connect(
  null,
  (dispatch) => ({
    goToTitle() { dispatch(createGoToTitle()); },
  })
)(TutorialPageImpl);

