const gulp = require('gulp');
const imagemin = require('gulp-imagemin');
const jpeg = require('imagemin-jpeg-recompress');
const gifsicle = require('imagemin-gifsicle');
const svgo = require('imagemin-svgo');
const optipng = require('imagemin-optipng');
const path = require('path');
const { resolve } = require('path');
const { readdir } = require('fs').promises;
const microtime = require('microtime')

/**
 * Allowed file types
 */
const ALLOWED = ['jpg', 'JPG', 'jpeg', 'JPEG', 'png', 'PNG', 'gif', 'GIF', 'ico', 'ICO', 'webp', 'WEBP'];

/**
 * Paths
 */
const suffix = '';
const SOURCE = './source/' + suffix;
const DESTINATION = './public/' + suffix;
const PATH = path.join(__dirname, SOURCE);

/*
 * Get all files inside (nested) directory
 * @param {string} dir 
 * @param {array} mainFileNames 
 * @return {array}
 */
const getAllFilesInsideDirectory = async (dir, mainFileNames = []) => {
  const root = await readdir(dir, { withFileTypes: true });

  for (const directory of root) {
    const res = resolve(dir, directory.name);

    if (directory.isDirectory()) {
      console.log(`Found nested directory : ${res}`);
      await getAllFilesInsideDirectory(res, mainFileNames);
    }

    const extension = res.split('.');

    if (2 <= res.length && ALLOWED.includes(extension[extension.length - 1])) {
      mainFileNames.push(res);
    }
  }

  return mainFileNames;
}

const processSingleFile = (string, current, global) => {
  return new Promise(resolve => {
    const start = microtime.now();
    console.log('\x1b[33m', `Processing file ${current}/${global}: ${string}`);

    gulp.src(string)
      .pipe(
        imagemin(
          [
            gifsicle(),
            optipng({
              progressive: true,
            }),
            svgo(),
            jpeg(),
            // svgmin() removing due process error: (node:20285) UnhandledPromiseRejectionWarning: TypeError: fn is not a function at node_modules/p-pipe/index.js:14:25
          ]
        )
      )
      .pipe(gulp.dest(DESTINATION));
      // Resolve with the miliseconds difference between end time and start time
      // to calculate ~~ the next process time 
    resolve( (microtime.now()-start) );
  })
};

let timeout = 5000;
let count = 0;

gulp.task('compress:images', async (done) => {
  const files = await getAllFilesInsideDirectory(PATH).then( r => r ).catch( e => []);
  console.log('\x1b[33m', `Processing ${files.length} files`);

  const processing = async () => {
    if (undefined !== files[count]) {
      timeout = await processSingleFile(files[count], count+1, files.length).then(t => t).catch( e => 5000)

      setTimeout(() => {
        count++;
        processing();
      }, timeout);
    }
    else{
      done();
    }
  }
  processing();
});