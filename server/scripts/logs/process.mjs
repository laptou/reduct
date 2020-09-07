import { dirname, resolve } from 'path';
import { createWriteStream, promises as fs } from 'fs';

import csv from 'csv';

import { detectExistingLogs } from './detect.mjs';
import { readChunk } from './read.mjs';

const { mkdir, writeFile } = fs;
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
  const recordsByNetId = new Map();
  const statsByNetId = new Map();
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
            startTime: time,
            resumeTime: time,
            totalDuration: null,
            complete: false,
          },
        });

        const recordsForNetId = getOrDefault(recordsByNetId, entry.netId, []);

        switch (entry.action) {
        case 'session:start':
          if (!session.startTime) {
            session.startTime = time;
          }
          recordsForNetId.push(entry);
          break;
        case 'game:reset-time':
          session.startTime = time;
          recordsForNetId.push(entry);
          break;
        case 'research:consent':
          session.consent = entry.consent;

          // reset everything b/c this event means that they reset their cookies
          session.levelsCompleted = 0;
          session.levelInfos = {};
          session.currentLevelInfo = {
            index: 0,
            startTime: time,
            resumeTime: time,
            totalDuration: null,
            complete: false,
          };

          recordsForNetId.push(entry);
          break;
        case 'game:stats': {
          const existing = statsByNetId.get(entry.netId);

          if (!existing) {
            statsByNetId.set(entry.netId, entry.levels);
            break;
          }

          const numCompleted = Object
            .entries(entry.levels)
            .filter(([, stats]) => stats.complete)
            .length;

          const oldNumCompleted = Object
            .entries(existing)
            .filter(([, stats]) => stats.complete)
            .length;

          if (numCompleted > oldNumCompleted) {
            statsByNetId.set(entry.netId, entry.levels);
          }

          recordsForNetId.push(entry);
          break;
        }
        case 'game:start-level':
          session.levelInfos[session.currentLevelInfo.index] = session.currentLevelInfo;
          session.currentLevelInfo = entry.levelIndex in session.levelInfos
            ? session.levelInfos[entry.levelIndex]
            : (session.levelInfos[entry.levelIndex] = {
              index: entry.levelIndex,
              startTime: time,
              resumeTime: time,
              totalDuration: null,
              complete: false,
            });

          session.currentLevelInfo.resumeTime = time;
          recordsForNetId.push(entry);
          break;
        case 'game:victory': {
          if (!session.currentLevelInfo) {
            console.warn(`found victory with no start-level: ${entry.eventId}`);
            continue;
          }

          session.currentLevelInfo.complete = true;
          const duration = +time - session.currentLevelInfo.resumeTime;
          session.currentLevelInfo.totalDuration = duration;
          session.levelInfos[session.currentLevelInfo.index] = session.currentLevelInfo;
          session.currentLevelInfo = entry.levelIndex in session.levelInfos
            ? session.levelInfos[entry.levelIndex]
            : (session.levelInfos[entry.levelIndex] = {
              index: entry.levelIndex,
              startTime: time,
              resumeTime: time,
              totalDuration: null,
              complete: false,
            });

          const numCompleted = Object
            .entries(session.levelInfos)
            .filter(([, stats]) => stats.complete)
            .length;
          session.levelsCompleted = Math.max(numCompleted, session.levelsCompleted);
          recordsForNetId.push(entry);
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

  const columns = ['netId', 'mode'];
  for (let i = 0; i < 32; i++) {
    columns.push(`level${i}`);
  }
  columns.push('total');

  const str = csv.stringify({
    header: true,
    columns,
  });

  for (const [netId, session] of sessions) {
    const totalGameDuration = Object
      .values(session.levelInfos)
      .map(levelInfo => levelInfo.totalDuration)
      .reduce((acc, item) => acc + item, 0);

    console.log(
      `${netId}:\t`
      + `started ${session.startTime}\t`
      + `completed ${session.levelsCompleted}\t`
      + `in ${totalGameDuration}ms (${(totalGameDuration / 60 / 1000).toFixed(2)}min)`);


    const serverInfo = session.levelInfos;
    const clientInfo = statsByNetId.get(netId);

    const serverCsvEntry = {
      netId,
      mode: 'server',
      total: 0,
    };

    const clientCsvEntry = {
      netId,
      mode: 'client',
      total: 0,
    };

    for (let i = 0; i < 32; i++) {
      const serverLevelInfo = serverInfo && serverInfo[i];
      const clientLevelInfo = clientInfo && clientInfo[i];

      if (serverLevelInfo && serverLevelInfo.complete) {
        const duration = serverLevelInfo.totalDuration > 1000
          ? serverLevelInfo.totalDuration / 60 / 1000
          : 0.5;
        serverCsvEntry[`level${i}`] = duration.toFixed(3);
        serverCsvEntry.total += duration;
      }

      if (clientLevelInfo && clientLevelInfo.complete) {
        const duration = clientLevelInfo.playDuration / 60 / 1000;

        clientCsvEntry[`level${i}`] = duration.toFixed(3);
        clientCsvEntry.total += duration;
      }
    }

    str.write(serverCsvEntry);
    str.write(clientCsvEntry);
  }

  str.pipe(createWriteStream(resolve(dataDirectory, 'players/_all.csv')));

  for (const [netId, entries] of recordsByNetId) {
    await writeFile(
      resolve(dataDirectory, `players/${netId}.json`),
      entries.map(JSON.stringify).join('\n'),
      'utf-8'
    );
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
