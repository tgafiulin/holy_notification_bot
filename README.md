# holy_notification_bot

Telegram-бот для напоминаний о голосовании по заявкам докладов в [jEvent CRM](https://jevent.jugru.org).

## Требования

- Node.js 20+
- npm

## Установка

```bash
npm install
npx playwright install chromium
```

## Команды

```bash
# Логин (интерактивно или через .env)
npm run login

# Загрузить голоса и вывести pending по голосующим
npm run poll

# Запустить Telegram-бота (логин jEvent — через бота или .env)
npm run bot

# То же с автоперезапуском при изменениях в src/
npm run bot:dev

# Один прогон планировщика (как в Docker hourly; слоты — REMINDER_* в .env)
npm run reminder-once
```

С видимым браузером (отладка логина):

```bash
npm run login:headed
```

Переменные окружения — см. `.env.example`.

**Застой (v2):** `STALL_THRESHOLD_DAYS` (по умолчанию 14) — в автоматической и ручной рассылке только заявки, у которых `lastStatusUpdate` не моложе порога; админская сводка «Получить сводку» — все pending. `0` отключает фильтр.

После логина сессия сохраняется в `.data/session.json`.

## Маппинг голосующих

Скопируйте `voters.example.json` → `voters.json` и укажите Telegram username (без `@`) для каждого имени из jEvent. Попросите голосующих написать боту `/start` — `telegramUserId` привяжется автоматически.

`voters.json` не коммитится в git (персональные данные).

## Деплой (Docker)

Prod — один контейнер на VPS. **Рекомендуется ≥ 2 GB RAM** (Chromium при poll/login). Образ **собирается на вашем ПК**, на VPS только запуск — так не нужны гигабайты RAM под `docker compose build`.

### 1. Сборка образа локально

Нужны [Docker Desktop](https://www.docker.com/products/docker-desktop/) (или Docker Engine). Сборка под Linux VPS:

```bash
npm run docker:build
```

Локальная проверка (сборка на машине):

```bash
docker compose up -d --build
docker compose logs -f bot
```

### 2. Доставка образа на VPS

```bash
npm run docker:save
scp bot-image.tar.gz USER@VPS:/tmp/
ssh USER@VPS "docker load -i /tmp/bot-image.tar.gz"
```

### 3. Подготовка на сервере

Минимум файлов в одной папке (можно `git clone` без сборки):

- `docker-compose.prod.yml`
- `.env` (см. `.env.example`) — **обязательно**:
  - `JEVENT_USERNAME`, `JEVENT_PASSWORD`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_USER_ID`
  - `BOT_IMAGE=holy-notification-bot:latest`
- `voters.json` — **до** первого `up`, иначе Docker создаст каталог вместо файла

Остановить локальный бот (`npm run bot` / `bot:dev`) — один инстанс на токен.

Каталог `.data/` создаётся автоматически (volume для `session.json`, `reminder-state.json`).

В Docker-образе фоном раз в час вызывается `npm run reminder-once` (расписание `REMINDER_SLOTS`, см. `.env.example`). При старте бота админу сообщают о пропущенных слотах, если бот лежал во время рассылки.

### 4. Первый запуск на VPS

В `~/holy-notification-bot` после `docker load`:

```bash
docker compose -f docker-compose.prod.yml up -d
```

На VPS **не** используйте `docker compose up --build`.

### 5. Обновление

Локальный `npm run bot` выключен. `.env` / `voters.json` / `.data` на сервере не трогаем, если не менялись.

**ПК:**

```bash
npm run docker:build
npm run docker:save
scp bot-image.tar.gz USER@VPS:/tmp/
```

**VPS:**

```bash
ssh root@IP
docker load -i /tmp/bot-image.tar.gz
cd ~/holy-notification-bot
docker compose -f docker-compose.prod.yml up -d
```

### Проверка после деплоя

- `/start` в Telegram — бот отвечает.
- «Получить сводку» — приходит сводка pending.
- «Разослать напоминания» — DM уходят голосующим с `telegramUserId`.
- Перезапуск контейнера — `session.json` и `voters.json` на месте.
- Удалить `.data/session.json` на хосте → следующий poll перелогинится из `.env`.
- В `.env` на VPS: `REMINDER_TIMEZONE`, `REMINDER_SLOTS` (по умолчанию вс 16:00 / вт 13:00 / чт 16:00 MSK).
- После деплоя с планировщиком: дождаться слота или один раз `docker compose exec bot npm run reminder-once` для проверки (осторожно: реальные DM).

Контекст для разработки и AI — `AGENTS.md` в корне (локально). План v2 — `docs/PLAN.md` (локально).
