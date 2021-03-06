'use strict';

const path = require('path');
const fs = require('fs');
var glob = require('glob');
const url = require('url');
const parseArgs = require('minimist');
const argsv = parseArgs(process.argv.slice(2))

// Make sure any symlinks in the project folder are resolved:
// https://github.com/facebookincubator/create-react-app/issues/637
const appDirectory = fs.realpathSync(process.cwd());
function resolveApp(relativePath) {
  return path.resolve(appDirectory, relativePath);
}

// We support resolving modules according to `NODE_PATH`.
// This lets you use absolute paths in imports inside large monorepos:
// https://github.com/facebookincubator/create-react-app/issues/253.

// It works similar to `NODE_PATH` in Node itself:
// https://nodejs.org/api/modules.html#modules_loading_from_the_global_folders

// We will export `nodePaths` as an array of absolute paths.
// It will then be used by Webpack configs.
// Jest doesn’t need this because it already handles `NODE_PATH` out of the box.

// Note that unlike in Node, only *relative* paths from `NODE_PATH` are honored.
// Otherwise, we risk importing Node.js core modules into an app instead of Webpack shims.
// https://github.com/facebookincubator/create-react-app/issues/1023#issuecomment-265344421

const nodePaths = (process.env.NODE_PATH || '')
  .split(process.platform === 'win32' ? ';' : ':')
  .filter(Boolean)
  .filter(folder => !path.isAbsolute(folder))
  .map(resolveApp);

const envPublicUrl = process.env.PUBLIC_URL;

function resolveOwn(relativePath) {
  return path.resolve(__dirname, '..', relativePath);
}

// Set the base folder for app code
const appSrc = resolveApp(argsv['source-path'] || 'apps');

// Find each app within the base appSrc directory
const appEntryDirs = []
const appEntries = glob.sync(`${appSrc}/*`)
  // Then find the entries in each app and reate a set of entries with a
  // consistent naming convention so we can easily reference in templates:
  // `${appName}__${entryName}`
  .map((dir) => {
    const appName = path.basename(dir)
    const entries = glob.sync(dir + "/**/entry.js")
    return entries.map((entry) => {
      // Capture the parent dir for appEntryDirs at the same time
      appEntryDirs.push(path.dirname(entry))
      const entryName = path.basename(path.dirname(entry))
      return [`${appName}__${entryName}`, entry]
    })
  })
  // Flatten
  .reduce((a, b) => a.concat(b), []);

// We're in ./node_modules/icelab-assets/config/
module.exports = {
  appPath: resolveApp('.'),
  // Location to build to
  appBuild: resolveApp(argsv['build-path'] || 'public/assets'),
  appPackageJson: resolveApp('package.json'),
  appWebpackConfigDev: resolveApp('webpack.config.dev.js'),
  appWebpackConfigProd: resolveApp('webpack.config.prod.js'),
  appSrc: appSrc,
  // Where does the code sit?
  // This doesn’t actually export a path but it still feels like
  // right place for this stuff
  appEntries: appEntries,
  appEntryDirs: appEntryDirs,
  appNodeModules: resolveApp('node_modules'),
  nodePaths: nodePaths,
  ownNodeModules: resolveOwn('node_modules'), // This is empty on npm 3
  // The served public path
  publicPath: argsv['public-path'] || '/assets/',
  // testsSetup: resolveApp('src/setupTests.js'),
  yarnLockFile: resolveApp('yarn.lock'),
};