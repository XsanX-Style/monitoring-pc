/* ==========================================================================
   Демо-режим PC Monitor.

   Подменяет fetch и WebSocket, чтобы настоящий интерфейс панели (public/js/app.js)
   работал без сервера: телеметрия генерируется в браузере, процессы, запуск команд
   и питание — имитация. Ни одна реальная машина этим демо не управляется.
   ========================================================================== */
(() => {
  const params = new URLSearchParams(location.search);
  const AUTO_LOGIN = params.get('auto') === '1';
  const EMBED = params.get('embed') === '1';
  const TOKEN = 'demo-token';

  // В превью на сайте сразу показываем дашборд, минуя экран входа.
  if (AUTO_LOGIN) {
    try {
      localStorage.setItem('pcmon_token', TOKEN);
    } catch (err) {
      /* приватный режим браузера — покажем экран входа */
    }
  }

  // ---------------------- Генератор телеметрии ----------------------

  const GB = 1024 ** 3;
  const startedAt = Date.now();
  const bootedAt = startedAt - (29 * 3600 + 14 * 60) * 1000;

  const state = {
    cpu: 17,
    cores: Array.from({ length: 12 }, () => 10 + Math.random() * 20),
    memUsed: 15.4 * GB,
    rx: 1.6e6,
    tx: 3.1e5,
  };

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  // Случайное блуждание с редкими всплесками — выглядит живее ровного шума.
  function walk(value, { min, max, step, spikeChance = 0.04, spike = 0 }) {
    let next = value + (Math.random() - 0.5) * step;
    if (spike && Math.random() < spikeChance) next += (Math.random() - 0.3) * spike;
    return clamp(next, min, max);
  }

  function nextStats() {
    state.cpu = walk(state.cpu, { min: 3, max: 96, step: 9, spike: 45 });
    state.cores = state.cores.map((c) =>
      walk(c, { min: 0, max: 100, step: 26, spikeChance: 0.12, spike: 55 })
    );
    state.memUsed = walk(state.memUsed, { min: 9 * GB, max: 27.5 * GB, step: 0.55 * GB });
    state.rx = walk(state.rx, { min: 2e4, max: 9.4e6, step: 2.4e6, spikeChance: 0.1, spike: 6e6 });
    state.tx = walk(state.tx, { min: 8e3, max: 2.2e6, step: 5e5, spikeChance: 0.08, spike: 1.4e6 });

    const round1 = (n) => Math.round(n * 10) / 10;
    const memTotal = 32 * GB;

    return {
      hostname: 'DESKTOP-XSANX',
      platform: 'Windows_NT 10.0.22631',
      uptimeSeconds: Math.floor((Date.now() - bootedAt) / 1000),
      cpu: {
        manufacturer: 'AMD',
        brand: 'Ryzen 5 5600X',
        cores: 12,
        physicalCores: 6,
        speedGhz: 3.7,
        loadPercent: round1(state.cpu),
        perCoreLoad: state.cores.map(round1),
        temperatureC: round1(42 + state.cpu / 3.4),
      },
      memory: {
        totalBytes: memTotal,
        usedBytes: Math.round(state.memUsed),
        freeBytes: Math.round(memTotal - state.memUsed),
        usedPercent: round1((state.memUsed / memTotal) * 100),
      },
      disks: [
        { mount: 'C:', type: 'NTFS', totalBytes: 476 * GB, usedBytes: 331 * GB, usedPercent: 69.5 },
        { mount: 'D:', type: 'NTFS', totalBytes: 1863 * GB, usedBytes: 742 * GB, usedPercent: 39.8 },
      ],
      network: [
        { iface: 'Ethernet', rxBytesPerSec: Math.round(state.rx), txBytesPerSec: Math.round(state.tx) },
        { iface: 'Tailscale', rxBytesPerSec: Math.round(state.tx / 6), txBytesPerSec: Math.round(state.rx / 9) },
      ],
      battery: null,
      gpu: [{ model: 'NVIDIA GeForce RTX 3060', vramMB: 12288, temperatureC: 54, loadPercent: 23 }],
      timestamp: Date.now(),
    };
  }

  // ---------------------- Процессы ----------------------

  let processes = [
    { pid: 8124, name: 'chrome.exe', cpu: 14.2, mem: 8.4 },
    { pid: 4412, name: 'Code.exe', cpu: 9.1, mem: 6.2 },
    { pid: 2280, name: 'steam.exe', cpu: 4.7, mem: 3.1 },
    { pid: 1044, name: 'explorer.exe', cpu: 2.3, mem: 2.6 },
    { pid: 6620, name: 'Discord.exe', cpu: 3.4, mem: 4.0 },
    { pid: 512, name: 'MsMpEng.exe', cpu: 6.8, mem: 2.9 },
    { pid: 9330, name: 'node.exe', cpu: 1.9, mem: 1.4 },
    { pid: 3176, name: 'Telegram.exe', cpu: 1.1, mem: 2.2 },
    { pid: 7708, name: 'SearchHost.exe', cpu: 0.8, mem: 1.7 },
    { pid: 1580, name: 'dwm.exe', cpu: 2.6, mem: 1.9 },
    { pid: 660, name: 'svchost.exe', cpu: 0.5, mem: 0.9 },
    { pid: 2044, name: 'spoolsv.exe', cpu: 0.2, mem: 0.4 },
    { pid: 5288, name: 'Tailscale.exe', cpu: 0.4, mem: 0.6 },
    { pid: 8890, name: 'obs64.exe', cpu: 7.3, mem: 5.1 },
    { pid: 1296, name: 'RuntimeBroker.exe', cpu: 0.3, mem: 0.8 },
  ];

  function snapshotProcesses() {
    return processes
      .map((p) => {
        p.cpu = clamp(p.cpu + (Math.random() - 0.5) * 3.2, 0, 78);
        p.mem = clamp(p.mem + (Math.random() - 0.5) * 0.5, 0.1, 24);
        return {
          pid: p.pid,
          name: p.name,
          cpuPercent: Math.round(p.cpu * 10) / 10,
          memPercent: Math.round(p.mem * 10) / 10,
        };
      })
      .sort((a, b) => b.cpuPercent - a.cpuPercent);
  }

  const quickLaunch = [
    { name: 'Проводник', command: 'explorer.exe', detached: true },
    { name: 'Диспетчер задач', command: 'taskmgr.exe', detached: true },
    { name: 'Блокнот', command: 'notepad.exe', detached: true },
    { name: 'Steam', command: 'steam.exe', detached: true },
  ];

  function fakeCommandOutput(command) {
    const cmd = command.trim().toLowerCase();
    if (cmd.startsWith('ipconfig')) {
      return [
        'Настройка протокола IP для Windows',
        '',
        'Адаптер Ethernet:',
        '   IPv4-адрес . . . . . . . . . . . : 192.168.1.42',
        '   Маска подсети  . . . . . . . . . : 255.255.255.0',
        '   Основной шлюз  . . . . . . . . . : 192.168.1.1',
        '',
        'Адаптер Tailscale:',
        '   IPv4-адрес . . . . . . . . . . . : 100.104.22.7',
      ].join('\n');
    }
    if (cmd.startsWith('dir') || cmd.startsWith('ls')) {
      return [
        ' Том в устройстве C не имеет метки.',
        '',
        ' Содержимое папки C:\\Users\\xsanx\\monitoring-pc',
        '',
        '08.09.2026  20:14    <DIR>          public',
        '08.09.2026  20:14    <DIR>          server',
        '08.09.2026  20:14    <DIR>          site',
        '08.09.2026  20:14             1 390 .env.example',
        '08.09.2026  20:14               803 package.json',
      ].join('\n');
    }
    if (cmd.startsWith('echo ')) return command.trim().slice(5);
    if (cmd.startsWith('systeminfo')) {
      return 'Имя узла: DESKTOP-XSANX\nОС: Windows 11 Pro 23H2\nПроцессор: AMD Ryzen 5 5600X\nПамять: 32 ГБ';
    }
    return `Демо-режим: команда "${command.trim()}" не выполняется по-настоящему.\nНа реальном ПК здесь был бы вывод процесса.`;
  }

  // ---------------------- Подмена fetch ----------------------

  const json = (data, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const realFetch = window.fetch.bind(window);

  window.fetch = async (input, options = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    if (!url.startsWith('/api')) return realFetch(input, options);

    const path = url.replace(/^\/api/, '').split('?')[0];
    const method = (options.method || 'GET').toUpperCase();
    const body = options.body ? JSON.parse(options.body) : {};

    await delay(110 + Math.random() * 180);

    if (path === '/auth/login' && method === 'POST') {
      if (!body.username || !body.password) {
        return json({ error: 'Введите логин и пароль' }, 400);
      }
      return json({ token: TOKEN, expiresIn: '12h' });
    }

    if (path === '/system/stats') return json(nextStats());

    if (path === '/processes' && method === 'GET') return json(snapshotProcesses());

    const killMatch = path.match(/^\/processes\/(\d+)\/kill$/);
    if (killMatch && method === 'POST') {
      const pid = Number(killMatch[1]);
      const before = processes.length;
      processes = processes.filter((p) => p.pid !== pid);
      if (processes.length === before) return json({ error: 'Процесс не найден' }, 404);
      return json({ ok: true, pid });
    }

    if (path === '/run/quick-launch') return json(quickLaunch);

    if (path === '/run' && method === 'POST') {
      if (!body.command) return json({ error: 'Команда не указана' }, 400);
      if (body.detached) return json({ ok: true, started: true });
      return json({ ok: true, stdout: fakeCommandOutput(body.command), stderr: '' });
    }

    if (path.startsWith('/power/') && method === 'POST') {
      return json({ ok: true, demo: true });
    }

    return json({ error: 'Демо: этот запрос не поддерживается' }, 404);
  };

  // ---------------------- Подмена WebSocket ----------------------

  class DemoWebSocket {
    constructor(url) {
      this.url = url;
      this.readyState = 0;
      this._listeners = {};
      this._timer = null;

      setTimeout(() => {
        if (this.readyState !== 0) return;
        this.readyState = 1;
        this._emit('open', {});
        this._push();
        this._timer = setInterval(() => this._push(), 2000);
      }, 350);
    }

    _push() {
      this._emit('message', { data: JSON.stringify({ type: 'stats', data: nextStats() }) });
    }

    _emit(type, event) {
      (this._listeners[type] || []).forEach((fn) => fn(event));
      const handler = this[`on${type}`];
      if (typeof handler === 'function') handler(event);
    }

    addEventListener(type, fn) {
      (this._listeners[type] = this._listeners[type] || []).push(fn);
    }

    removeEventListener(type, fn) {
      this._listeners[type] = (this._listeners[type] || []).filter((f) => f !== fn);
    }

    send() {
      /* демо ничего не отправляет на сервер */
    }

    close() {
      clearInterval(this._timer);
      if (this.readyState === 3) return;
      this.readyState = 3;
      this._emit('close', {});
    }
  }

  window.WebSocket = DemoWebSocket;

  // ---------------------- Подсказки в интерфейсе ----------------------

  document.addEventListener('DOMContentLoaded', () => {
    const username = document.querySelector('#login-username');
    const password = document.querySelector('#login-password');
    if (username && password) {
      username.value = 'demo';
      password.value = 'demo';
      const hint = document.createElement('p');
      hint.className = 'subtitle';
      hint.style.margin = '0';
      hint.textContent = 'Демо-режим: подойдут любые логин и пароль.';
      username.closest('form').insertBefore(hint, username.closest('label'));
    }

    if (!EMBED) {
      const badge = document.createElement('div');
      badge.className = 'demo-badge';
      badge.innerHTML =
        '<span class="demo-badge-dot"></span>демо · данные симулированы<a href="/">на сайт ↗</a>';
      document.body.appendChild(badge);
    }
  });
})();
