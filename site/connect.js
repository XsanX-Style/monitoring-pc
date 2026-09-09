'use strict';

/*
 * Страница подключения работает без бэкенда: она только проверяет адрес панели
 * и открывает его. Список недавних адресов лежит в localStorage браузера.
 */

const STORAGE_KEY = 'pc-monitor:servers:v2';
const LEGACY_KEY = 'pc-monitor:server:v1';
const MAX_RECENT = 5;

const form = document.getElementById('connect');
const serverInput = document.getElementById('server');
const errorEl = document.getElementById('error');
const recentBox = document.getElementById('recent');
const recentList = document.getElementById('recent-list');

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* приватный режим — просто не сохраняем */
  }
}

function loadRecent() {
  const raw = readStorage(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((item) => typeof item === 'string').slice(0, MAX_RECENT);
    } catch {
      /* повреждённое значение игнорируем */
    }
  }

  // Переносим единственный адрес из старой версии страницы
  const legacy = readStorage(LEGACY_KEY);
  return legacy ? [legacy] : [];
}

function saveRecent(list) {
  writeStorage(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
}

/** Приводит ввод к валидному URL: «192.168.1.10:3000» → «http://192.168.1.10:3000/». */
function normalizeUrl(raw) {
  const value = String(raw || '').trim();
  if (!value) throw new Error('Введите адрес панели, например 192.168.1.10:3000');

  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `http://${value}`;

  let url;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error('Не похоже на адрес. Пример: 192.168.1.10:3000');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Поддерживаются только адреса http:// и https://');
  }
  if (url.username || url.password) {
    throw new Error('Уберите логин и пароль из ссылки — пароль вводится на самой панели');
  }
  if (!url.hostname) {
    throw new Error('В адресе не хватает имени хоста или IP');
  }
  if (url.origin === location.origin) {
    throw new Error('Это адрес самой этой страницы. Введите адрес панели на компьютере');
  }

  return url;
}

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
}

function clearError() {
  errorEl.hidden = true;
  errorEl.textContent = '';
}

function renderRecent() {
  const list = loadRecent();
  recentList.innerHTML = '';

  list.forEach((href) => {
    const item = document.createElement('li');
    item.className = 'recent-chip';

    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'recent-open';
    open.textContent = href.replace(/^https?:\/\//, '').replace(/\/$/, '');
    open.title = `Открыть ${href}`;
    open.addEventListener('click', () => connect(href));

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'recent-remove';
    remove.textContent = '×';
    remove.title = 'Убрать из списка';
    remove.setAttribute('aria-label', `Убрать ${href} из списка`);
    remove.addEventListener('click', () => {
      saveRecent(loadRecent().filter((saved) => saved !== href));
      renderRecent();
    });

    item.append(open, remove);
    recentList.appendChild(item);
  });

  recentBox.hidden = list.length === 0;
}

function connect(rawValue) {
  clearError();
  let url;
  try {
    url = normalizeUrl(rawValue);
  } catch (caught) {
    showError(caught.message);
    serverInput.focus();
    return;
  }

  const list = loadRecent().filter((saved) => saved !== url.href);
  list.unshift(url.href);
  saveRecent(list);
  writeStorage(LEGACY_KEY, url.href);

  location.assign(url.href);
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  connect(serverInput.value);
});

serverInput.addEventListener('input', clearError);

// Подставляем последний использованный адрес
const [lastUsed] = loadRecent();
if (lastUsed) serverInput.value = lastUsed;
renderRecent();

// Кнопки «скопировать» у команд установки
document.querySelectorAll('.copy-btn').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const text = btn.dataset.copy || '';
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const helper = document.createElement('textarea');
      helper.value = text;
      helper.setAttribute('readonly', '');
      helper.style.position = 'fixed';
      helper.style.opacity = '0';
      document.body.appendChild(helper);
      helper.select();
      try {
        document.execCommand('copy');
      } catch {
        /* браузер не дал скопировать — оставляем как есть */
      }
      helper.remove();
    }

    btn.classList.add('done');
    const label = btn.title;
    btn.title = 'Скопировано';
    setTimeout(() => {
      btn.classList.remove('done');
      btn.title = label;
    }, 1400);
  });
});
