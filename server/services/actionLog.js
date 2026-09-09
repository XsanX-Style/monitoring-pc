const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dataDir = path.join(__dirname, '..', 'data');
const logPath = path.join(dataDir, 'actionLog.json');
const MAX_ENTRIES = 100;

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function readLog() {
  try {
    const raw = fs.readFileSync(logPath, 'utf-8');
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    return [];
  }
}

function writeLog(list) {
  ensureDataDir();
  fs.writeFileSync(logPath, JSON.stringify(list, null, 2), 'utf-8');
}

// type: 'power' | 'run' | 'kill'
// ok: true/false, message: краткое описание для журнала
function record({ type, detail, ok, message }) {
  const list = readLog();
  list.unshift({
    id: crypto.randomUUID(),
    type,
    detail,
    ok: Boolean(ok),
    message: message || '',
    timestamp: Date.now(),
  });

  if (list.length > MAX_ENTRIES) list.length = MAX_ENTRIES;

  try {
    writeLog(list);
  } catch (err) {
    console.error('[actionLog] Не удалось сохранить журнал:', err.message);
  }
}

function getRecent(limit = MAX_ENTRIES) {
  return readLog().slice(0, limit);
}

module.exports = { record, getRecent };
