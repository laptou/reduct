import '@resources/style/react/ui/game.scss';
import React from 'react';
import { connect } from 'react-redux';

import { Board } from './stage/ui/board';
import { FeedbackCollectorPopup } from './stage/ui/feedback-collector';
import { Logo } from './stage/ui/logo';
import { DefeatOverlay } from './stage/ui/modals/defeat';
import { TitlePage } from './stage/ui/modals/title';
import { VictoryOverlay } from './stage/ui/modals/victory';
import { GoalTab } from './stage/ui/tabs/goal';
import { HistoryTab } from './stage/ui/tabs/history';
import { GameMenuTab } from './stage/ui/tabs/menu';
import { Sidebar } from './stage/ui/tabs/sidebar';
import { DefinitionsTab } from './stage/ui/tabs/sidebar/definitions';
import { DocsTab } from './stage/ui/tabs/sidebar/docs';
import { ToolboxTab } from './stage/ui/tabs/toolbox';
import { ConsentPage } from './consent';
import { CreditsPage } from './credits';
import { TimeOverlay } from './stage/ui/modals/time';
import { SurveyPage } from './survey';
import { TutorialPage } from './tutorial';

import { GameMode, GlobalState, ResearchConsentState } from '@/store/state';
import { DeepReadonly } from '@/util/helper';

interface GameStoreProps
{
  mode: GameMode;
  consent: ResearchConsentState;
}

const GameImpl: React.FC<GameStoreProps> = (props) => {
  const { mode, consent } = props;

  if (consent === null) {
    return <ConsentPage />;
  }

  switch (mode) {
  case GameMode.Tutorial:
    return <TutorialPage />;

  case GameMode.Title:
    return <TitlePage />;

  case GameMode.Gameplay:
    return (
      <div id='reduct-game'>
        <Logo id='reduct-game-logo' />
        <Board />
        <ToolboxTab />
        <GoalTab />
        <GameMenuTab />
        <HistoryTab />
        <Sidebar>
          <Sidebar.Section title='Docs' isOpen={true}>
            <DocsTab />
          </Sidebar.Section>
          <Sidebar.Section title='Global Scope' isOpen={true}>
            <DefinitionsTab />
          </Sidebar.Section>
        </Sidebar>
        <FeedbackCollectorPopup />
        <VictoryOverlay />
        <DefeatOverlay />
        <TimeOverlay />
      </div>
    );

  case GameMode.Credits:
    return <CreditsPage />;

  case GameMode.Survey:
    return <SurveyPage />;

  default:
    return <>not implemented: game mode {props.mode}</>;
  }
};

export const Game = connect((state: DeepReadonly<GlobalState>) => ({
  mode: state.game.$present.mode,
  consent: state.preferences.enableResearch,
}))(GameImpl);
