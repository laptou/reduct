import { promises } from 'fs';

/**
 * Reads logs from a chunk file.
 * @param chunkFilePath The path of the log chunk file to read.
 */
export async function readChunk(chunkFilePath) {
  const data = await promises.readFile(chunkFilePath, 'utf-8');

  return data
    .split('\n')
    .filter(line => line.length > 0)
    .map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        console.warn(`could not parse line '${line}':`, e);
      }
    });
}
