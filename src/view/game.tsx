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
import { TutorialTab } from './stage/ui/tabs/sidebar/tutorial';
import { DefinitionsTab } from './stage/ui/tabs/sidebar/definitions';

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
  case GameMode.Victory:
  case GameMode.Defeat:
    return (
      <>
        <Board />
        <ToolboxTab />
        <GoalTab />
        <GameMenuTab />
        <HistoryTab />
        <Sidebar>
          <Sidebar.Section title='Tutorial'>
            <TutorialTab />
          </Sidebar.Section>
          <Sidebar.Section title='Definitions'>
            <DefinitionsTab />
          </Sidebar.Section>
        </Sidebar>
        {props.mode === GameMode.Victory && <VictoryOverlay />}
        {props.mode === GameMode.Defeat && <DefeatOverlay />}
      </>
    );
  }
  
}

export const Game = connect((state: DeepReadonly<GlobalState>) => ({
  mode: state.game.$present.mode,
}))(GameImpl);
