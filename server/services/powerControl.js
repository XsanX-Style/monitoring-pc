const { exec } = require('child_process');
const os = require('os');

function isWindows() {
  return os.platform() === 'win32';
}

function run(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) return reject(new Error(stderr || error.message));
      resolve(stdout.trim());
    });
  });
}

const MAX_DELAY_SECONDS = 8 * 60 * 60; // 8 часов — разумный потолок для "выключить позже"

// delaySeconds приходит уже провалидированным из routes/power.js (целое число,
// в допустимых пределах) — но на всякий случай проверяем ещё раз здесь тоже,
// т.к. это значение подставляется прямо в команду shell.
function sanitizeDelaySeconds(value, fallback) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > MAX_DELAY_SECONDS) return fallback;
  return n;
}

const actions = {
  shutdown: (opts = {}) => {
    const seconds = sanitizeDelaySeconds(opts.delaySeconds, 5);
    return isWindows()
      ? run(`shutdown /s /t ${seconds}`)
      : run(`shutdown -h +${Math.ceil(seconds / 60)}`);
  },
  restart: (opts = {}) => {
    const seconds = sanitizeDelaySeconds(opts.delaySeconds, 5);
    return isWindows()
      ? run(`shutdown /r /t ${seconds}`)
      : run(`shutdown -r +${Math.ceil(seconds / 60)}`);
  },
  sleep: () =>
    isWindows()
      ? run('rundll32.exe powrprof.dll,SetSuspendState 0,1,0')
      : run('systemctl suspend'),
  lock: () =>
    isWindows() ? run('rundll32.exe user32.dll,LockWorkStation') : run('loginctl lock-session'),
  cancelShutdown: () =>
    isWindows() ? run('shutdown /a') : Promise.resolve('n/a'),
  logoff: () => (isWindows() ? run('shutdown /l') : run('pkill -KILL -u $USER')),
};

async function execute(action, options = {}) {
  if (!actions[action]) {
    throw new Error(`Неизвестное действие: ${action}`);
  }
  return actions[action](options);
}

module.exports = { execute, availableActions: Object.keys(actions), MAX_DELAY_SECONDS };
