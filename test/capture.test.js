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
  const execFileImpl = (command, args, callback) => {
    invokedCommand = command;
    invokedArgs = args;
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
  const execFileImpl = (_command, _args, callback) => setImmediate(() => callback(commandError));

  await assert.rejects(
    captureToFile('screen', '/tmp/unused-vibeshot.png', { execFileImpl }),
    commandError
  );
});
