/**
 * @file Utility script to split the output.wav audio sprite into individual
 * files using FFMpeg.
 * @author Ibiyemi Abiodun
 */

const fs = require('fs');
const path = require('path');
const child = require('child_process');

(async () => {
  const audioDir = path.resolve(__dirname, '../resources/audio');
  const manifestPath = path.resolve(audioDir, 'output.json');

  console.info(`located audio manifest at ${manifestPath}`);

  const manifestData = await new Promise((resolve, reject) => {
    fs.readFile(manifestPath, 'utf-8', (err, data) => err ? reject(err) : resolve(data))
  });

  const manifest = JSON.parse(manifestData);

  console.info('parsed audio manifest');

  const srcAudioPath = path.resolve(audioDir, manifest.urls.find(url => url.endsWith('.wav')));

  console.info(`using audio file ${srcAudioPath}`);

  const processes = [];

  for (const [name, [start, duration]] of Object.entries(manifest.sprite)) {
    const dstAudioPath = path.resolve(audioDir, `${name}.mp3`);

    const proc = child.spawn(
      'ffmpeg', 
      [
        '-y', '-i', srcAudioPath, '-ss', start, '-t', duration, dstAudioPath,
      ]
    );

    processes.push(new Promise((resolve, reject) => {
      let stdout = '';

      proc.stdout.on('data', (data) => stdout += data);
      proc.stderr.on('data', (data) => stdout += data);

      const timer = setTimeout(() => {
        proc.kill();
        console.error(`transcoding ${dstAudioPath} timed out`);
        console.log(stdout);

        reject();
      }, 10000);

      proc.once('exit', (code) => {
        clearTimeout(timer);

        if (code === 0) {
          console.info(`transcoded ${dstAudioPath}`);

          resolve();
        } else {
          console.error(`transcoding ${dstAudioPath} failed with error code ${code}`);
          console.log(stdout);

          reject();
        }
      });
    }))
  }

  await Promise.all(processes);
})();
