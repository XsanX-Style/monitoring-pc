const si = require('systeminformation');
const { exec } = require('child_process');
const os = require('os');

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
    }))
    .sort((a, b) => b.cpuPercent - a.cpuPercent);
}

function killProcess(pid) {
  return new Promise((resolve, reject) => {
    const numericPid = parseInt(pid, 10);
    if (!Number.isInteger(numericPid) || numericPid <= 0) {
      return reject(new Error('Некорректный PID'));
    }

    const cmd =
      os.platform() === 'win32' ? `taskkill /PID ${numericPid} /F` : `kill -9 ${numericPid}`;

    exec(cmd, (error, stdout, stderr) => {
      if (error) return reject(new Error(stderr || error.message));
      resolve(stdout.trim());
    });
  });
}

module.exports = { listProcesses, killProcess };
