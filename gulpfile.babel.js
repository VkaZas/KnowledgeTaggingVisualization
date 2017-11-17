let gulp        = require('gulp');

let browserify  = require('browserify');
let babelify    = require('babelify');
let source      = require('vinyl-source-stream');
let buffer      = require('vinyl-buffer');
let uglify      = require('gulp-uglify');
let sourcemaps  = require('gulp-sourcemaps');
let livereload  = require('gulp-livereload');
let sass        = require('gulp-sass');

gulp.task('build', () => {
    // app.js is your main JS file with all your module inclusions
    return browserify({entries: './src/app.js', debug: true})
        .transform("babelify", { presets: ["es2015"] })
        .bundle()
        .pipe(source('app.js'))
        .pipe(buffer())
        .pipe(sourcemaps.init())
        .pipe(sourcemaps.write('./maps'))
        .pipe(gulp.dest('./dist/'))
        .pipe(livereload());
});


gulp.task('sass', () => {
    return gulp.src('src/scss/*.scss')
        .pipe(sass())
        .pipe(gulp.dest('dist/css/'))
});

gulp.task('watch', ['build'], () => {
    livereload.listen();
    gulp.watch('./src/*.js', ['build']);
    gulp.watch('./src/js/*.js', ['build']);
    gulp.watch('./src/scss/*.scss', ['sass']);
});

gulp.task('default', ['watch', 'sass']);