#!/usr/bin/env node
/**
 * Сборка превью-сайта (site/ -> site/dist).
 *
 * Демо-страница показывает настоящий интерфейс панели, поэтому стили, скрипт и
 * разметку она берёт из public/ — копий, которые пришлось бы синхронизировать
 * руками, в репозитории нет.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const siteDir = path.join(root, 'site');
const publicDir = path.join(root, 'public');
const distDir = path.join(siteDir, 'dist');

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (entry.name === 'dist') continue;
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dest);
    else fs.copyFileSync(src, dest);
  }
}

/** Достаёт содержимое <body> дашборда, убирая теги <script> — их подключает демо само. */
function extractDashboardMarkup() {
  const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  const match = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (!match) throw new Error('public/index.html: не найден <body> — нечего подставить в демо');

  const markup = match[1].replace(/<script[\s\S]*?<\/script>/gi, '').trim();
  if (!markup.includes('id="app-screen"')) {
    throw new Error('public/index.html: в разметке нет #app-screen — структура изменилась');
  }
  return markup;
}

function buildDemoPage(markup) {
  const file = path.join(distDir, 'demo.html');
  const template = fs.readFileSync(file, 'utf8');
  if (!template.includes('<!--DASHBOARD-->')) {
    throw new Error('site/demo.html: не найден маркер <!--DASHBOARD-->');
  }
  fs.writeFileSync(file, template.replace('<!--DASHBOARD-->', markup));
}

fs.rmSync(distDir, { recursive: true, force: true });
copyDir(siteDir, distDir);

fs.mkdirSync(path.join(distDir, 'app'), { recursive: true });
fs.copyFileSync(path.join(publicDir, 'css', 'style.css'), path.join(distDir, 'app', 'style.css'));
fs.copyFileSync(path.join(publicDir, 'js', 'app.js'), path.join(distDir, 'app', 'app.js'));

buildDemoPage(extractDashboardMarkup());

console.log(`Превью-сайт собран: ${path.relative(root, distDir)}`);
