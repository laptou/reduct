import { dirname, resolve } from 'path';

import { detectExistingLogs } from './detect.mjs';
import { readChunk } from './read.mjs';

const scriptDirectory = dirname(new URL(import.meta.url).pathname);
const dataDirectory = resolve(scriptDirectory, '../../data');

async function main() {
  const sessions = new Map();
  const {
    batchCount,
    batchChunkCounts,
  } = await detectExistingLogs(dataDirectory);

  let totalEntryCount = 0;

  for (let batchIndex = 0; batchIndex < batchCount; batchIndex++) {

    // iterate chunks in reverse order since chunk0 contains newest log entries
    for (let chunkIndex = batchChunkCounts[batchIndex] - 1; chunkIndex >= 0; chunkIndex--) {
      const chunkFilePath = resolve(dataDirectory, `batch${batchIndex}/chunk${chunkIndex}.json`);
      const chunkEntries = await readChunk(chunkFilePath);

      // iterate entries in reverse order since first log entry is newest
      chunkEntries.reverse();

      for (const entry of chunkEntries) {
        totalEntryCount++;
      }
    }
  }

  console.log(`processed ${totalEntryCount} log entries`);
}

void main();
