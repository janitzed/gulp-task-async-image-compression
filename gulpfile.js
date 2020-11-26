const gulp = require('gulp');
const imagemin = require('gulp-imagemin');
const jpeg = require('imagemin-jpeg-recompress');
const svgmin = require('gulp-svgmin');
const gifsicle = require('imagemin-gifsicle');
const svgo = require('imagemin-svgo');
const optipng = require('imagemin-optipng');

const SOURCE = './source';
const DESTINATION = './public';

/**
 * Other then jpg images
 */
gulp.task('compress:images', () => {
  return gulp.src(`${SOURCE}/**/*.{jpg,JPG,jpeg,JPEG,png,PNG,gif,GIF,ico,ICO,webp,WEBP}`)
    .pipe(
      imagemin(
        [
          gifsicle(),
          optipng({
            progressive: true,
          }),
          svgo(),
          jpeg(),
          svgmin()
        ]
      )
    )
    .pipe(gulp.dest(DESTINATION));
});
