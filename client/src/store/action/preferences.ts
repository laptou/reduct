export enum PreferenceActionKind {
  EnableSound = 'enable-sound',
  EnableResearch = 'enable-research'
}

export type PreferenceAction =
  EnableSoundAction |
  EnableResearchAction;

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

export interface EnableResearchAction {
  type: PreferenceActionKind.EnableResearch;
  enabled: boolean;
}

export function createEnableResearch(enabled: boolean): EnableResearchAction {
  return {
    type: PreferenceActionKind.EnableResearch,
    enabled,
  };
}
