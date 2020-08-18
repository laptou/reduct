import React from 'react';
import { connect } from 'react-redux';

import { DefeatOverlay } from './stage/ui/modals/defeat';
import { Title } from './stage/ui/modals/title';
import { VictoryOverlay } from './stage/ui/modals/victory';
import { Board } from './stage/ui/board';
import { GoalTab } from './stage/ui/tabs/goal';
import { HistoryTab } from './stage/ui/tabs/history';
import { GameMenuTab } from './stage/ui/tabs/menu';
import { ToolboxTab } from './stage/ui/tabs/toolbox';
import { Sidebar } from './stage/ui/tabs/sidebar';
import { TutorialTab } from './stage/ui/tabs/sidebar/tutorial';
import { DefinitionsTab } from './stage/ui/tabs/sidebar/definitions';
import { FeedbackCollectorPopup } from './stage/ui/feedback-collector';
import { Logo } from './stage/ui/logo';

import { DeepReadonly } from '@/util/helper';
import { GameMode, GlobalState } from '@/store/state';
import '@resources/style/react/ui/game.scss';

interface GameStoreProps
{
  mode: GameMode;
}

const GameImpl: React.FC<GameStoreProps> = (props) => {
  switch (props.mode) {
  case GameMode.Title:
    return (
      <Title />
    );

  case GameMode.Gameplay:
    return (
      <>
        <Logo id='reduct-game-logo' />
        <Board />
        <ToolboxTab />
        <GoalTab />
        <GameMenuTab />
        <HistoryTab />
        <Sidebar>
          <Sidebar.Section title='Tutorial' isOpen={true}>
            <TutorialTab />
          </Sidebar.Section>
          <Sidebar.Section title='Global Scope' isOpen={true}>
            <DefinitionsTab />
          </Sidebar.Section>
        </Sidebar>
        <FeedbackCollectorPopup />
        <VictoryOverlay />
        <DefeatOverlay />
      </>
    );
  default:
    return <>`not implemented: game mode ${props.mode}`</>;
  }
};

export const Game = connect((state: DeepReadonly<GlobalState>) => ({
  mode: state.game.$present.mode,
}))(GameImpl);
