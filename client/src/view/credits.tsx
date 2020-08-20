
import '@resources/style/react/ui/consent.scss';
import React from 'react';
import { connect } from 'react-redux';

import { Logo } from './stage/ui/logo';


const CreditsPageImpl: React.FC = (props) => {

  return (
    <div id='reduct-credits'>
      <Logo />

      <p className='credit-primary'>
        Designed and developed by Ibiyemi Abiodun
      </p>

      <p className='credit-primary-ack'>
        with the Cornell Future of Learning Lab, with assistance from Ian Tomasik, and
        input from Andrew Myers, René Kizilcec, François Guimbretière.
      </p>

      <p className='credit-secondary'>
        Based on a previous version of Reduct, developed by:
        <dl>
          <dt>Yiting Wang</dt>
          <dd>Designer, Developer</dd>

          <dt>Yishu Zhang</dt>
          <dd>Designer, Developer</dd>

          <dt>David Li</dt>
          <dd>Designer, Lead Developer</dd>

          <dt>Yuchang Zhou</dt>
          <dd>Artist, UI Designer</dd>

          <dt>Kevin Ma</dt>
          <dd>Artist</dd>

          <dt>Erik Andersen</dt>
          <dd>Advisor</dd>

          <dt>Andrew Myers</dt>
          <dd>Advisor</dd>

          <dt>François Guimbretière</dt>
          <dd>Advisor</dd>

          <dt>Ian Arawjo</dt>
          <dd>Sound Designer, Artist</dd>
        </dl>
      </p>

      <p className='credit-secondary'>
        With respect to the original Reduct team:
        <dl>
          <dt>Ian Arawjo</dt>
          <dd>Designer, Sound Designer, Artist</dd>

          <dt>Shiliang Guo</dt>
          <dd>Developer</dd>

          <dt>David Li</dt>
          <dd>Developer</dd>

          <dt>Kevin Ma</dt>
          <dd>Artist</dd>

          <dt>Erik Andersen</dt>
          <dd>Advisor</dd>

          <dt>Andrew Myers</dt>
          <dd>Advisor</dd>

          <dt>François Guimbretière</dt>
          <dd>Advisor</dd>
        </dl>
      </p>

    </div>
  );
};

export const CreditsPage = connect(null, (dispatch) => ({
}))(CreditsPageImpl);
