const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');
const { windowsPowerShellPath } = require('../src/platform');

test('Windows region selection preserves physical coordinates and saved pixels', {
  skip: process.platform !== 'win32',
  timeout: 30000
}, () => {
  const output = execFileSync(windowsPowerShellPath(), [
    '-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-File', path.join(__dirname, 'windows-capture.ps1')
  ], { windowsHide: true, encoding: 'utf8', timeout: 25000 });
  assert.match(output, /Capture coordinate checks passed/);
});
