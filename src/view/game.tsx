import React from 'react';
import { connect } from 'react-redux';

import { Board } from './stage/ui/board';
import { DefeatOverlay } from './banner/defeat';
import { Definitions } from './stage/ui/tabs/definitions';
import { Goal } from './stage/ui/tabs/goal';
import { History } from './stage/ui/tabs/history';
import { LevelSelect } from './stage/ui/tabs/menu/level';
import { Title } from './banner/title';
import { Toolbox } from './stage/ui/tabs/toolbox';
import { VictoryOverlay } from './banner/victory';
import { GameMenu } from './stage/ui/tabs/menu';
import { Docs } from './stage/ui/tabs/tutorial/docs';

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
        {/* for testing only */}
        <Docs />
        <Board />
        <Toolbox />
        <Definitions />
        <Goal />
        <GameMenu />
        <History />
      </>
    );

  case GameMode.Victory:
    return (
      <>
        <Board />
        <Toolbox />
        <Definitions />
        <Goal />
        <GameMenu />
        <History />
        <VictoryOverlay />
      </>
    );

  case GameMode.Defeat:
    return (
      <>
        <Board />
        <Toolbox />
        <Definitions />
        <Goal />
        <GameMenu />
        <History />
        <DefeatOverlay />
      </>
    );
  }
  
}

export const Game = connect((state: DeepReadonly<GlobalState>) => ({
  mode: state.game.$present.mode,
}))(GameImpl);
