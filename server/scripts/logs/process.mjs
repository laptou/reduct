import { promises as fs } from 'fs';
import { dirname, resolve } from 'path';

import GCloudLogging from '@google-cloud/logging';

import { detectExistingLogs } from './detect.mjs';

const { readFile } = fs;

const scriptDirectory = dirname(new URL(import.meta.url).pathname);
const dataDirectory = resolve(scriptDirectory, '../../data');

async function main() {
  const sessions = new Map();
  const {
    latestBatchIndex,
    latestChunkIndices,
    latestEntryId,
  } = detectExistingLogs(dataDirectory);

  for (let batchIndex = 0; batchIndex <= latestBatchIndex; batchIndex++) {
    for (let chunkIndex = 0; chunkIndex <= latestChunkIndices[batchIndex]; chunkIndex++) {
      
    }
  }
}

void main();
