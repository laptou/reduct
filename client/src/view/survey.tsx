
import '@resources/style/react/ui/credits.scss';
import React from 'react';
import { connect } from 'react-redux';

import { Logo } from './stage/ui/logo';

const SurveyPageImpl: React.FC = () => {
  return (
    <div id='reduct-survey'>
      <Logo />
      <iframe src='/post-survey'>
      </iframe>
    </div>
  );
};

export const SurveyPage = connect(null, null)(SurveyPageImpl);
