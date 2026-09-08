#!/usr/bin/env node
/*
 * Генерирует bcrypt-хэш пароля для .env (ADMIN_PASSWORD_HASH).
 * Использование: npm run create-user -- ваш_пароль
 * Либо без аргумента — будет запрошен интерактивно.
 */
const readline = require('readline');
const bcrypt = require('bcryptjs');

async function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  let password = process.argv[2];

  if (!password) {
    password = await prompt('Введите новый пароль администратора: ');
  }

  if (!password || password.length < 8) {
    console.error('Пароль должен содержать минимум 8 символов.');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);

  console.log('\nГотово! Добавьте эту строку в файл .env:\n');
  console.log(`ADMIN_PASSWORD_HASH=${hash}\n`);
}

main();
