import { Howl } from 'howler';

export let progression: ChapterProgression | null = null;
export const audios = new Map<string, Howl>();
export const audioSprites = new Map<string, Howl>();

interface AudioManifest {
  urls: string[];
  volumes: Record<string, number>;
  sprite: Record<string, [number, number]>;
}

export async function loadAudio(key: string): Promise<void> {
  const { default: audioFileUri } = await import(`@resources/audio/${key}.mp3`);

  return new Promise((resolve, reject) => {
    const audio = new Howl({
      src: audioFileUri,
      onload: () => {
        audios.set(key, audio);
        resolve();
      },
      onloaderror: () => reject(`failed to load audio ${key}`),
    });
  });
}

export async function loadAudioSprite(key: string): Promise<void> {
  const audioManifest =
    await import(`@resources/audio/${key}.json`) as AudioManifest;

  const audioFileUris = await Promise.all(
    audioManifest.urls.map(
      (uri) => import(`@resources/audio/${uri}`)
        .then((mod) => mod.default)
    )
  );

  return new Promise((resolve, reject) => {
    const audio = new Howl({
      src: audioFileUris,
      sprite: audioManifest.sprite,
      onload: () => {
        for (const spriteKey of Object.keys(audioManifest.sprite)) {
          audios.set(spriteKey, audio);
        }

        resolve();
      },
      onloaderror: () => reject(`failed to load audio sprite ${key}`),
    });

    audioSprites.set(key, audio);
  });
}

interface ChapterProgression {
  chapters: ChapterDefinition[];
}

interface ChapterDefinition {
  /**
   * The name of this chapter.
   */
  name: string;

  /**
   * The codename of this chapter.
   */
  key: string;

  /**
   * Levels contained in this chapter.
   */
  levels: LevelDefinition[];

  /**
   * The index of this chapter in the progression.
   */
  index: number;

  /** Names of chapters which must be completed before this chapter can be
   * attempted. */
  requirements: string[];
}

interface LevelDefinition {
  board: string[];
  toolbox: string[];
  goal: string[];
  globals: Record<string, string>;
  textgoal?: string;
}

const chapterDigraph: Record<string, string[]> = {
  functions: ['booleans'],
  booleans: [],
};

async function loadChapter(key: string): Promise<ChapterDefinition> {
  const chapterManifest = await import(`@resources/levels-progression/${key}.json`);
  chapterManifest.key = key;
  chapterManifest.requirements = chapterDigraph[key];
  return chapterManifest;
}

export async function loadChapters(): Promise<ChapterProgression> {
  if (progression) return progression;

  const chapters = await Promise.all(Object.keys(chapterDigraph).map(loadChapter));

  // sort chapters according to digraph using topological sort
  const sorted = new Map<string, ChapterDefinition>();
  let remaining = chapters.length;

  outer:
  while (remaining > 0) {
    for (const chapter of chapters) {
      const requirementsMet = chapter.requirements.every((chapterKey) => sorted.has(chapterKey));

      if (!requirementsMet || sorted.has(chapter.key)) continue;

      chapter.index = sorted.size;

      // Map remembers the order in which keys were inserted
      sorted.set(chapter.key, chapter);

      remaining--;
      continue outer;
    }

    throw new Error('circular dependency detected in chapter progression');
  }

  progression = { chapters: [...sorted.values()] };
  return progression;
}

export function getLevelByIndex(index: number): LevelDefinition {
  let current = 0;

  for (const chapter of progression!.chapters) {
    if (current + chapter.levels.length < index) {
      current += chapter.levels.length;
      continue;
    }

    return chapter.levels[index - current];
  }

  throw new Error(`level ${index} was not found`);
}

export function getChapterByLevelIndex(index: number): ChapterDefinition {
  let current = 0;

  for (const chapter of progression!.chapters) {
    if (current + chapter.levels.length < index) {
      current += chapter.levels.length;
      continue;
    }

    return chapter;
  }

  throw new Error(`chapter for level ${index} was not found`);
}
