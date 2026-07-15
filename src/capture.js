const { execFile } = require('node:child_process');
const fs = require('node:fs');

const CAPTURE_OUTPUT_TIMEOUT_MS = 120_000;

function captureArgs(mode, filePath) {
  if (mode === 'window') return ['-w', '-f', filePath];
  if (mode === 'screen') return ['-f', filePath];
  return ['-a', '-f', filePath];
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForFile(filePath, {
  fsModule = fs,
  timeoutMs = CAPTURE_OUTPUT_TIMEOUT_MS,
  pollIntervalMs = 50
} = {}) {
  const deadline = Date.now() + timeoutMs;

  while (true) {
    try {
      const stats = await fsModule.promises.stat(filePath);
      if (stats.isFile() && stats.size > 0) return;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }

    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      const error = new Error(`Capture output was not created: ${filePath}`);
      error.code = 'CAPTURE_OUTPUT_TIMEOUT';
      throw error;
    }

    await delay(Math.min(pollIntervalMs, remaining));
  }
}

function runCaptureCommand(mode, filePath, execFileImpl) {
  return new Promise((resolve, reject) => {
    execFileImpl('gnome-screenshot', captureArgs(mode, filePath), (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function captureToFile(mode, filePath, {
  execFileImpl = execFile,
  fsModule = fs,
  timeoutMs = CAPTURE_OUTPUT_TIMEOUT_MS,
  pollIntervalMs = 50
} = {}) {
  await runCaptureCommand(mode, filePath, execFileImpl);

  // gnome-screenshot is a GApplication. If another instance owns its D-Bus
  // name, this launcher can exit before that instance finishes writing the PNG.
  await waitForFile(filePath, { fsModule, timeoutMs, pollIntervalMs });
}

module.exports = {
  CAPTURE_OUTPUT_TIMEOUT_MS,
  captureArgs,
  captureToFile,
  waitForFile
};
