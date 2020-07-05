import { GameMode, GlobalState } from '@/reducer/state';
import { DeepReadonly } from '@/util/helper';
import React from 'react';
import { connect } from 'react-redux';
import { Board } from './stage/board';
import { Defeat } from './stage/defeat';
import { Definitions } from './stage/definitions';
import { Goal } from './stage/goal';
import { History } from './stage/history';
import { LevelInfo } from './stage/level';
import { Title } from './stage/title';
import { Toolbox } from './stage/toolbox';
import { Victory } from './stage/victory';

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
        <LevelInfo />
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
        <LevelInfo />
        <History />
        <Victory/>
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
        <LevelInfo />
        <History />
        <Defeat />
      </>
    )
  }
  }
  
}

export const Game = connect((state: DeepReadonly<GlobalState>) => ({
  mode: state.program.$present.mode
}))(GameImpl);
