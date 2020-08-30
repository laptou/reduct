import { promises as fs } from 'fs';
import { dirname, resolve } from 'path';

import GCloudLogging from '@google-cloud/logging';

import { detectExistingLogs } from './detect.mjs';

const { writeFile, mkdir } = fs;
const Logging = new GCloudLogging.Logging();

const scriptDirectory = dirname(new URL(import.meta.url).pathname);
const dataDirectory = resolve(scriptDirectory, '../../data');

async function main() {
  if (!global.gc) {
    console.error('usage: node --expose-gc download.mjs');
  }

  let numEntriesDownloaded = 0;
  let numChunksDownloaded = 0;
  let numRetries = 0;

  let entriesChunk = [];
  let pageToken;

  console.log('starting export of logs');

  const {
    batchCount,
    batchChunkCounts,
    latestEntryId,
  } = await detectExistingLogs(dataDirectory);

  if (batchCount > 0) {
    console.log(`detected ${batchCount} existing batches`);

    const latestChunkCount = batchChunkCounts[batchCount - 1];

    if (latestChunkCount > 0) {
      console.log(`detected ${latestChunkCount} chunks in the most recent batch`);
    } else {
      console.error('no chunks were detected in most recent batch, exiting');
      console.info(
        'if you started this script and then terminated it before '
      + 'it could write any data, delete the empty batch folder.'
      );
      return;
    }

    if (latestEntryId !== null) {
      console.log(`downloading until entry ${latestEntryId}`);
    } else {
      console.info(
        'if you started this script and then terminated it before '
      + 'it could finish writing data, delete the empty chunk file.'
      );
      console.error('no entries were detected in most recent chunk, exiting');
      return;
    }
  }

  const newBatchIndex = batchCount;
  const newBatchDir = resolve(dataDirectory, `batch${newBatchIndex}`);

  await mkdir(newBatchDir);

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

    numEntriesDownloaded += entries.length;
    console.log(`downloaded ${numEntriesDownloaded} log entries`);

    entriesChunk.push(...entries);

    // find index of an entry we've already downloaded
    const existingEntryIndex = entriesChunk.findIndex(
      entry => entry.metadata.insertId === latestEntryId
    );

    if (entriesChunk.length >= 3000 || existingEntryIndex >= 0) {
      await flush(
        entriesChunk.slice(0, existingEntryIndex > 0 ? existingEntryIndex : undefined),
        numChunksDownloaded,
        newBatchDir,
        latestEntryId
      );

      entriesChunk = [];
      numChunksDownloaded++;
      console.log(`exported ${numChunksDownloaded} log chunks`);
      global.gc();

      if (existingEntryIndex >= 0) {
        console.log('reached an event that has already been downloaded');
        break;
      }

      if (entries.length === 0) {
        console.log('reached the end of the log');
        break;
      }
    }

    pageToken = response.nextPageToken;
    numRetries = 0;
  }

  console.log('done');
}

async function flush(entriesChunk, index, dir) {
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

  const chunkPath = resolve(dir, `chunk${index}.json`);
  const chunkData = jsonEntriesChunk.join('\n');

  await writeFile(chunkPath, chunkData);
}

void main();
