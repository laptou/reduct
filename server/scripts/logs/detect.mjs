import { createReadStream, promises as fs } from 'fs';
import { resolve } from 'path';


const { writeFile, access, mkdir } = fs;

/**
 * Detects logs that have already been downloaded into `dataDirectory`.
 * @param dataDirectory The folder in which to look for logs.
 */
export async function detectExistingLogs(dataDirectory) {
  let batchCount = 0;

  while (true) {
    try {
      const batchFolderPath = resolve(
        dataDirectory,
        `batch${batchCount}`
      );
      await access(batchFolderPath);
      batchCount++;
    } catch {
      break;
    }
  }

  const batchChunkCounts = [];

  for (let batchIndex = 0; batchIndex < batchCount; batchIndex++) {
    let batchChunkCount = 0;

    while (true) {
      try {
        const chunkFilePath = resolve(
          dataDirectory,
          `batch${batchIndex}/chunk${batchChunkCount}.json`
        );
        await access(chunkFilePath);
        batchChunkCount++;
      } catch {
        break;
      }
    }

    batchChunkCounts.push(batchChunkCount);
  }

  if (
    batchChunkCounts.length === 0 || 
    batchChunkCounts[batchChunkCounts.length - 1] === 0
  ) {
    return {
      batchCount,
      batchChunkCounts,
      latestEntryId: null,
    };
  }

  const latestChunkFilePath = resolve(
    dataDirectory,
    `batch${batchCount - 1}/chunk0.json`
  );

  const latestEntryLine = await new Promise((resolve, reject) => {
    const latestChunkFileStream = createReadStream(latestChunkFilePath);
    let offset = 0, index = 0, data = '';

    latestChunkFileStream.on('close', () => resolve(data.slice(0, offset + index)));
    latestChunkFileStream.on('error', (err) => reject(err));
    latestChunkFileStream.on('data', (chunk) => {
      index = chunk.indexOf('\n');
      data += chunk;
      if (index !== -1) {
        latestChunkFileStream.close();
      } else {
        offset += chunk.length;
      }
    });
  });

  try {
    const latestEntryData = JSON.parse(latestEntryLine);

    const latestEntryId = latestEntryData.eventId;

    return {
      batchCount,
      batchChunkCounts,
      latestEntryId,
    };

  } catch {
    return {
      batchCount,
      batchChunkCounts,
      latestEntryId: null,
    };
  }
}
