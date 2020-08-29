import { dirname, resolve } from 'path';
import { promises as fs } from 'fs';

import GCloudLogging from '@google-cloud/logging';

const { writeFile } = fs;
const Logging = new GCloudLogging.Logging();

const scriptDirectory = dirname(new URL(import.meta.url).pathname);
const dataDirectory = resolve(scriptDirectory, '../data');

async function main() {
  let numEntriesDownloaded = 0;
  let numChunksDownloaded = 0;

  let entriesChunk = [];
  let nextPageToken;

  while (true) {
    const [entries, , res] = await Logging.getEntries({
      log: 'projects/reduct-285602/logs/user',
      pageSize: 500,
      nextPageToken,
    });

    if (entries.length === 0)
      break;

    numEntriesDownloaded += entries.length;
    console.log(`downloaded ${numEntriesDownloaded} log entries`);

    entriesChunk.push(...entries);

    if (entriesChunk.length >= 3000) {
      await flush(entriesChunk, numChunksDownloaded);
      entriesChunk = [];
      numChunksDownloaded++;
      console.log(`exported ${numChunksDownloaded} log chunks`);
      global.gc();
    }

    nextPageToken = res.nextPageToken;
  }

  console.log('done');
}

async function flush(entriesChunk, index) {
  const chunkPath = resolve(dataDirectory, `chunk${index}.json`);
  const chunkData = JSON.stringify(entriesChunk);

  await writeFile(chunkPath, chunkData);
}

void main();
