const { exec, spawn } = require('child_process');
const os = require('os');

const EXEC_TIMEOUT_MS = 20000;
const MAX_OUTPUT_CHARS = 8000;

function truncate(text) {
  if (!text) return '';
  return text.length > MAX_OUTPUT_CHARS
    ? `${text.slice(0, MAX_OUTPUT_CHARS)}\n... (обрезано)`
    : text;
}

// Запуск с ожиданием результата (короткие команды/скрипты)
function runAndWait(command) {
  return new Promise((resolve) => {
    exec(
      command,
      { timeout: EXEC_TIMEOUT_MS, windowsHide: true, maxBuffer: 1024 * 1024 * 4 },
      (error, stdout, stderr) => {
        resolve({
          ok: !error,
          exitCode: error ? error.code ?? null : 0,
          stdout: truncate(stdout),
          stderr: truncate(stderr),
          timedOut: error && error.killed && error.signal === 'SIGTERM',
        });
      }
    );
  });
}

// Запуск в фоне, без ожидания завершения (для приложений с GUI и т.п.)
function runDetached(command) {
  return new Promise((resolve, reject) => {
    try {
      const child =
        os.platform() === 'win32'
          ? spawn('cmd.exe', ['/c', 'start', '""', command], {
              detached: true,
              stdio: 'ignore',
              windowsHide: false,
            })
          : spawn('/bin/sh', ['-c', command], { detached: true, stdio: 'ignore' });

      child.unref();
      resolve({ ok: true, pid: child.pid });
    } catch (err) {
      reject(err);
    }
  });
}

async function run(command, detached) {
  if (!command || typeof command !== 'string' || !command.trim()) {
    throw new Error('Команда не может быть пустой');
  }
  return detached ? runDetached(command) : runAndWait(command);
}

module.exports = { run };
