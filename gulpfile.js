var gulp = require("gulp"),
  clean = require("gulp-clean"),
  jshint = require("gulp-jshint"),
  Server = require("karma").Server,
  concat = require("gulp-concat"),
  gp_rename = require("gulp-rename"),
  replace = require("gulp-replace"),
  uglify = require("gulp-uglify"),
  concatCss = require("gulp-concat-css"),
  uglifycss = require("gulp-uglifycss"),
  sass = require("gulp-sass"),
  connectlivereload = require("connect-livereload"),
  express = require("express"),
  path = require("path"),
  watch = require("gulp-watch"),
  autoprefixer = require("gulp-autoprefixer");

function startExpress(done) {
  var app = express();
  app.use(connectlivereload({ port: 35729 }));
  app.use(express.static("./dist"));
  var port = 4000;
  app.listen(port, "0.0.0.0", function() {
    console.log("App started at http://0.0.0.0:" + port);
    done();
  });
};

var tinylr;

function notifyLiveReload(event) {
  tinylr.changed({ body: { files: [path.relative(__dirname, event.path)] } });
}

function livereload() {
  tinylr = require("tiny-lr")();
  tinylr.listen(35729);
};

var buildHTML = gulp.parallel(
  function() { return gulp.src("index.html").pipe(gulp.dest("dist")); },
  function() { return gulp.src("components/*").pipe(gulp.dest("dist/components")); }
);

function bundleVendorCSS() {
  return gulp
    .src([
      "node_modules/font-awesome/css/font-awesome.min.css",
      "stylesheets/vendor/*.css"
    ])
    .pipe(concatCss("vendor.css"))
    .pipe(gulp.dest("dist/css"))
    .pipe(uglifycss())
    .pipe(gulp.dest("dist/css"));
};

function processSass() {
  return gulp
    .src(["stylesheets/main.scss"])
    .pipe(sass().on("error", sass.logError))
    .pipe(gp_rename("main.css"))
    .pipe(autoprefixer())
    .pipe(uglifycss())
    .pipe(gulp.dest("dist/css"));
};

function bundleVendorJS() {
  return gulp
    .src([
      "js/vendor/jquery-3.2.1.min.js",
      "node_modules/angular/angular.min.js",
      "js/vendor/firebase.js",
      "js/vendor/firebaseInitialization.js",
      "node_modules/angularfire/dist/angularfire.min.js",
      "node_modules/angular-*/**/angular-*.min.js",
      "node_modules/core-js/client/shim.min.js",
      "!node_modules/**/angular-mocks.js",
      "js/vendor/*.js",
      "node_modules/ng-dialog/**/ngDialog*.min.js",
      "node_modules/ng-file-upload/**/ng-file-upload-all.min.js",
      "node_modules/papaparse/papaparse.min.js",
      "node_modules/clipboard/dist/clipboard.min.js",
      "node_modules/vanilla-emoji-picker/dist/emojiPicker.min.js",
      "node_modules/jspdf/dist/jspdf.min.js"
    ])
    .pipe(replace("YOUR_API_KEY", process.env.FB_API_KEY))
    .pipe(replace("YOUR_PROJECT_ID", process.env.FB_PROJECT_ID))
    .pipe(replace("YOUR_MESSAGE_ID", process.env.FB_MESSAGE_ID))
    .pipe(concat("vendor.js"))
    .pipe(gulp.dest("dist"));
};

function minifyJS() {
  return gulp
    .src(["js/*.js", "js/**/*.js", "!js/vendor/*.js"])
    .pipe(concat("main.js"))
    .pipe(uglify())
    .pipe(gulp.dest("dist"));
};

function cleanDist() {
  return gulp.src("dist/*", { read: false }).pipe(clean());
};

var bundle = gulp.parallel(bundleVendorCSS, bundleVendorJS, processSass, minifyJS);

var watchAll = gulp.parallel(
  watch.bind(null, "dist/*", notifyLiveReload),
  watch.bind(null, "**/*.html", notifyLiveReload),
  watch.bind(null, "components/*", buildHTML),
  watch.bind(null, "**/*.scss", processSass),
  watch.bind(null, "**/*.scss", notifyLiveReload),
  watch.bind(null, "js/**/*.js", minifyJS)
);

function lint() {
  return gulp
    .src(["js/**/*.js", "!js/vendor/**/*.js"])
    .pipe(jshint(".jshintrc"))
    .pipe(jshint.reporter("jshint-stylish"));
}

function watchTest(done) {
  return new Server(
    {
      configFile: __dirname + "/karma.conf.js",
      singleRun: false
    },
    done
  ).start();
};

function testOnce(done) {
  Server.start(
    {
      configFile: __dirname + "/karma.conf.js",
      singleRun: true,
      reporters: ["mocha"]
    },
    done
  );
};

var copy = gulp.parallel(
  function() { return gulp.src("node_modules/roboto-fontface/fonts/*{Regular,Bold}.*").pipe(gulp.dest("dist/fonts")) },
  function() { return gulp.src("node_modules/font-awesome/fonts/*.{woff,woff2,eot,svg,ttf}").pipe(gulp.dest("dist/fonts")) },
  function() { return gulp.src("img/*").pipe(gulp.dest("dist/img")) },
  function() { return gulp.src("favicon.ico").pipe(gulp.dest("dist")) },
  function() { return gulp.src("firebase.json").pipe(gulp.dest("dist")) },
  function() { return gulp.src("README.md").pipe(gulp.dest("dist")) },
  function() { return gulp.src("CNAME", {allowEmpty: true}).pipe(gulp.dest("dist")) },
  buildHTML
);

exports.default = gulp.series(bundle, copy, startExpress, livereload, watchAll);
exports.lint = lint;
exports.testWatch = gulp.parallel(lint, watchTest);
exports.test = gulp.parallel(lint, testOnce);
exports.build = gulp.series(cleanDist, bundle, copy);
