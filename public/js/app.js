(() => {
  const TOKEN_KEY = 'pcmon_token';
  let token = localStorage.getItem(TOKEN_KEY) || null;
  let ws = null;
  let wsReconnectTimer = null;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const loginScreen = $('#login-screen');
  const appScreen = $('#app-screen');

  // ---------- Утилиты ----------
  function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 Б';
    const units = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'];
    const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }

  function formatSpeed(bytesPerSec) {
    return `${formatBytes(bytesPerSec)}/с`;
  }

  function formatUptime(seconds) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const parts = [];
    if (d) parts.push(`${d} д`);
    if (h) parts.push(`${h} ч`);
    parts.push(`${m} мин`);
    return parts.join(' ');
  }

  function showToast(message, type = '') {
    const toast = $('#toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
      toast.hidden = true;
    }, 3200);
  }

  function confirmAction(text) {
    return new Promise((resolve) => {
      const modal = $('#confirm-modal');
      $('#confirm-text').textContent = text;
      modal.hidden = false;

      const cleanup = (result) => {
        modal.hidden = true;
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        resolve(result);
      };
      const okBtn = $('#confirm-ok');
      const cancelBtn = $('#confirm-cancel');
      const onOk = () => cleanup(true);
      const onCancel = () => cleanup(false);
      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
    });
  }

  // ---------- API ----------
  async function api(path, options = {}) {
    const res = await fetch(`/api${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (res.status === 401 && !path.startsWith('/auth/')) {
      logout();
      throw new Error('Сессия истекла, войдите снова');
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Ошибка запроса (${res.status})`);
    return data;
  }

  // ---------- Авторизация ----------
  function showApp() {
    loginScreen.hidden = true;
    appScreen.hidden = false;
    connectWs();
    refreshProcesses();
    loadQuickLaunch();
  }

  function showLogin() {
    appScreen.hidden = true;
    loginScreen.hidden = false;
    if (ws) ws.close();
    clearTimeout(wsReconnectTimer);
  }

  function logout() {
    token = null;
    localStorage.removeItem(TOKEN_KEY);
    showLogin();
  }

  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = $('#login-username').value.trim();
    const password = $('#login-password').value;
    const errorEl = $('#login-error');
    errorEl.hidden = true;

    try {
      const data = await api('/auth/login', { method: 'POST', body: { username, password } });
      token = data.token;
      localStorage.setItem(TOKEN_KEY, token);
      $('#login-password').value = '';
      showApp();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
    }
  });

  $('#logout-btn').addEventListener('click', () => {
    logout();
  });

  // ---------- Вкладки ----------
  $$('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.tab-btn').forEach((b) => b.classList.remove('active'));
      $$('.tab-panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      $(`#tab-${btn.dataset.tab}`).classList.add('active');
    });
  });

  // ---------- WebSocket: live-статистика ----------
  function connectWs() {
    if (!token) return;
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${protocol}://${location.host}/ws?token=${encodeURIComponent(token)}`);

    ws.addEventListener('open', () => {
      $('#ws-indicator').classList.add('connected');
    });

    ws.addEventListener('close', () => {
      $('#ws-indicator').classList.remove('connected');
      if (!appScreen.hidden) {
        wsReconnectTimer = setTimeout(connectWs, 3000);
      }
    });

    ws.addEventListener('error', () => ws.close());

    ws.addEventListener('message', (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'stats') renderStats(msg.data);
      } catch (err) {
        // игнорируем некорректные сообщения
      }
    });
  }

  function setBar(fillEl, percent) {
    const p = Math.max(0, Math.min(100, percent || 0));
    fillEl.style.width = `${p}%`;
    fillEl.classList.toggle('warn', p >= 80);
  }

  function renderStats(stats) {
    $('#hostname').textContent = stats.hostname || 'PC Monitor';

    $('#cpu-load').textContent = `${stats.cpu.loadPercent}%`;
    setBar($('#cpu-bar'), stats.cpu.loadPercent);
    $('#cpu-meta').textContent = `${stats.cpu.brand} · ${stats.cpu.cores} ядер${
      stats.cpu.temperatureC ? ` · ${stats.cpu.temperatureC}°C` : ''
    }`;

    $('#mem-load').textContent = `${stats.memory.usedPercent}%`;
    setBar($('#mem-bar'), stats.memory.usedPercent);
    $('#mem-meta').textContent = `${formatBytes(stats.memory.usedBytes)} из ${formatBytes(
      stats.memory.totalBytes
    )}`;

    const disksEl = $('#disks-list');
    disksEl.innerHTML = '';
    stats.disks.forEach((d) => {
      const row = document.createElement('div');
      row.className = 'mini-row';
      row.innerHTML = `<span>${d.mount}</span><span>${d.usedPercent}% · ${formatBytes(
        d.usedBytes
      )}/${formatBytes(d.totalBytes)}</span>`;
      disksEl.appendChild(row);
    });
    if (!stats.disks.length) disksEl.textContent = 'Нет данных';

    const netEl = $('#network-list');
    netEl.innerHTML = '';
    stats.network
      .filter((n) => n.rxBytesPerSec || n.txBytesPerSec)
      .forEach((n) => {
        const row = document.createElement('div');
        row.className = 'mini-row';
        row.innerHTML = `<span>${n.iface}</span><span>↓${formatSpeed(n.rxBytesPerSec)} ↑${formatSpeed(
          n.txBytesPerSec
        )}</span>`;
        netEl.appendChild(row);
      });
    if (!netEl.children.length) netEl.textContent = 'Нет активности';

    $('#sys-platform').textContent = stats.platform;
    $('#sys-uptime').textContent = formatUptime(stats.uptimeSeconds);
    $('#sys-temp').textContent = stats.cpu.temperatureC ? `${stats.cpu.temperatureC}°C` : '—';
    $('#sys-battery').textContent = stats.battery
      ? `${stats.battery.percent}%${stats.battery.isCharging ? ' (заряжается)' : ''}`
      : 'нет батареи';
  }

  // ---------- Процессы ----------
  let allProcesses = [];

  async function refreshProcesses() {
    const listEl = $('#process-list');
    try {
      allProcesses = await api('/processes');
      renderProcesses();
    } catch (err) {
      listEl.textContent = `Ошибка: ${err.message}`;
    }
  }

  function renderProcesses() {
    const listEl = $('#process-list');
    const filter = $('#process-filter').value.trim().toLowerCase();
    const filtered = allProcesses.filter((p) => p.name.toLowerCase().includes(filter));

    listEl.innerHTML = '';
    filtered.slice(0, 100).forEach((p) => {
      const row = document.createElement('div');
      row.className = 'process-row';
      row.innerHTML = `
        <div class="process-info">
          <div class="process-name">${p.name}</div>
          <div class="process-stats">PID ${p.pid} · CPU ${p.cpuPercent}% · RAM ${p.memPercent}%</div>
        </div>
        <button class="kill-btn" data-pid="${p.pid}">Завершить</button>
      `;
      listEl.appendChild(row);
    });

    if (!filtered.length) listEl.textContent = 'Ничего не найдено';
  }

  $('#process-filter').addEventListener('input', renderProcesses);
  $('#refresh-processes').addEventListener('click', refreshProcesses);

  $('#process-list').addEventListener('click', async (e) => {
    const btn = e.target.closest('.kill-btn');
    if (!btn) return;
    const pid = btn.dataset.pid;
    const proc = allProcesses.find((p) => String(p.pid) === pid);
    const ok = await confirmAction(`Завершить процесс "${proc ? proc.name : pid}" (PID ${pid})?`);
    if (!ok) return;

    try {
      await api(`/processes/${pid}/kill`, { method: 'POST' });
      showToast('Процесс завершён', 'success');
      refreshProcesses();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // ---------- Запуск команд ----------
  async function loadQuickLaunch() {
    const el = $('#quick-launch-list');
    try {
      const items = await api('/run/quick-launch');
      el.innerHTML = '';
      items.forEach((item) => {
        const btn = document.createElement('button');
        btn.className = 'quick-launch-btn';
        btn.textContent = item.name;
        btn.addEventListener('click', () => runCommand(item.command, item.detached !== false));
        el.appendChild(btn);
      });
      if (!items.length) el.textContent = 'Список пуст (server/config/quickLaunch.json)';
    } catch (err) {
      el.textContent = `Ошибка: ${err.message}`;
    }
  }

  async function runCommand(command, detached) {
    const outputEl = $('#run-output');
    try {
      const result = await api('/run', { method: 'POST', body: { command, detached } });
      if (detached) {
        showToast('Запущено', 'success');
      } else {
        outputEl.hidden = false;
        outputEl.textContent = [result.stdout, result.stderr].filter(Boolean).join('\n') || '(нет вывода)';
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  $('#run-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const command = $('#run-command').value.trim();
    const detached = $('#run-detached').checked;
    if (!command) return;
    await runCommand(command, detached);
  });

  // ---------- Питание ----------
  const powerLabels = {
    shutdown: 'выключить компьютер',
    restart: 'перезагрузить компьютер',
    sleep: 'перевести компьютер в сон',
    lock: 'заблокировать компьютер',
    logoff: 'выйти из системы',
    cancelShutdown: 'отменить запланированное выключение',
  };

  $$('.power-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.action;
      const ok = await confirmAction(`Вы уверены, что хотите ${powerLabels[action] || action}?`);
      if (!ok) return;

      try {
        await api(`/power/${action}`, { method: 'POST' });
        showToast('Команда отправлена', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });

  // ---------- Старт ----------
  if (token) {
    showApp();
  } else {
    showLogin();
  }
})();
