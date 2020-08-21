import type { UndoableGameState } from './reducer/undo';
import type { GameError } from './errors';

import type { NodeId, NodeMap } from '@/semantics';

export interface GameState {
  /**
   * Represents which part of the game we are currently in: title screen,
   * gameplay, victory, or defeat.
   */
  mode: GameMode;

  /**
   * The index of the current level.
   */
  level: number;

  /**
   * Maps all of the IDs of nodes that currently exist to their respective
   * nodes.
   */
  nodes: NodeMap;

  /**
   * IDs of nodes which are currently in the goal area.
   */
  goal: Set<NodeId>;

  /**
   * IDs of nodes which are currently on the board.
   */
  board: Set<NodeId>;

  /**
   * IDs of nodes which are currently in the toolbox.
   */
  toolbox: Set<NodeId>;


  globals: Map<string, NodeId>;

  /**
   * Values are root nodes which are currently in the documentation section.
   * Keys are for mapping each node to its corresponding part of the
   * documentation.
   */
  docs: Map<string, NodeId>;

  /**
   * Nodes which were added by the most recent action. The values are the
   * "sources" of the nodes: for example, if you step an addition operator and
   * get a number, the "source" of the number node is the addition node.
   */
  added: Map<NodeId, NodeId | null>;

  /**
   * Nodes which were removed by the most recent action.
   */
  removed: Map<NodeId, boolean>;

  /**
   * Nodes which are currently executing (i.e., stepping themselves without the
   * user having to click them).
   */
  executing: Set<NodeId>;

  /**
   * Used to set the error if the reducer needs to throw an error and return a
   * new state at the same time.
   */
  error?: GameError;
}

export enum GameMode {
  Title,
  Gameplay,
  Credits,
}

export type ResearchConsentState =
  null | // consent not asked for
  true | // consent given
  false; // consent explicitly not given

export interface PreferenceState {
  /**
   * Enable playing sound effects.
   */
  enableSounds: boolean;

  /**
   * Enable usage of the user's data for research.
   */
  enableResearch: ResearchConsentState;
}

export interface GlobalState {
  game: UndoableGameState;
  preferences: PreferenceState;
}
