import { GameMode, GlobalState } from '@/store/state';
import { DeepReadonly } from '@/util/helper';
import React from 'react';
import { connect } from 'react-redux';
import { Board } from './stage/ui/board';
import { DefeatOverlay } from './banner/defeat';
import { Definitions } from './stage/ui/definitions';
import { Goal } from './stage/ui/goal';
import { History } from './stage/ui/history';
import { LevelMenu } from './stage/ui/level';
import { Title } from './banner/title';
import { Toolbox } from './stage/ui/toolbox';
import { VictoryOverlay } from './banner/victory';

interface GameStoreProps
{
  mode: GameMode;
}

// TODO: fix type for `store`
function GameImpl(props: GameStoreProps) {
  switch (props.mode) {
  case GameMode.Title: {
    return (
      <>
        <Title />
      </>
    );
  }

  case GameMode.Gameplay: {
    return (
      <>
        <Board />
        <Toolbox />
        <Definitions />
        <Goal />
        <LevelMenu />
        <History />
      </>
    )
  }

  case GameMode.Victory: {
    return (
      <>
        <Board />
        <Toolbox />
        <Definitions />
        <Goal />
        <LevelMenu />
        <History />
        <VictoryOverlay/>
      </>
    )
  }

  case GameMode.Defeat: {
    return (
      <>
        <Board />
        <Toolbox />
        <Definitions />
        <Goal />
        <LevelMenu />
        <History />
        <DefeatOverlay />
      </>
    )
  }
  }
  
}

export const Game = connect((state: DeepReadonly<GlobalState>) => ({
  mode: state.program.$present.mode
}))(GameImpl);
