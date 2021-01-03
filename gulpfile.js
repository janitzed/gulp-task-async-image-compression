const gulp = require('gulp');
const imagemin = require('gulp-imagemin');
const jpeg = require('imagemin-jpeg-recompress');
const gifsicle = require('imagemin-gifsicle');
const svgo = require('imagemin-svgo');
const optipng = require('imagemin-optipng');
const path = require('path');
const { resolve } = require('path');
const { readdir } = require('fs').promises;
const fs = require('fs');
const microtime = require('microtime');
const exec = require('gulp-exec');
const getSize = require('get-folder-size');

class AsyncImagesCompression {
  constructor() {
    this.source = ''
    this.destination = ''
    this.allowedFileExtensions = []
    this.timeout = 0;
    this.processNextDirectory = true;
    this.count = -1;
    this.root = {};
    this.directories = [];
    this.folderSizeStart = 0;
    this.folderSizeEnd = 0;
    this.consoleLog = false;
  }

  setSource(source = '') {

    if (!source || typeof '8' !== typeof source) {
      throw new Error('Error: source should be not empty and typeof string');
    }

    this.source = source;
  }

  getSource() {
    return this.source;
  }

  setDestination(destination = '') {

    if (!destination || typeof '8' !== typeof destination) {
      throw new Error('Error: destination should be not empty and typeof string');
    }

    this.destination = destination;
  }

  getDestination() {
    return this.destination;
  }

  setDestinationFolderRights(rights = [], destination = '', recursive = true, root = false) {

    if (!rights || typeof [] !== typeof rights || !rights.length) {
      throw new Error('Error: rights should be not empty and typeof array');
    }

    if (!destination || typeof '8' !== typeof destination) {
      throw new Error('Error: destination should be not empty and typeof string');
    }

    try {
      rights.map(right => {

        if (!right || typeof '8' !== typeof right) {
          throw new Error('Error: right should be not empty and typeof string');
        }
        else {
          this.makeDir(destination);
          this.execRights(`${root ? 'sudo ' : ''}chmod ${right} ${recursive ? '-R' : ''} ${destination}`);
        }

      });
    }
    catch (e) {
      throw new Error(`${e}`);
    }
  }

  setLogger(consoleLog = false) {

    if (typeof true !== typeof consoleLog) {
      throw new Error('Error: consoleLog should be typeof boolen');
    }

    this.consoleLog = consoleLog;
  }

  getLogger() {
    return this.consoleLog;
  }

  logger(message) {

    if (!this.getLogger()) {
      return;
    }

    console.log('\x1b[33m', message);
  }

  makeDir(destination = '') {

    if (!destination || typeof '8' !== typeof destination) {
      throw new Error('Error: destination should be not empty and typeof string');
    }

    fs.mkdir(destination, { recursive: true, }, (err) => {
      if (err) {
        return this.logger(err)
      }
    });
  }

  execRights(command = '') {

    if (!command || typeof '8' !== typeof command) {
      throw new Error('Error: command should be not empty and typeof string');
    }

    exec(command);
  }

  setAllowedFileExtensions(allowedFileExtensions = []) {

    if (!allowedFileExtensions || typeof [] !== typeof allowedFileExtensions || !allowedFileExtensions.length) {
      throw new Error('Error: allowedFileExtensions should be not empty and typeof array');
    }

    this.allowedFileExtensions = allowedFileExtensions
  }

  getAllowedFileExtensions() {
    return this.allowedFileExtensions
  }

  setTimeout(timeout = 0) {
    this.timeout = timeout
  }

  getTimeout() {
    return this.timeout
  }

  setProcessNextDirectory(processNextDirectory = false) {

    if (typeof true !== typeof processNextDirectory) {
      throw new Error('Error: processNextDirectory should be typeof boolen');
    }

    this.processNextDirectory = processNextDirectory;
  }

  getProcessNextDirectory() {
    return this.processNextDirectory;
  }

  /*
   * Get all files inside (nested) directories
   * @param {string} dir
   * @param {array} mainFileNames
   * @return {array}
   */
  async getFiles(dir, files = {}) {
    const destination = `${dir.substring(0, dir.indexOf(this.getSource()),)}${this.getDestination()}${dir.substring(dir.indexOf(this.getSource()) + this.getSource().length, dir.length,)}`;
    const root = await readdir(dir, { withFileTypes: true });

    if (undefined === files[destination]) {
      files[destination] = {
        files: [],
        count: 0,
      }
    }

    for (const directory of root) {
      const res = resolve(dir, directory.name);

      /**
       * Found nested dir
       */
      if (directory.isDirectory()) {
        await this.getFiles(res, files);
      }

      let extension = res.split('.');
      extension = extension[extension.length - 1];
      extension = extension.toLowerCase();

      /**
       * Append file names to the object holder
       */
      if (2 <= res.length && this.getAllowedFileExtensions().includes(extension)) {
        files[destination].files.push(res);
      }
    }

    return files;
  };

  /**
   * Main image compression
   * @param {string} source
   * @param {number} current
   * @param {number} global
   * @param {string} destination
   */
  compress(source, destination, currentCount, directoryFilesCount) {
    const self = this;

    return new Promise((resolve) => {
      const start = microtime.now();
      this.logger(`\n[${currentCount}/${directoryFilesCount}][sourceFile]${source}\n[${currentCount}/${directoryFilesCount}][destinationPath]${destination}`);

      gulp
        .src(source)
        .pipe(
          imagemin([
            gifsicle(),
            optipng({
              progressive: true,
            }),
            svgo(),
            jpeg(),
          ]),
        )
        .pipe(gulp.dest(destination));
      // Resolve with the miliseconds difference between end time and start time
      // to calculate ~~ the next process time
      const nextTimeout = (microtime.now() - start);
      self.setTimeout(nextTimeout);
      this.logger(`[nextImage] in ${nextTimeout}ms`);
      resolve(true);
    });
  };

  nextDirectory() {
    this.count += 1;

    if (undefined == this.directories[this.count]) {
      return this.end();
    }

    if (this.root[this.directories[this.count]].files.length == 0) {
      return this.nextDirectory();
    }

    this.progressSingleDirectory(this.directories[this.count], this.root[this.directories[this.count]].files);
  }

  async progressSingleDirectory(directory = '', files = []) {
    this.setTimeout(1000);

    this.setProcessNextDirectory(false);
    this.makeDir(directory);
    this.execRights(`chmod 2777 -R ${directory} && chmod 777 -R ${directory}`);

    let i = -1;

    const nextImage = () => {
      i += 1;

      setTimeout(async () => {
        await this.compress(files[i], directory, i + 1, files.length);

        if (i !== files.length - 1) {
          nextImage();
        }
        else {
          // End of current directory, send signal to process next directory in objects tree (this.directories)
          this.nextDirectory();
        }

      }, this.getTimeout());
    };

    nextImage();
  }

  async getFolderSize(directory) {

    if (!directory || typeof '8' !== typeof directory) {
      throw new Error('Error: directory should be not empty and typeof string');
    }

    return new Promise((resolve, reject) => {
      getSize(directory, (err, size) => {
        if (err) {
          reject(err);
        }

        resolve(size)
      });
    });
  }

  async start() {
    // Not absolute path
    // this.folderSizeStart = await this.getFolderSize(path.join(__dirname, this.getSource()));
    // Absolute path 
    this.folderSizeStart = await this.getFolderSize(this.getSource());
    // Not absolute path
    // this.root = await this.getFiles(path.join(__dirname, this.getSource()));
    // Absolute path 
    this.root = await this.getFiles(this.getSource());
    this.directories = Object.keys(this.root);

    if (!this.directories.length) {
      return this.logger('No files to proocess');
    }

    this.logger(`Processing directories: ${this.directories.length}`);
    this.nextDirectory();
  }

  async end() {
    // Not absolute path
    // this.folderSizeStart = await this.getFolderSize(path.join(__dirname, this.getDestination()));
    // Absolute path 
    this.folderSizeEnd = await this.getFolderSize(this.getDestination());

    /**
     * Timeout to calculate the destination folder with the last compressed image
     */
    setTimeout( () => {
      this.logger(`\n\n[source] ${(this.folderSizeStart / 1024 / 1024).toFixed(2)} MB\n[destination] ${(this.folderSizeEnd / 1024 / 1024).toFixed(2)} MB\n[saved] ${((this.folderSizeStart-this.folderSizeEnd) / 1024 / 1024).toFixed(2)} MB`);
    }, 20000);
  }
}

gulp.task('compress:images', () => {
  const aic = new AsyncImagesCompression();
  aic.setSource('/var/www/html/gulp-task-async-image-compression/source');
  aic.setDestination('/var/www/html/gulp-task-async-image-compression/public');
  aic.setDestinationFolderRights(['2777', '777'], aic.getDestination(), true, true);
  aic.setAllowedFileExtensions(['jpg', 'jpeg', 'png', 'gif', 'ico', 'webp', 'nef']);
  aic.setLogger(true);
  return aic.start();
});