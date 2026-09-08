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

const actions = {
  shutdown: () =>
    isWindows() ? run('shutdown /s /t 5') : run('shutdown -h +0'),
  restart: () =>
    isWindows() ? run('shutdown /r /t 5') : run('shutdown -r +0'),
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

async function execute(action) {
  if (!actions[action]) {
    throw new Error(`Неизвестное действие: ${action}`);
  }
  return actions[action]();
}

module.exports = { execute, availableActions: Object.keys(actions) };
