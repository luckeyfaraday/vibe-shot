const { execFile } = require('node:child_process');
const fs = require('node:fs');
const { captureArgs, captureInvocation } = require('./platform');

const CAPTURE_OUTPUT_TIMEOUT_MS = 120_000;

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

function runCaptureCommand(mode, filePath, {
  execFileImpl,
  platform,
  windowsScriptPath,
  environment
}) {
  const invocation = captureInvocation(platform, mode, filePath, windowsScriptPath, environment);
  if (!invocation) {
    const error = new Error(`Screen capture is not supported on ${platform}`);
    error.code = 'UNSUPPORTED_PLATFORM';
    return Promise.reject(error);
  }

  return new Promise((resolve, reject) => {
    execFileImpl(invocation.command, invocation.args, invocation.options, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function captureToFile(mode, filePath, {
  execFileImpl = execFile,
  fsModule = fs,
  timeoutMs = CAPTURE_OUTPUT_TIMEOUT_MS,
  pollIntervalMs = 50,
  platform = process.platform,
  windowsScriptPath,
  environment = process.env
} = {}) {
  await runCaptureCommand(mode, filePath, {
    execFileImpl,
    platform,
    windowsScriptPath,
    environment
  });

  // Some capture launchers can exit before another process finishes writing
  // the PNG, so do not report completion until readable output exists.
  await waitForFile(filePath, { fsModule, timeoutMs, pollIntervalMs });
}

module.exports = {
  CAPTURE_OUTPUT_TIMEOUT_MS,
  captureArgs,
  captureToFile,
  waitForFile
};
