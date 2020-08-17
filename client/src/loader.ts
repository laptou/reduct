import { Howl } from 'howler';

export let progression: ChapterProgression | null = null;
export const audios = new Map();
export const audioSprites = new Map();

interface AudioManifest {
  urls: string[];
  volumes: Record<string, number>;
  sprite: Record<string, [number, number]>;
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
      onloaderror: reject,
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

  /** Names of chapters which must be completed before this chapter can be
   * attempted. */
  requirements: string[];
}

interface LevelDefinition {
  egg: true;
}

const chapterDigraph: Record<string, string[]> = {
  'functions': ['replication'],
  'replication': ['multiargument'],
  'multiargument': ['booleans-intro'],
  'booleans-intro': ['application'],
  'application': ['definition'],
  'definition': ['testing'],
  'testing': ['lists-intro'],
  'lists-intro': ['lists-query'],
  'lists-query': ['higher-order-functions'],
  'higher-order-functions': ['define-challenges'],
  'define-challenges': ['recursion-basics'],
  'recursion-basics': ['recursion-higher-order'],
  'recursion-higher-order': ['remove-first'],
  'remove-first': ['count-all'],
  'count-all': ['list-functions'],
  'list-functions': ['strings'],
  'strings': ['let'],
  'let': ['play'],
  'play': [],
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
  const sorted = new Set<string>();
  let remaining = chapters.length;

  outer:
  while (remaining > 0) {
    for (const chapter of chapters) {
      const requirementsMet = chapter.requirements.every((chapterKey) => sorted.has(chapterKey));

      if (!requirementsMet || sorted.has(chapter.key)) continue;

      // Set remembers the order in which keys were inserted
      sorted.add(chapter.key);

      remaining--;
      continue outer;
    }

    throw new Error('circular dependency detected in chapter progression');
  }

  progression = { chapters };
  return progression;
}
