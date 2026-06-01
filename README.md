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
```

С видимым браузером (отладка логина):

```bash
npm run login:headed
```

Переменные окружения — см. `.env.example`.

После логина сессия сохраняется в `.data/session.json`.

## Маппинг голосующих

Скопируйте `voters.example.json` → `voters.json` и укажите Telegram username (без `@`) для каждого имени из jEvent. Попросите голосующих написать боту `/start` — `telegramUserId` привяжется автоматически.

`voters.json` не коммитится в git (персональные данные).

## Деплой (Docker)

Prod — один контейнер на VPS. **Рекомендуется ≥ 2 GB RAM** (Chromium при poll/login). Образ **собирается на вашем ПК**, на VPS только запуск — так не нужны гигабайты RAM под `docker compose build`.

### 1. Сборка образа локально

Нужны [Docker Desktop](https://www.docker.com/products/docker-desktop/) (или Docker Engine). Сборка под Linux VPS:

```bash
# тег по умолчанию: holy-notification-bot:latest
npm run docker:build

# свой тег (registry)
set BOT_IMAGE=ghcr.io/YOUR_USER/holy-notification-bot:latest   # Windows cmd
export BOT_IMAGE=ghcr.io/YOUR_USER/holy-notification-bot:latest  # bash
npm run docker:build
```

Локальная проверка (сборка на машине):

```bash
docker compose up -d --build
docker compose logs -f bot
```

### 2. Доставка образа на VPS

**Вариант A — registry (удобнее для обновлений)**

```bash
docker login ghcr.io   # или hub.docker.com
npm run docker:push
```

**Вариант B — без registry (`docker save` / `scp`)**

```bash
npm run docker:save
scp bot-image.tar.gz user@your-vps:/tmp/
ssh user@your-vps "docker load -i /tmp/bot-image.tar.gz"
```

### 3. Подготовка на сервере

Минимум файлов в одной папке (можно `git clone` без сборки):

- `docker-compose.prod.yml`
- `.env` (см. `.env.example`) — **обязательно**:
  - `JEVENT_USERNAME`, `JEVENT_PASSWORD`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_USER_ID`
  - `BOT_IMAGE` — тот же тег, что при сборке (например `holy-notification-bot:latest` или `ghcr.io/...`)
- `voters.json` — **до** первого `up`, иначе Docker создаст каталог вместо файла

Остановить локальный бот (`npm run bot` / `bot:dev`) — один инстанс на токен.

Каталог `.data/` создаётся автоматически (volume для `session.json`).

### 4. Запуск и обновление на VPS

Первый запуск (вариант A — pull из registry):

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml logs -f bot
```

Вариант B — после `docker load` на сервере:

```bash
docker compose -f docker-compose.prod.yml up -d
```

Обновление версии бота:

1. Локально: `npm run docker:build` → `npm run docker:push` (или `docker:save` + `scp` + `docker load`).
2. На VPS: `docker compose -f docker-compose.prod.yml pull` (или load) → `docker compose -f docker-compose.prod.yml up -d`.

На VPS **не** используйте `docker compose up --build` — сборка не нужна.

### Проверка после деплоя

- `/start` в Telegram — бот отвечает.
- «Проверить голосования» — приходит сводка pending.
- «Разослать напоминания» — DM уходят голосующим с `telegramUserId`.
- Перезапуск контейнера — `session.json` и `voters.json` на месте.
- Удалить `.data/session.json` на хосте → следующий poll перелогинится из `.env`.

Подробные чеклисты — в `docs/PROJECT.md` (локально).
