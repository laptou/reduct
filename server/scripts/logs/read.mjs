import { createReadStream } from 'fs';

/**
 * Reads logs from a chunk file.
 * @param chunkFilePath The path of the log chunk file to read.
 */
export async function readChunk(chunkFilePath) {
  const data = await new Promise((resolve, reject) => {
    const chunkFileStream = createReadStream(chunkFilePath, { encoding: 'utf-8' });
    let data = '';

    chunkFileStream.on('error', (err) => reject(err));
    chunkFileStream.on('readable', () => {
      while (true) {
        const chunk = chunkFileStream.read();
        if (chunk === null) break;
        data += chunk;
      }
    });

    chunkFileStream.on('end', () => resolve(data));
  });

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
