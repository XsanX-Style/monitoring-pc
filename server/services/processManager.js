const si = require('systeminformation');
const { exec } = require('child_process');
const os = require('os');

// Завершение этих процессов почти гарантированно валит систему в BSOD или
// разрывает пользовательскую сессию Windows. На телефоне легко промахнуться
// мимо нужной кнопки, поэтому такие процессы блокируем на уровне сервера,
// а не только полагаемся на "Вы уверены?" в интерфейсе.
const PROTECTED_PROCESS_NAMES = new Set(
  [
    'system',
    'system idle process',
    'registry',
    'smss.exe',
    'csrss.exe',
    'wininit.exe',
    'winlogon.exe',
    'services.exe',
    'lsass.exe',
    'svchost.exe',
    'explorer.exe',
    'dwm.exe',
    'fontdrvhost.exe',
    'sihost.exe',
  ].map((name) => name.toLowerCase())
);
const PROTECTED_PIDS = new Set([0, 4]);

function isProtected(pid, name) {
  if (PROTECTED_PIDS.has(pid)) return true;
  return PROTECTED_PROCESS_NAMES.has(String(name || '').toLowerCase());
}

async function listProcesses() {
  const data = await si.processes();
  return data.list
    .map((p) => ({
      pid: p.pid,
      parentPid: p.parentPid,
      name: p.name,
      cpuPercent: Math.round((p.cpu || 0) * 10) / 10,
      memPercent: Math.round((p.mem || 0) * 10) / 10,
      memRssBytes: p.memRss ? p.memRss * 1024 : 0,
      state: p.state,
      user: p.user,
      started: p.started,
      protected: isProtected(p.pid, p.name),
    }))
    .sort((a, b) => b.cpuPercent - a.cpuPercent);
}

function runCmd(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { windowsHide: true }, (error, stdout, stderr) => {
      if (error) return reject(new Error(stderr || error.message));
      resolve(stdout.trim());
    });
  });
}

function pidAlive(numericPid) {
  return new Promise((resolve) => {
    try {
      process.kill(numericPid, 0);
      resolve(true);
    } catch (err) {
      resolve(false);
    }
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Сначала пытаемся закрыть процесс "по-хорошему" (даём GUI-приложению
// шанс предложить сохранить несохранённые данные), и только если это не
// сработало — убиваем принудительно. На Windows у процессов без окна
// (служб, консольных программ) обычный taskkill почти всегда вернёт
// ошибку "can only be terminated forcefully" — в этом случае откатываемся
// на /F автоматически.
async function killProcess(pid, options = {}) {
  const numericPid = parseInt(pid, 10);
  if (!Number.isInteger(numericPid) || numericPid <= 0) {
    throw new Error('Некорректный PID');
  }

  // Не доверяем имени процесса, присланному клиентом, — смотрим сами,
  // что сейчас реально запущено под этим PID, и блокируем системные
  // процессы независимо от того, что показывает интерфейс.
  const data = await si.processes();
  const proc = data.list.find((p) => p.pid === numericPid);

  if (proc && isProtected(proc.pid, proc.name)) {
    throw new Error(
      `Завершение "${proc.name}" (PID ${numericPid}) заблокировано — это системный процесс, его остановка может уронить Windows.`
    );
  }

  const forceOnly = Boolean(options.force);
  const isWindows = os.platform() === 'win32';

  if (!forceOnly) {
    try {
      const output = isWindows
        ? await runCmd(`taskkill /PID ${numericPid}`)
        : await (async () => {
            process.kill(numericPid, 'SIGTERM');
            await delay(2000);
            if (!(await pidAlive(numericPid))) return 'Процесс завершён (SIGTERM)';
            throw new Error('Процесс не завершился по SIGTERM');
          })();
      return { method: 'graceful', output, name: proc ? proc.name : null };
    } catch (err) {
      // Обычный (не силовой) способ не сработал — пробуем принудительно ниже.
    }
  }

  const cmd = isWindows ? `taskkill /PID ${numericPid} /F` : `kill -9 ${numericPid}`;
  const output = await runCmd(cmd);
  return { method: 'forced', output, name: proc ? proc.name : null };
}

module.exports = { listProcesses, killProcess };
