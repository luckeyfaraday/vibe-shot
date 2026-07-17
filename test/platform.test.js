const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { captureArgs, captureInvocation, fileUrl, windowsPowerShellPath } = require('../src/platform');

test('builds gnome-screenshot arguments for every mode', () => {
  assert.deepEqual(captureArgs('region', '/tmp/capture.png'), ['-a', '-f', '/tmp/capture.png']);
  assert.deepEqual(captureArgs('window', '/tmp/capture.png'), ['-w', '-f', '/tmp/capture.png']);
  assert.deepEqual(captureArgs('screen', '/tmp/capture.png'), ['-f', '/tmp/capture.png']);
});

test('builds a hidden Windows PowerShell capture invocation', () => {
  const invocation = captureInvocation(
    'win32',
    'window',
    'C:\\Users\\Example User\\capture.png',
    'C:\\Program Files\\VibeShot\\capture-windows.ps1',
    { SystemRoot: 'C:\\Windows' }
  );

  assert.equal(invocation.command, path.win32.join('C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'));
  assert.deepEqual(invocation.args.slice(-6), [
    '-File',
    'C:\\Program Files\\VibeShot\\capture-windows.ps1',
    '-Mode',
    'window',
    '-OutputPath',
    'C:\\Users\\Example User\\capture.png'
  ]);
  assert.deepEqual(invocation.options, { windowsHide: true });
});

test('falls back to powershell.exe when SystemRoot is unavailable', () => {
  assert.equal(windowsPowerShellPath({}), 'powershell.exe');
});

test('reports unsupported platforms without constructing a command', () => {
  assert.equal(captureInvocation('darwin', 'region', '/tmp/capture.png', '/tmp/capture.ps1'), null);
});

test('creates a valid file URL for the native platform', () => {
  if (process.platform === 'win32') {
    assert.equal(fileUrl('C:\\Users\\Example User\\capture #1.png'), 'file:///C:/Users/Example%20User/capture%20%231.png');
  } else {
    assert.equal(fileUrl('/home/example/Capture #1.png'), 'file:///home/example/Capture%20%231.png');
  }
});
