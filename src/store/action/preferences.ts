import { ActionKind } from './game';

export enum PreferenceActionKind {
  EnableSound = 'enable-sound'
}

export type PreferenceAction =
  EnableSoundAction;

export interface EnableSoundAction {
  type: PreferenceActionKind.EnableSound;
  enabled: boolean;
}

export function createEnableSound(enabled: boolean): EnableSoundAction {
  return {
    type: PreferenceActionKind.EnableSound,
    enabled,
  };
}
