import React from 'react';
import { connect } from 'react-redux';

import { DefeatOverlay } from './banner/defeat';
import { Title } from './banner/title';
import { VictoryOverlay } from './banner/victory';
import { Board } from './stage/ui/board';
import { DefinitionsTab } from './stage/ui/tabs/definitions';
import { GoalTab } from './stage/ui/tabs/goal';
import { HistoryTab } from './stage/ui/tabs/history';
import { GameMenuTab } from './stage/ui/tabs/menu';
import { ToolboxTab } from './stage/ui/tabs/toolbox';
import { Docs } from './stage/ui/tabs/tutorial/docs';

import { DeepReadonly } from '@/util/helper';
import { GameMode, GlobalState } from '@/store/state';
import { TutorialTab } from './stage/ui/tabs/tutorial';

interface GameStoreProps
{
  mode: GameMode;
}

// TODO: fix type for `store`
function GameImpl(props: GameStoreProps) {
  switch (props.mode) {
  case GameMode.Title:
    return (
      <Title />
    );

  case GameMode.Gameplay:
    return (
      <>
        <Board />
        <TutorialTab />
        <ToolboxTab />
        <DefinitionsTab />
        <GoalTab />
        <GameMenuTab />
        <HistoryTab />
      </>
    );

  case GameMode.Victory:
    return (
      <>
        <Board />
        <TutorialTab />
        <ToolboxTab />
        <DefinitionsTab />
        <GoalTab />
        <GameMenuTab />
        <HistoryTab />
        <VictoryOverlay />
      </>
    );

  case GameMode.Defeat:
    return (
      <>
        <Board />
        <TutorialTab />
        <ToolboxTab />
        <DefinitionsTab />
        <GoalTab />
        <GameMenuTab />
        <HistoryTab />
        <DefeatOverlay />
      </>
    );
  }
  
}

export const Game = connect((state: DeepReadonly<GlobalState>) => ({
  mode: state.game.$present.mode,
}))(GameImpl);
