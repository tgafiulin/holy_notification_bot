# holy_notification_bot

Telegram-бот для напоминаний о голосовании по заявкам докладов в [jEvent CRM](https://jevent.jugru.org).

## Текущий этап

**v1b** — логин, fetch polling API, парсинг непроголосованных заявок (статус «Ревью ПК»), вывод в консоль.

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
```

С видимым браузером (отладка логина):

```bash
npm run login:headed
```

Переменные окружения — см. `.env.example`.

После логина сессия сохраняется в `.data/session.json`.
