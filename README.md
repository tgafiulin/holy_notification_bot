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

Prod — один контейнер на VPS (рекомендуется ≥ 2 GB RAM: Playwright + Chromium при poll/login).

### Подготовка на сервере

1. Клонировать репозиторий.
2. Создать `.env` (см. `.env.example`). **Обязательно** заполнить:
   - `JEVENT_USERNAME`, `JEVENT_PASSWORD` — автоперелогин без ручного `/login`;
   - `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_USER_ID`.
3. Создать `voters.json` рядом с `docker-compose.yml` (скопировать из `voters.example.json` и заполнить).  
   Файл должен существовать **до** первого `docker compose up` — иначе Docker создаст каталог вместо файла.
4. Остановить локальный бот (`npm run bot` / `bot:dev`) — один инстанс на токен.

Каталог `.data/` создаётся автоматически (volume для `session.json` и будущего state планировщика).

### Запуск и обновление

```bash
docker compose up -d --build
docker compose logs -f bot
```

Обновление после `git pull`:

```bash
docker compose up -d --build
```

### Проверка после деплоя

- `/start` в Telegram — бот отвечает.
- «Проверить голосования» — приходит сводка pending.
- «Разослать напоминания» — DM уходят голосующим с `telegramUserId`.
- Перезапуск контейнера — `session.json` и `voters.json` на месте.
- Удалить `.data/session.json` на хосте → следующий poll перелогинится из `.env`.

Подробные чеклисты — в `docs/PROJECT.md` (локально).
