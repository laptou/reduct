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
  let numRetries = 0;

  let entriesChunk = [];
  let pageToken;

  console.log('starting export of logs');

  while (true) {
    let entries, response;

    try {
      [entries, , response] = await Logging.getEntries({
        log: 'projects/reduct-285602/logs/user',
        filter: 'logName="projects/reduct-285602/logs/user"',
        pageSize: 500,
        pageToken,
      });
    } catch (error) {
      console.error(`failed to read page "${pageToken}"`);
      console.error(error);

      if (numRetries < 20) {
        console.info('waiting 10 seconds and retrying...');
        await new Promise(res => setTimeout(res, 10000));
        numRetries++;
        continue;
      } else {
        console.error('too many retries, giving up');
        break;
      }
    }

    if (entries.length === 0) {
      if (entriesChunk.length > 0) {
        await flush(entriesChunk, numChunksDownloaded);
        entriesChunk = [];
        numChunksDownloaded++;
        console.log(`exported ${numChunksDownloaded} log chunks`);
        global.gc();
      }

      break;
    }

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

    pageToken = response.nextPageToken;
    numRetries = 0;
  }

  console.log('done');
}

async function flush(entriesChunk, index) {
  const processedEntriesChunk = entriesChunk.map(entry => {
    const time = entry.metadata.timestamp;
    const eventId = entry.metadata.insertId;
    const { message, metadata } = entry.data;

    if (metadata.nodes) {
      if (metadata.nodes.moved) metadata.nodes.moved = metadata.nodes.moved.id;
      if (metadata.nodes.executed) metadata.nodes.executed = metadata.nodes.executed.id;
      if (metadata.nodes.added) metadata.nodes.added = metadata.nodes.added.map(n => n.node.id);
      if (metadata.nodes.removed) metadata.nodes.removed = metadata.nodes.removed.map(n => n.node.id);
    }

    return {
      time,
      eventId,
      message,
      ...metadata,
    };
  });

  const jsonEntriesChunk = processedEntriesChunk.map(JSON.stringify);

  const chunkPath = resolve(dataDirectory, `chunk${index}.json`);
  const chunkData = jsonEntriesChunk.join('\n');

  await writeFile(chunkPath, chunkData);
}

void main();
