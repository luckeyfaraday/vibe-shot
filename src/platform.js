const path = require('node:path');
const { pathToFileURL } = require('node:url');

function captureArgs(mode, filePath) {
  if (mode === 'window') return ['-w', '-f', filePath];
  if (mode === 'screen') return ['-f', filePath];
  return ['-a', '-f', filePath];
}

function windowsPowerShellPath(environment = process.env) {
  if (!environment.SystemRoot) return 'powershell.exe';
  return path.win32.join(environment.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
}

function captureInvocation(platform, mode, filePath, windowsScriptPath, environment = process.env) {
  if (platform === 'win32') {
    return {
      command: windowsPowerShellPath(environment),
      args: [
        '-NoLogo',
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        windowsScriptPath,
        '-Mode',
        mode,
        '-OutputPath',
        filePath
      ],
      options: { windowsHide: true }
    };
  }

  if (platform === 'linux') {
    return {
      command: 'gnome-screenshot',
      args: captureArgs(mode, filePath),
      options: {}
    };
  }

  return null;
}

function fileUrl(filePath) {
  return pathToFileURL(filePath).href;
}

module.exports = { captureArgs, captureInvocation, fileUrl, windowsPowerShellPath };
