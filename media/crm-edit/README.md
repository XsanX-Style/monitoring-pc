# X-STYLE CRM — промо-эдит

Рекламный ролик про X-Style CRM (Telegram-бот + веб-CRM), смонтированный под трек из
референса (`IMG_9919.MP4`, Death Note edit): жёсткие резы по битам, глитчи, зум-панчи,
плёночное зерно. Кадры — настоящие экраны продукта, палитра фирменная: `#030604` + `#a8ff45`.

## Готовые файлы

| Файл | Формат | Куда |
|---|---|---|
| `XSTYLE_CRM_edit_1080x1080.mp4` | 1080×1080, 60 fps, 11.1 с | Instagram-лента, Telegram, VK |
| `XSTYLE_CRM_edit_1080x1920_vertical.mp4` | 1080×1920, 60 fps, 11.1 с | Reels / TikTok / Shorts / Stories |

## Тайминг (привязан к музыке)

Бит-сетка: дроп на `3.18 с`, шаг бита `0.2294 с` (~131 BPM). Резы стоят на битах.

| Время | Кадр |
|---|---|
| 0.00–1.35 | `by XSANX` — глитч-интро |
| 1.35–3.18 | «ЗАЯВКИ ТЕРЯЮТСЯ» → «КЛИЕНТЫ УХОДЯТ» → «ДЕНЬГИ УТЕКАЮТ» → «ХВАТИТ.» + блэкаут |
| 3.18 | **дроп** — логотип X-STYLE CRM |
| 4.10–4.79 | лендинг: неоновый X и «ТВОЙ БИЗНЕС. ТВОИ ПРАВИЛА» |
| 4.79–5.25 | «БИЗНЕС ПОД КОНТРОЛЕМ» |
| 5.25–5.93 | Фокус-центр: 695 000 ₽ оплат, 802 000 ₽ в работе |
| 5.93–6.39 | Аналитика: конверсия 38%, средний чек 139 000 ₽ |
| 6.39–6.85 | «КЛИЕНТЫ · СДЕЛКИ · ЗАДАЧИ · ОТЧЁТЫ» |
| 6.85–7.54 | Канбан сделок: 13 сделок на 1 497 000 ₽ |
| 7.54–8.00 | «ВОРОНКА ВЕДЁТ САМА» |
| 8.00–8.69 | Telegram Mini App на двух телефонах |
| 8.69–9.61 | «В TELEGRAM» / «И В БРАУЗЕРЕ» / «ДАННЫЕ ОДНИ» |
| 9.61–9.83 | сплит: телефон и десктоп |
| 9.83–10.29 | «X-STYLE CRM · твой бизнес, твои правила» |
| 10.29–11.10 | финальная карточка: X, обе ссылки, `by xsanx` |

## Как пересобрать

Кадры рисует Chromium по HTML-таймлайну, дальше всё склеивает ffmpeg.

```bash
cd media/crm-edit/src
npm install                      # playwright-core
node shoot.js preview 5.9 7.3    # отдельные кадры в preview/
node shoot.js all                # все 666 кадров в frames/ (~2.5 мин)
```

Сборка (из `src/`, `REF` — исходное видео, из него берётся звук):

```bash
REF=/путь/к/IMG_9919.MP4
FX="eq=contrast=1.04:saturation=1.0,format=gbrp,split[a][b];\
[b]lutrgb=r='if(gt(val,185),val,0)':g='if(gt(val,185),val,0)':b='if(gt(val,185),val,0)',\
colorchannelmixer=.34:.33:.33:0:.34:.33:.33:0:.34:.33:.33,gblur=sigma=18,format=gbrp[bl];\
[a][bl]blend=all_mode=screen:all_opacity=0.24,format=yuv420p,noise=alls=5:allf=t+u[v]"

ffmpeg -framerate 60 -i frames/f_%05d.png -i "$REF" \
  -filter_complex "$FX;[1:a]afade=t=out:st=10.29:d=0.18,apad=whole_dur=11.10[aud]" \
  -map "[v]" -map "[aud]" -c:v libx264 -crf 19 -preset slow -pix_fmt yuv420p -r 60 \
  -c:a aac -b:a 192k -ac 2 -movflags +faststart ../XSTYLE_CRM_edit_1080x1080.mp4 -y

ffmpeg -i ../XSTYLE_CRM_edit_1080x1080.mp4 -vf "pad=1080:1920:0:420:black" \
  -c:v libx264 -crf 19 -preset slow -pix_fmt yuv420p -c:a copy \
  ../XSTYLE_CRM_edit_1080x1920_vertical.mp4 -y
```

## Как обновить скриншоты продукта

`src/assets/*.png` — настоящие экраны X-Style CRM, снятые Chromium из репозитория
`x-style-bot` (лендинг `/site`, веб-CRM `/site/app.html`, Telegram Mini App `/index.html`).
Данные в них демонстрационные и задаются в `src/demo-state.js`; снимает их `src/grab4.js`.

```bash
cd /путь/к/x-style-bot
node scripts/build-frontend.mjs          # собрать public/app.js
python3 -m http.server 8899 -d public &  # поднять статику
cd /путь/к/monitoring-pc/media/crm-edit/src
node grab4.js                            # перезаписать assets/*.png
```

`grab4.js` подменяет `/api/crm-state` данными из `demo-state.js` и заглушает
`telegram-web-app.js`, поэтому интерфейс снимается заполненным без реального бэкенда.
Чтобы в ролике были боевые цифры — поменяй `demo-state.js` и пересними.

## Что где править

Всё в `src/edit.html`:

- **Тексты и порядок кадров** — массив `CUES` (`t0`/`t1` в секундах, `B(k)` — номер бита).
- **Кадрирование скриншотов** — поля `f0`/`f1` в кадрах типа `shot`: `[точка X, точка Y, зум]`,
  от `f0` в начале кадра до `f1` в конце. Это и даёт наезд/проезд по интерфейсу.
- **Цвета** — переменные в `:root` (`--g`, `--bg`, `--paper`).
- **Сила тряски, вспышек и глитчей** — конец функции `renderFrame()`.
- **Бит-сетка** — константы `G0` (дроп) и `STEP` (шаг бита); при другой музыке пересчитать их
  и заново разложить `CUES`.

Шрифты: Oswald, Montserrat, Inter (Google Fonts, SIL Open Font License), лежат в `src/fonts/`.
