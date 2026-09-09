(() => {
  const TOKEN_KEY = 'pcmon_token';
  let token = localStorage.getItem(TOKEN_KEY) || null;
  let ws = null;
  let wsReconnectTimer = null;
  let authRequired = true;

  const SPARKLINE_LENGTH = 30; // ~1 минута при обновлении раз в 2 сек
  const cpuHistory = [];
  const memHistory = [];

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const loginScreen = $('#login-screen');
  const appScreen = $('#app-screen');

  // ---------- Утилиты ----------
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

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
  function showAuthDisabledBanner() {
    if ($('#auth-disabled-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'auth-disabled-banner';
    banner.className = 'auth-disabled-banner';
    banner.textContent =
      '⚠ Вход по паролю временно отключён (DISABLE_AUTH=true) — сайт открыт для всех, у кого есть ссылка.';
    document.body.prepend(banner);
  }

  function showApp() {
    loginScreen.hidden = true;
    appScreen.hidden = false;
    connectWs();
    refreshProcesses();
    loadQuickLaunch();
    loadHistory();
  }

  function showLogin() {
    appScreen.hidden = true;
    loginScreen.hidden = false;
    if (ws) ws.close();
    clearTimeout(wsReconnectTimer);
    clearInterval(processAutoRefreshTimer);
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
      updateProcessAutoRefresh();
    });
  });

  // ---------- WebSocket: live-статистика ----------
  function connectWs() {
    if (authRequired && !token) return;
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
    ws = new WebSocket(`${protocol}://${location.host}/ws${tokenParam}`);

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

  function pushHistory(history, value) {
    history.push(Math.max(0, Math.min(100, value || 0)));
    if (history.length > SPARKLINE_LENGTH) history.shift();
  }

  function renderSparkline(svgId, history) {
    const svg = $(`#${svgId}`);
    if (!svg) return;
    const polyline = svg.querySelector('polyline');
    if (!polyline) return;

    if (history.length < 2) {
      polyline.setAttribute('points', '');
      return;
    }

    const step = 100 / (SPARKLINE_LENGTH - 1);
    const startX = 100 - (history.length - 1) * step;
    const points = history
      .map((value, i) => {
        const x = startX + i * step;
        const y = 28 - (value / 100) * 26 - 1;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    polyline.setAttribute('points', points);
  }

  function renderStats(stats) {
    $('#hostname').textContent = stats.hostname || 'PC Monitor';

    const coresLabel =
      stats.cpu.physicalCores && stats.cpu.physicalCores !== stats.cpu.cores
        ? `${stats.cpu.physicalCores} ядер (${stats.cpu.cores} потоков)`
        : `${stats.cpu.cores} ядер`;

    $('#cpu-load').textContent = `${stats.cpu.loadPercent}%`;
    setBar($('#cpu-bar'), stats.cpu.loadPercent);
    pushHistory(cpuHistory, stats.cpu.loadPercent);
    renderSparkline('cpu-sparkline', cpuHistory);
    $('#cpu-meta').textContent = `${stats.cpu.brand} · ${coresLabel}${
      stats.cpu.temperatureC ? ` · ${stats.cpu.temperatureC}°C*` : ''
    }`;

    $('#mem-load').textContent = `${stats.memory.usedPercent}%`;
    setBar($('#mem-bar'), stats.memory.usedPercent);
    pushHistory(memHistory, stats.memory.usedPercent);
    renderSparkline('mem-sparkline', memHistory);
    $('#mem-meta').textContent = `${formatBytes(stats.memory.usedBytes)} из ${formatBytes(
      stats.memory.totalBytes
    )}`;

    const disksEl = $('#disks-list');
    disksEl.innerHTML = '';
    stats.disks.forEach((d) => {
      const row = document.createElement('div');
      row.className = 'mini-row';
      row.innerHTML = `<span>${escapeHtml(d.mount)}</span><span>${d.usedPercent}% · ${formatBytes(
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
        row.innerHTML = `<span>${escapeHtml(n.iface)}</span><span>↓${formatSpeed(n.rxBytesPerSec)} ↑${formatSpeed(
          n.txBytesPerSec
        )}</span>`;
        netEl.appendChild(row);
      });
    if (!netEl.children.length) netEl.textContent = 'Нет активности';

    const gpuCard = $('#gpu-card');
    const gpuEl = $('#gpu-list');
    if (stats.gpu && stats.gpu.length) {
      gpuCard.hidden = false;
      gpuEl.innerHTML = '';
      stats.gpu.forEach((g) => {
        const row = document.createElement('div');
        row.className = 'mini-row';
        const details = [
          g.loadPercent != null ? `${g.loadPercent}%` : null,
          g.temperatureC != null ? `${g.temperatureC}°C` : null,
          g.vramMB ? `${Math.round(g.vramMB / 1024)} ГБ VRAM` : null,
        ]
          .filter(Boolean)
          .join(' · ');
        row.innerHTML = `<span>${escapeHtml(g.model || 'GPU')}</span><span>${escapeHtml(
          details || '—'
        )}</span>`;
        gpuEl.appendChild(row);
      });
    } else {
      gpuCard.hidden = true;
    }

    renderResourceWarning(stats);

    $('#sys-platform').textContent = stats.platform;
    $('#sys-uptime').textContent = formatUptime(stats.uptimeSeconds);
    $('#sys-temp').textContent = stats.cpu.temperatureC ? `${stats.cpu.temperatureC}°C*` : '—';
    $('#sys-battery').textContent = stats.battery
      ? `${stats.battery.percent}%${stats.battery.isCharging ? ' (заряжается)' : ''}`
      : 'нет батареи';

    const tempNote = $('#temp-note');
    if (tempNote) tempNote.hidden = !stats.cpu.temperatureC;

    renderAccessUrls(stats.localIps);
  }

  const RESOURCE_WARNING_THRESHOLD = 90;

  function renderResourceWarning(stats) {
    const el = $('#resource-warning');
    if (!el) return;

    const problems = [];
    if (stats.cpu.loadPercent >= RESOURCE_WARNING_THRESHOLD) {
      problems.push(`CPU загружен на ${stats.cpu.loadPercent}%`);
    }
    if (stats.memory.usedPercent >= RESOURCE_WARNING_THRESHOLD) {
      problems.push(`память занята на ${stats.memory.usedPercent}%`);
    }
    stats.disks.forEach((d) => {
      if (d.usedPercent >= RESOURCE_WARNING_THRESHOLD) {
        problems.push(`диск ${d.mount} заполнен на ${d.usedPercent}%`);
      }
    });

    if (problems.length) {
      el.textContent = `⚠ Высокая нагрузка: ${problems.join(', ')}.`;
      el.hidden = false;
    } else {
      el.hidden = true;
    }
  }

  function renderAccessUrls(localIps) {
    const el = $('#access-urls');
    if (!el) return;

    const port = location.port || (location.protocol === 'https:' ? '443' : '80');
    const ips = localIps || [];

    el.innerHTML = '';
    ips.forEach(({ iface, address }) => {
      const url = `${location.protocol}//${address}:${port}`;
      const row = document.createElement('div');
      row.className = 'mini-row access-url-row';
      row.innerHTML = `<span>${escapeHtml(iface)}</span><span class="access-url" data-url="${escapeHtml(
        url
      )}">${escapeHtml(url)}</span>`;
      el.appendChild(row);
    });

    if (!ips.length) el.textContent = 'Не удалось определить локальный адрес';
  }

  document.addEventListener('click', async (e) => {
    const target = e.target.closest('.access-url');
    if (!target) return;
    const url = target.dataset.url;
    try {
      await navigator.clipboard.writeText(url);
      showToast('Адрес скопирован', 'success');
    } catch (err) {
      showToast(url, '');
    }
  });

  // ---------- История действий ----------
  const historyTypeLabels = { power: 'Питание', run: 'Команда', kill: 'Процесс' };

  function formatRelativeTime(timestamp) {
    const diffSec = Math.round((Date.now() - timestamp) / 1000);
    if (diffSec < 60) return 'только что';
    if (diffSec < 3600) return `${Math.round(diffSec / 60)} мин назад`;
    if (diffSec < 86400) return `${Math.round(diffSec / 3600)} ч назад`;
    return new Date(timestamp).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  async function loadHistory() {
    const el = $('#history-list');
    if (!el) return;
    try {
      const items = await api('/history');
      el.innerHTML = '';
      items.forEach((item) => {
        const row = document.createElement('div');
        row.className = `history-row${item.ok ? '' : ' error'}`;
        const label = historyTypeLabels[item.type] || item.type;
        const detail = item.ok
          ? `${label}: ${item.detail}${item.message ? ` (${item.message})` : ''}`
          : `${label}: ${item.detail} — ошибка: ${item.message}`;
        row.innerHTML = `<span class="history-row-main">${escapeHtml(
          detail
        )}</span><span class="history-row-time">${formatRelativeTime(item.timestamp)}</span>`;
        el.appendChild(row);
      });
      if (!items.length) el.textContent = 'Пока нет действий';
    } catch (err) {
      el.textContent = `Ошибка: ${err.message}`;
    }
  }

  const refreshHistoryBtn = $('#refresh-history-btn');
  if (refreshHistoryBtn) refreshHistoryBtn.addEventListener('click', loadHistory);

  // ---------- Процессы ----------
  let allProcesses = [];
  const PROCESS_LIMIT = 100;

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
    const sortBy = $('#process-sort') ? $('#process-sort').value : 'cpu';

    const filtered = allProcesses
      .filter((p) => p.name.toLowerCase().includes(filter))
      .sort((a, b) => (sortBy === 'mem' ? b.memPercent - a.memPercent : b.cpuPercent - a.cpuPercent));

    const shown = filtered.slice(0, PROCESS_LIMIT);

    listEl.innerHTML = '';
    shown.forEach((p) => {
      const row = document.createElement('div');
      row.className = 'process-row';
      const killBtnHtml = p.protected
        ? `<button class="kill-btn" disabled title="Системный процесс — завершение заблокировано">🛡 Система</button>`
        : `<button class="kill-btn" data-pid="${p.pid}">Завершить</button>`;
      row.innerHTML = `
        <div class="process-info">
          <div class="process-name">${escapeHtml(p.name)}</div>
          <div class="process-stats">PID ${p.pid} · CPU ${p.cpuPercent}% · RAM ${p.memPercent}%</div>
        </div>
        ${killBtnHtml}
      `;
      listEl.appendChild(row);
    });

    const countEl = $('#process-count');
    if (countEl) {
      countEl.textContent = filtered.length
        ? `Показано ${shown.length} из ${filtered.length}`
        : '';
    }

    if (!filtered.length) listEl.textContent = 'Ничего не найдено';
  }

  $('#process-filter').addEventListener('input', renderProcesses);
  $('#refresh-processes').addEventListener('click', refreshProcesses);
  const processSortEl = $('#process-sort');
  if (processSortEl) processSortEl.addEventListener('change', renderProcesses);

  let processAutoRefreshTimer = null;
  const PROCESS_AUTOREFRESH_MS = 5000;

  function updateProcessAutoRefresh() {
    clearInterval(processAutoRefreshTimer);
    processAutoRefreshTimer = null;

    const checkbox = $('#process-autorefresh');
    const tabActive = $('#tab-processes') && $('#tab-processes').classList.contains('active');
    if (!checkbox || !checkbox.checked || !tabActive) return;

    processAutoRefreshTimer = setInterval(refreshProcesses, PROCESS_AUTOREFRESH_MS);
  }

  const processAutoRefreshEl = $('#process-autorefresh');
  if (processAutoRefreshEl) {
    processAutoRefreshEl.addEventListener('change', updateProcessAutoRefresh);
  }

  $('#process-list').addEventListener('click', async (e) => {
    const btn = e.target.closest('.kill-btn');
    if (!btn || btn.disabled) return;
    const pid = btn.dataset.pid;
    const proc = allProcesses.find((p) => String(p.pid) === pid);
    const ok = await confirmAction(`Завершить процесс "${proc ? proc.name : pid}" (PID ${pid})?`);
    if (!ok) return;

    try {
      const result = await api(`/processes/${pid}/kill`, { method: 'POST' });
      showToast(
        result.method === 'forced' ? 'Процесс завершён принудительно' : 'Процесс закрыт',
        'success'
      );
      refreshProcesses();
      loadHistory();
    } catch (err) {
      showToast(err.message, 'error');
      loadHistory();
    }
  });

  // ---------- Запуск команд ----------
  async function loadQuickLaunch() {
    const el = $('#quick-launch-list');
    try {
      const items = await api('/run/quick-launch');
      renderQuickLaunch(items);
    } catch (err) {
      el.textContent = `Ошибка: ${err.message}`;
    }
  }

  function renderQuickLaunch(items) {
    const el = $('#quick-launch-list');
    el.innerHTML = '';

    items.forEach((item) => {
      const chip = document.createElement('div');
      chip.className = 'quick-launch-chip';

      const btn = document.createElement('button');
      btn.className = 'quick-launch-btn';
      btn.textContent = item.name;
      btn.addEventListener('click', () => runCommand(item.command, item.detached !== false));

      const removeBtn = document.createElement('button');
      removeBtn.className = 'quick-launch-remove';
      removeBtn.textContent = '×';
      removeBtn.title = 'Удалить ярлык';
      removeBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const ok = await confirmAction(`Удалить ярлык "${item.name}"?`);
        if (!ok) return;
        try {
          const updated = await api(`/run/quick-launch/${encodeURIComponent(item.id)}`, {
            method: 'DELETE',
          });
          renderQuickLaunch(updated);
        } catch (err) {
          showToast(err.message, 'error');
        }
      });

      chip.appendChild(btn);
      chip.appendChild(removeBtn);
      el.appendChild(chip);
    });

    if (!items.length) el.textContent = 'Список пуст — добавьте ярлык кнопкой «+»';
  }

  const addQuickLaunchBtn = $('#add-quick-launch-btn');
  const quickLaunchForm = $('#quick-launch-form');
  const cancelQuickLaunchBtn = $('#cancel-quick-launch-btn');

  if (addQuickLaunchBtn && quickLaunchForm) {
    addQuickLaunchBtn.addEventListener('click', () => {
      quickLaunchForm.hidden = !quickLaunchForm.hidden;
      if (!quickLaunchForm.hidden) $('#ql-name').focus();
    });
  }

  if (cancelQuickLaunchBtn && quickLaunchForm) {
    cancelQuickLaunchBtn.addEventListener('click', () => {
      quickLaunchForm.hidden = true;
      quickLaunchForm.reset();
    });
  }

  if (quickLaunchForm) {
    quickLaunchForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = $('#ql-name').value.trim();
      const command = $('#ql-command').value.trim();
      const detached = $('#ql-detached').checked;
      if (!name || !command) return;

      try {
        const updated = await api('/run/quick-launch', {
          method: 'POST',
          body: { name, command, detached },
        });
        renderQuickLaunch(updated);
        quickLaunchForm.reset();
        quickLaunchForm.hidden = true;
        showToast('Ярлык добавлен', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
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
      loadHistory();
    } catch (err) {
      showToast(err.message, 'error');
      loadHistory();
    }
  }

  $('#run-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const command = $('#run-command').value.trim();
    const detached = $('#run-detached').checked;
    if (!command) return;

    const ok = await confirmAction(`Выполнить команду на ПК?\n\n${command}`);
    if (!ok) return;

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
        loadHistory();
      } catch (err) {
        showToast(err.message, 'error');
        loadHistory();
      }
    });
  });

  const delayLabels = {
    15: 'через 15 минут',
    30: 'через 30 минут',
    60: 'через 1 час',
    120: 'через 2 часа',
    240: 'через 4 часа',
  };

  async function runDelayedPower(action, actionLabel) {
    const minutes = parseInt($('#delay-minutes').value, 10);
    const label = delayLabels[minutes] || `через ${minutes} мин`;
    const ok = await confirmAction(`${actionLabel} ${label}?`);
    if (!ok) return;

    try {
      await api(`/power/${action}`, { method: 'POST', body: { delayMinutes: minutes } });
      showToast(`Запланировано: ${label}`, 'success');
      loadHistory();
    } catch (err) {
      showToast(err.message, 'error');
      loadHistory();
    }
  }

  const delayedShutdownBtn = $('#delayed-shutdown-btn');
  if (delayedShutdownBtn) {
    delayedShutdownBtn.addEventListener('click', () => runDelayedPower('shutdown', 'Выключить компьютер'));
  }

  const delayedRestartBtn = $('#delayed-restart-btn');
  if (delayedRestartBtn) {
    delayedRestartBtn.addEventListener('click', () => runDelayedPower('restart', 'Перезагрузить компьютер'));
  }

  // ---------- Старт ----------
  (async () => {
    try {
      const res = await fetch('/api/auth/status');
      const data = await res.json();
      authRequired = data.authRequired !== false;
    } catch (err) {
      authRequired = true;
    }

    if (!authRequired) {
      showAuthDisabledBanner();
      showApp();
      return;
    }

    if (token) {
      showApp();
    } else {
      showLogin();
    }
  })();
})();
