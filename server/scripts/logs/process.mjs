import { dirname, resolve } from 'path';

import { detectExistingLogs } from './detect.mjs';
import { readChunk } from './read.mjs';

const scriptDirectory = dirname(new URL(import.meta.url).pathname);
const dataDirectory = resolve(scriptDirectory, '../../data');

/**
 * @typedef SessionInfo
 * @property {boolean | null} consent
 * @property {Date | null} startTime
 * @property {number} levelsCompleted
 * @property {Record<string | number, LevelInfo>} levelInfos
 * @property {LevelInfo} currentLevelInfo
 */

/**
  * @typedef LevelInfo
  * @property {number} index
  * @property {Date | null} startTime
  * @property {number} totalDuration
  * @property {boolean} complete
  */

async function main() {
  /** @type {Map<string, SessionInfo>} */
  const sessions = new Map();
  const {
    batchCount,
    batchChunkCounts,
  } = await detectExistingLogs(dataDirectory);

  let totalEntryCount = 0;
  const startTime = new Date('2020-08-28T06:00:00-05:00');

  for (let batchIndex = 0; batchIndex < batchCount; batchIndex++) {

    // iterate chunks in reverse order since chunk0 contains newest log entries
    for (let chunkIndex = batchChunkCounts[batchIndex] - 1; chunkIndex >= 0; chunkIndex--) {
      const chunkFilePath = resolve(dataDirectory, `batch${batchIndex}/chunk${chunkIndex}.json`);
      const chunkEntries = await readChunk(chunkFilePath);

      // iterate entries in reverse order since first log entry is newest
      chunkEntries.reverse();

      for (const entry of chunkEntries) {
        const time = new Date(entry.time);

        if (time < startTime) continue;

        const session = getOrDefault(sessions, entry.netId, {
          consent: null,
          startTime: null,
          levelsCompleted: 0,
          levelInfos: {},
          currentLevelInfo: {
            index: 0,
            startTime: null,
            totalDuration: null,
            complete: false,
          },
        });

        if (entry.netId === 'td273')
          console.log(entry);

        switch (entry.action) {
        case 'session:start':
          if (!session.startTime) {
            session.startTime = time;
          }
          break;
        case 'game:reset-time':
          session.startTime = time;
          break;
        case 'research:consent':
          session.consent = entry.consent;
          break;
        case 'game:stats': {
          const numCompleted = Object
            .entries(entry.levels)
            .filter(([, stats]) => stats.complete)
            .length;

          if (numCompleted > session.levelsCompleted) {
            session.levelsCompleted = Math.max(numCompleted, session.levelsCompleted);
            session.levelInfos = entry.levels;
          }

          if (entry.netId === 'td273')
            debugger;

          break;
        }
        case 'game:start-level':
          session.currentLevelInfo.index = entry.levelIndex;
          session.currentLevelInfo.startTime = time;
          break;
        case 'game:victory': {
          if (session.levelInfos[session.currentLevelInfo.index]) continue;

          session.currentLevelInfo.complete = true;
          const duration = +time - session.currentLevelInfo.startTime;
          session.currentLevelInfo.totalDuration = duration;
          session.levelInfos[session.currentLevelInfo.index] = session.currentLevelInfo;
          session.currentLevelInfo = {
            index: session.currentLevelInfo.index + 1,
            startTime: null,
            totalDuration: null,
            complete: false,
          };

          if (entry.netId === 'td273')
            debugger;

          const numCompleted = Object
            .entries(session.levelInfos)
            .filter(([, stats]) => stats.complete)
            .length;
          session.levelsCompleted = Math.max(numCompleted, session.levelsCompleted);
          break;
        }
        }
        totalEntryCount++;
      }
    }
  }

  console.log(`processed ${totalEntryCount} log entries`);
  console.log(`records found for ${sessions.size} NetIDs`);

  const researchPlayers = Array.from(sessions).filter(([, session]) => session.consent === true);
  const noResearchPlayers = Array.from(sessions).filter(([, session]) => session.consent === false);

  console.log(`${researchPlayers.length} players consented to research`);
  console.log(`${noResearchPlayers.length} players did not consent to research`);

  for (const [netId, session] of sessions) {
    const totalGameDuration = Object
      .values(session.levelInfos)
      .map(levelInfo => levelInfo.totalDuration)
      .reduce((acc, item) => acc + item, 0);

    console.log(
      `${netId}:\t`
      + `started ${session.startTime}\t`
      + `completed ${session.levelsCompleted}\t`
      + `in ${totalGameDuration}ms (${totalGameDuration / 60 / 1000}min)`);
  }
}

/**
 *
 * @param {Map<unknown, T>} map
 * @param {unknown} key
 * @param {T} defaultValue
 * @returns {T}
 * @template T
 */
function getOrDefault(map, key, defaultValue) {
  const value = map.get(key);

  if (value === undefined) {
    map.set(key, defaultValue);
    return defaultValue;
  }

  return value;
}

void main();
