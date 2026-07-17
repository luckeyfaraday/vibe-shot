const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { captureArgs, captureToFile, waitForFile } = require('../src/capture');

test('captureArgs maps each capture mode to gnome-screenshot arguments', () => {
  assert.deepEqual(captureArgs('region', '/tmp/capture.png'), ['-a', '-f', '/tmp/capture.png']);
  assert.deepEqual(captureArgs('window', '/tmp/capture.png'), ['-w', '-f', '/tmp/capture.png']);
  assert.deepEqual(captureArgs('screen', '/tmp/capture.png'), ['-f', '/tmp/capture.png']);
});

test('captureToFile waits when the launcher exits before the PNG is written', async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vibeshot-test-'));
  const filePath = path.join(directory, 'delayed.png');
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));

  let invokedCommand;
  let invokedArgs;
  let invokedOptions;
  const execFileImpl = (command, args, options, callback) => {
    invokedCommand = command;
    invokedArgs = args;
    invokedOptions = options;
    setImmediate(() => callback(null));
    setTimeout(() => fs.writeFileSync(filePath, 'png data'), 40);
  };

  await captureToFile('region', filePath, {
    execFileImpl,
    timeoutMs: 500,
    pollIntervalMs: 5
  });

  assert.equal(invokedCommand, 'gnome-screenshot');
  assert.deepEqual(invokedArgs, ['-a', '-f', filePath]);
  assert.deepEqual(invokedOptions, {});
  assert.equal(fs.readFileSync(filePath, 'utf8'), 'png data');
});

test('waitForFile rejects when a successful launcher never produces output', async () => {
  const filePath = path.join(os.tmpdir(), `missing-vibeshot-${process.pid}-${Date.now()}.png`);

  await assert.rejects(
    waitForFile(filePath, { timeoutMs: 20, pollIntervalMs: 5 }),
    (error) => error.code === 'CAPTURE_OUTPUT_TIMEOUT'
  );
});

test('captureToFile preserves command failures', async () => {
  const commandError = Object.assign(new Error('command failed'), { code: 1 });
  const execFileImpl = (_command, _args, _options, callback) => setImmediate(() => callback(commandError));

  await assert.rejects(
    captureToFile('screen', '/tmp/unused-vibeshot.png', { execFileImpl }),
    commandError
  );
});

test('captureToFile uses the Windows PowerShell invocation', async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vibeshot-test-'));
  const filePath = path.join(directory, 'capture.png');
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));

  let invocation;
  const execFileImpl = (command, args, options, callback) => {
    invocation = { command, args, options };
    fs.writeFileSync(filePath, 'png data');
    setImmediate(() => callback(null));
  };

  await captureToFile('window', filePath, {
    execFileImpl,
    platform: 'win32',
    windowsScriptPath: 'C:\\Program Files\\VibeShot\\capture-windows.ps1',
    environment: { SystemRoot: 'C:\\Windows' }
  });

  assert.equal(invocation.command, path.win32.join('C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'));
  assert.deepEqual(invocation.args.slice(-6), [
    '-File',
    'C:\\Program Files\\VibeShot\\capture-windows.ps1',
    '-Mode',
    'window',
    '-OutputPath',
    filePath
  ]);
  assert.deepEqual(invocation.options, { windowsHide: true });
});

test('captureToFile rejects unsupported platforms before running a command', async () => {
  let invoked = false;

  await assert.rejects(
    captureToFile('region', '/tmp/unused-vibeshot.png', {
      platform: 'darwin',
      execFileImpl: () => { invoked = true; }
    }),
    (error) => error.code === 'UNSUPPORTED_PLATFORM'
  );

  assert.equal(invoked, false);
});
