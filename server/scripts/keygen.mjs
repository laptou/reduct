
import { promises as fs } from 'fs';
import { resolve, dirname } from 'path';
import { randomBytes } from 'crypto';

const { writeFile } = fs;

void (async () => {
  // __dirname does not work in ES modules
  const scriptDirectory = dirname(new URL(import.meta.url).pathname);

  const secretFileName = resolve(scriptDirectory, '../secret/session.base64');
  const secretData =
    await new Promise((res, rej) =>
      randomBytes(
        4096,
        (err, buf) => err ? rej(err) : res(buf)
      ));

  await writeFile(secretFileName, secretData.toString('base64'), 'utf-8');

  console.log('created session secret key at secret/session.base64');
})();
