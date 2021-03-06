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
   * The ID of the node which was returned by the most recent reduction.
   */
  returned: NodeId[];

  /**
   * Used to set the error if the reducer needs to throw an error and return a
   * new state at the same time.
   */
  error?: GameError;
}

export enum GameMode {
  Tutorial,
  Title,
  Gameplay,
  Credits,
  Survey,
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

export interface StatsState {
  /**
   * Statistics about all of the levels the user has played.
   */
  levels: Map<number, LevelCompletionStats>;

  /**
   * Intermediate stats for the level the user is currently playing.
   */
  current: LevelCompletionStats | null;

  /**
   * The time at which the user started the first level.
   */
  startTime: number | null;
}

export interface LevelCompletionStats {
  levelIndex: number;

  /**
   * Duration in milliseconds it took the player to complete the level.
   * Null if the player has not completed the level.
   */
  totalDuration: number | null;

  /**
   * Duration in milliseconds that the user spent in this level. This is
   * different from totalDuration, which is the time between when the user first
   * opened the level and when they completed it.
   */
  playDuration: number | null;

  /**
   * The time at which the user started on this level.
   */
  startTime: number;

  /**
   * The time at which the user resumed working on this level after navigating
   * away to another level.
   */
  resumeTime: number;

  /**
   * Whether or not this level was solved.
   */
  complete: boolean;
}

export interface GlobalState {
  game: UndoableGameState;
  preferences: PreferenceState;
  stats: StatsState;
}
