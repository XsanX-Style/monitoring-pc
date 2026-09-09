'use strict';
const serverInput = document.getElementById('server');
try { serverInput.value = localStorage.getItem('pc-monitor:server:v1') || ''; } catch {}
document.getElementById('connect').addEventListener('submit', (event) => {
  event.preventDefault();
  const error = document.getElementById('error');
  try {
    const url = new URL(serverInput.value.trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
      throw new Error('Укажите адрес http:// или https:// без логина и пароля в ссылке.');
    }
    if (url.origin === location.origin) throw new Error('Введите адрес панели на ПК, а не адрес этой страницы.');
    try { localStorage.setItem('pc-monitor:server:v1', url.href); } catch {}
    location.assign(url.href);
  } catch (caught) {
    error.hidden = false;
    error.textContent = caught.message || 'Проверьте адрес панели.';
  }
});
