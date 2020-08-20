
import '@resources/style/react/ui/credits.scss';
import React from 'react';
import { connect } from 'react-redux';

import { Logo } from './stage/ui/logo';

import { createToggleCredits } from '@/store/action/game';

interface CreditsPageDispatchProps {
  back(): void;
}

const CreditsPageImpl: React.FC<CreditsPageDispatchProps> = (props) => {
  const { back } = props;

  return (
    <div id='reduct-credits'>
      <button
        type='button'
        className='btn btn-default'
        id='reduct-credits-btn-back'
        onClick={back}
      >
        Back
      </button>

      <Logo />

      <p className='credit-version'>v{PKG_VERSION} {PKG_ENV}</p>

      <p className='credit-primary'>
        Designed and developed by Ibiyemi Abiodun
      </p>

      <p className='credit-primary-ack'>
        in association with the Cornell Future of Learning Lab
      </p>
      <p className='credit-primary-ack'>
        with assistance from Ian Tomasik
      </p>
      <p className='credit-primary-ack'>
        and with input from Prof. Andrew Myers, Prof. René Kizilcec,
        and Prof. François Guimbretière.
      </p>

      <p className='credit-secondary'>
        Based on a previous version of Reduct, developed by:
        <dl>
          <div className='credit-secondary-group'>
            <dt>David Li</dt>
            <dd>Lead Developer</dd>
            <dd>Designer</dd>
          </div>

          <div className='credit-secondary-group'>
            <dt>Yiting Wang</dt>
            <dd>Designer</dd>
            <dd>Developer</dd>
          </div>

          <div className='credit-secondary-group'>
            <dt>Yishu Zhang</dt>
            <dd>Designer</dd>
            <dd>Developer</dd>
          </div>

          <div className='credit-secondary-group'>
            <dt>Yuchang Zhou</dt>
            <dd>UI Designer</dd>
            <dd>Artist</dd>
          </div>

          <div className='credit-secondary-group'>
            <dt>Ian Arawjo</dt>
            <dd>Sound Designer</dd>
            <dd>Artist</dd>
          </div>

          <div className='credit-secondary-group'>
            <dt>Kevin Ma</dt>
            <dd>Artist</dd>
          </div>

          <div className='credit-secondary-group'>
            <dt>Erik Andersen</dt>
            <dd>Advisor</dd>
          </div>

          <div className='credit-secondary-group'>
            <dt>Andrew Myers</dt>
            <dd>Advisor</dd>
          </div>

          <div className='credit-secondary-group'>
            <dt>François Guimbretière</dt>
            <dd>Advisor</dd>
          </div>
        </dl>
      </p>

      <p className='credit-secondary'>
        With respect to the original Reduct team:
        <dl>
          <div className='credit-secondary-group'>
            <dt>Ian Arawjo</dt>
            <dd>Designer</dd>
            <dd>Artist</dd>
          </div>

          <div className='credit-secondary-group'>
            <dt>Shiliang Guo</dt>
            <dd>Developer</dd>
          </div>

          <div className='credit-secondary-group'>
            <dt>David Li</dt>
            <dd>Developer</dd>
          </div>

          <div className='credit-secondary-group'>
            <dt>Kevin Ma</dt>
            <dd>Artist</dd>
          </div>

          <div className='credit-secondary-group'>
            <dt>Erik Andersen</dt>
            <dd>Advisor</dd>
          </div>

          <div className='credit-secondary-group'>
            <dt>Andrew Myers</dt>
            <dd>Advisor</dd>
          </div>

          <div className='credit-secondary-group'>
            <dt>François Guimbretière</dt>
            <dd>Advisor</dd>
          </div>
        </dl>
      </p>

    </div>
  );
};

export const CreditsPage = connect(null, (dispatch) => ({
  back() { dispatch(createToggleCredits()); },
}))(CreditsPageImpl);
