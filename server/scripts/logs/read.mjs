import { createReadStream, promises as fs } from 'fs';
import { resolve } from 'path';


const { writeFile, access, mkdir } = fs;

/**
 * Reads logs from a chunk file.
 * @param chunkFilePath The path of the log chunk file to read.
 */
export async function* readLogs(chunkFilePath) {
  const stream = await new Promise((resolve, reject) => {
    const chunkFileStream = createReadStream(chunkFilePath);

    chunkFileStream.on('error', (err) => reject(err));
    chunkFileStream.on('readable', resolve(chunkFileStream));
  });

  let data = '';
  let offset = 0;
  let chunk;
  while (true) {
    chunk = stream.read();
    if (!chunk) break;

    index = chunk.indexOf('\n');
    data += chunk;

    if (index >= 0) {
      yield JSON.parse(data.slice(0, offset + index));
      // +1 to skip the \n
      data = data.slice(offset + index + 1);
    }

    offset += chunk.length;
  }
} 
