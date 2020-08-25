import '@resources/style/react/ui/survey.scss';
import React from 'react';

import { Logo } from './stage/ui/logo';

export const SurveyPage: React.FC = () => {
  return (
    <div id='reduct-survey'>
      <Logo />
      <p>
        Please fill out this survey, then you can close this window. <br />
        Make sure you scroll to the bottom and click Submit.
      </p>
      <iframe src='/survey'>
      </iframe>
    </div>
  );
};
