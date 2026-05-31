# holy_notification_bot

Telegram-бот для напоминаний о голосовании по заявкам докладов в [jEvent CRM](https://jevent.jugru.org).

## Текущий этап

**v3** — маппинг голосующих jEvent → Telegram (`voters.json`, см. `voters.example.json`).

**v2** — Telegram-бот для админа: кнопка «Проверить голосования», вывод pending в чат.

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

Маппинг голосующих: скопируйте `voters.example.json` → `voters.json` и укажите Telegram username (без `@`) для каждого имени из jEvent. Пустая строка или `example_username` — как «не заполнено», ссылка не показывается.
