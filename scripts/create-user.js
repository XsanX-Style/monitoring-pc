#!/usr/bin/env node
/*
 * Генерирует bcrypt-хэш пароля и сам записывает его в .env (ADMIN_PASSWORD_HASH),
 * а также генерирует JWT_SECRET, если он ещё не задан.
 * Ничего не нужно копировать вручную — исключает ошибки при переносе хэша.
 * Использование: npm run create-user -- ваш_пароль
 * Либо без аргумента — пароль будет запрошен интерактивно (ввод скрыт).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

function promptPasswordHidden(question) {
  return new Promise((resolve) => {
    const stdin = process.stdin;

    if (!stdin.isTTY) {
      // Не интерактивный терминал — обычный ввод без маскировки
      const readline = require('readline');
      const rl = readline.createInterface({ input: stdin, output: process.stdout });
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
      return;
    }

    process.stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let password = '';
    const onData = (char) => {
      switch (char) {
        case '\n':
        case '\r':
        case '':
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          process.stdout.write('\n');
          resolve(password);
          break;
        case '': // Ctrl+C
          process.stdout.write('\n');
          process.exit(1);
          break;
        case '': // Backspace
        case '\b':
          if (password.length) {
            password = password.slice(0, -1);
            process.stdout.write('\b \b');
          }
          break;
        default:
          password += char;
          process.stdout.write('*');
          break;
      }
    };
    stdin.on('data', onData);
  });
}

function loadEnvFile() {
  if (fs.existsSync(envPath)) {
    return fs.readFileSync(envPath, 'utf8');
  }
  if (fs.existsSync(envExamplePath)) {
    console.log('Файл .env не найден — создаю его на основе .env.example');
    return fs.readFileSync(envExamplePath, 'utf8');
  }
  throw new Error('Не найден ни .env, ни .env.example рядом с проектом.');
}

function setEnvValue(content, key, value) {
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  const lines = content.split(/\r\n|\n/);
  const prefix = `${key}=`;
  let found = false;

  const updated = lines.map((line) => {
    if (line.startsWith(prefix)) {
      found = true;
      return `${prefix}${value}`;
    }
    return line;
  });

  if (!found) {
    updated.push(`${prefix}${value}`);
  }

  return updated.join(eol);
}

function getEnvValue(content, key) {
  const line = content.split(/\r\n|\n/).find((l) => l.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : '';
}

async function main() {
  let password = process.argv[2];

  if (!password) {
    password = await promptPasswordHidden('Введите новый пароль администратора (мин. 8 символов): ');
  }

  if (!password || password.length < 8) {
    console.error('Пароль должен содержать минимум 8 символов.');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);

  let content = loadEnvFile();
  content = setEnvValue(content, 'ADMIN_PASSWORD_HASH', hash);

  if (!getEnvValue(content, 'JWT_SECRET')) {
    const jwtSecret = crypto.randomBytes(48).toString('hex');
    content = setEnvValue(content, 'JWT_SECRET', jwtSecret);
    console.log('JWT_SECRET был пуст — сгенерировал новый автоматически.');
  }

  fs.writeFileSync(envPath, content, 'utf8');

  console.log('\nГотово! Пароль сохранён в .env (ADMIN_PASSWORD_HASH обновлён).');
  console.log('Ничего копировать не нужно — можно перезапускать сервер: npm start\n');
}

main();
