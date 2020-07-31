import React from 'react';
import { connect } from 'react-redux';

import { DefeatOverlay } from './banner/defeat';
import { Title } from './banner/title';
import { VictoryOverlay } from './banner/victory';
import { Board } from './stage/ui/board';
import { GoalTab } from './stage/ui/tabs/goal';
import { HistoryTab } from './stage/ui/tabs/history';
import { GameMenuTab } from './stage/ui/tabs/menu';
import { ToolboxTab } from './stage/ui/tabs/toolbox';
import { Sidebar } from './stage/ui/tabs/sidebar';

import { DeepReadonly } from '@/util/helper';
import { GameMode, GlobalState } from '@/store/state';

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
        <ToolboxTab />
        <GoalTab />
        <GameMenuTab />
        <HistoryTab />
        <Sidebar />
      </>
    );

  case GameMode.Victory:
    return (
      <>
        <Board />
        <ToolboxTab />
        <GoalTab />
        <GameMenuTab />
        <HistoryTab />
        <Sidebar />
        <VictoryOverlay />
      </>
    );

  case GameMode.Defeat:
    return (
      <>
        <Board />
        <ToolboxTab />
        <GoalTab />
        <GameMenuTab />
        <HistoryTab />
        <DefinitionsTab />
        <DefeatOverlay />
      </>
    );
  }
  
}

export const Game = connect((state: DeepReadonly<GlobalState>) => ({
  mode: state.game.$present.mode,
}))(GameImpl);
