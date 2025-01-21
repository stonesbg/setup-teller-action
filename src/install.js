const process = require("process");
const core = require("@actions/core");
const tc = require("@actions/tool-cache");

const fs = require('fs');
const path = require('path');

async function install(version) {
  const cachedPath = tc.find(
    "teller",
    version.version,
  );
  if (cachedPath) {
    core.info(`Using cached Teller installation from ${cachedPath}.`);
    core.addPath(cachedPath);
    return;
  }

  const zip = zipName(version.version);
  const url = `https://github.com/spectralops/teller/releases/download/v${version.version}/${zip}`;

  core.info(`Downloading Teller from ${url}.`);

  const zipPath = await tc.downloadTool(url);
  // Check if the downloaded file is tar.xz or tar.gz and extract accordingly
  const extractedFolder = url.endsWith('.tar.xz')
    ? await tc.extractTar(zipPath, undefined, 'xJ') // xJ flag for tar.xz
    : await tc.extractTar(zipPath); // Default for tar.gz

  const { path: lowestFolder, depth } = getLowestChildFolder(extractedFolder);

  const newCachedPath = await tc.cacheDir(
    lowestFolder,
    "teller",
    version.version,
  );

  core.info(`Cached Teller to ${newCachedPath}.`);
  core.addPath(newCachedPath);
}

function getLowestChildFolder(dir, depth = 0) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let maxDepth = depth;
  let deepestPath = dir;

  entries.forEach(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const { depth: childDepth, path: childPath } = getLowestChildFolder(fullPath, depth + 1);
      if (childDepth > maxDepth) {
        maxDepth = childDepth;
        deepestPath = childPath;
      }
    }
  });

  return { depth: maxDepth, path: deepestPath };
}

function zipName(version) {
  let arch;
  switch (process.arch) {
    case "arm64":
      arch = "arm64";
      break;
    case "x64":
      arch = "x86_64";
      break;
    default:
      throw new Error(`Unsupported architechture ${process.arch}.`);
  }

  let platform;
  switch (process.platform) {
    case "linux":
      platform = "Linux";
      break;
    case "darwin":
      platform = "Darwin";
      break;
    case "win32":
      platform = "Windows";
      break;
    default:
      throw new Error(`Unsupported platform ${process.platform}.`);
  }

  let zip_name = `teller_${version}_${platform}_${arch}.tar.gz`;

  if (version.startsWith("2")) {
    zip_name = `teller-${arch}-${platform.toLowerCase()}.tar.xz`;
  }

  return zip_name;
}

module.exports = {
  install,
};
