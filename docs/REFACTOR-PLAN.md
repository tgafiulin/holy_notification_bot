# План унификации кода (refactor)

Локальный ориентир для рефакторинга. Не дублировать в чатах — правки по фазам, статус обновлять здесь.

Связано: `docs/PLAN.md` (фичи v2), `AGENTS.md` (домен и prod).

---

## Цель

Убрать дублирование (HTML, split 4096, склонения, fetch/stall), выровнять слои (`telegram/` вместо импортов service → `bot/`), не менять поведение без явной проверки.

---

## Конфиг (после фазы 0)

| Что | Где | Смена |
|-----|-----|--------|
| Event id | `DEFAULT_EVENT_ID` в `src/config/constants.ts` | Правка + деплой; `reminder-state` сбросится при другом id |
| Timezone | `DEFAULT_TIMEZONE` в `constants.ts` | То же |
| Слоты | `REMINDER_SLOTS` в `.env` | Без пересборки |
| Порог застоя | `STALL_THRESHOLD_DAYS` в `.env` | Без пересборки |

Убрано из `.env`: `JEVENT_EVENT_ID`, `REMINDER_TIMEZONE` (раньше дублировали константы).

---

## Что уже хорошо (не трогать без причины)

- Домен голосования: `scraper/` + `fetch-pending-summary.ts`
- Застой: `stall/` (`filterStalledPending`, `splitPendingByStall`)
- Отчёт рассылки: `format-notify-report.ts` + обёртка в `format-reminder-messages.ts`
- `voters/*` — мелкие файлы, не дублирование
- Футер DM / «Мои заявки»: `formatVoterMessageFooter` → `JEVENT_URLS.polling`
- Строка заявки: `formatPendingItemLine` в `format-voter-dm-messages.ts` (переедет в фазе 1)

---

## Запахи (осталось)

| # | Проблема | Где |
|---|----------|-----|
| 1 | 4× `escapeHtml` + inline в reminder | `format-pending-messages`, `format-voter-dm-messages`, `format-my-applications-messages`, `format-notify-report`, `format-reminder-messages` |
| 2 | 3× split по 4096 | те же format-* |
| 3 | Склонение «заявка/заявки/заявок» | `format-voter-dm-messages`, `format-my-applications-messages` |
| 4 | 3 константы parse mode = `"HTML"` | `PENDING_MESSAGE_PARSE_MODE`, `VOTER_DM_PARSE_MODE`, `HTML_PARSE_MODE` |
| 5 | Два контракта fetch в боте | обёртка в `bot.ts` vs прямой вызов в `handle-my-applications` |
| 6 | Дубль handlers (loading/fetch/delete) | `handlePollPending`, `handleNotifyVoters`, `handle-my-applications` |
| 7 | 3× загрузка stall context | `bot.ts`, `handle-my-applications`, `run-scheduled-reminders` |
| 8 | service/reminder → `bot/format-*` | `send-voter-notifications`, `run-scheduled-reminders` |

**Закрыто в фазе 0:** мёртвый `formatPendingItem` / `buildMyApplicationsBody`; хардкод URL polling; разъезд event/timezone через env.

---

## Фазы

### Фаза 0 — уборка (низкий риск) ✅

- [x] Удалить `formatPendingItem`, неиспользуемый `buildMyApplicationsBody`
- [x] Footer: `JEVENT_URLS.polling(eventId)` вместо хардкода
- [x] `DEFAULT_EVENT_ID` в `constants.ts` (без `JEVENT_EVENT_ID`)
- [x] `DEFAULT_TIMEZONE` в `constants.ts` (без `REMINDER_TIMEZONE`); `reminder-config`, `stall-config`

**Проверка:** один DM, одна админ-сводка, «Мои заявки» — без изменений текстов.

---

### Фаза 1 — `src/telegram/` (утилиты)

```
telegram/
  html.ts              — escapeHtml, TELEGRAM_HTML_PARSE_MODE
  pluralize.ts         — pluralizeApplications(count)
  split-messages.ts    — splitTelegramMessages({ prefix, parts, suffix?, limit? })
  pending-line.ts      — formatPendingItemLine (из format-voter-dm-messages)
```

- [ ] Подключить во всех format-*
- [ ] Inline escape в `formatScheduledSessionError` → `escapeHtml`

**Проверка:** граница 4096 с footer; длинный список заявок.

---

### Фаза 2 — форматтеры

**2a. DM + «Мои заявки»**

- [ ] Общий `splitTelegramMessages` + footer из `format-voter-dm-messages`
- [ ] `format-my-applications-messages` — только intro-секции (stalled / recent)

**2b. Админ-сводка**

- [ ] `format-pending-messages` → общий html + split

**2c. Parse mode**

- [ ] Одна константа `TELEGRAM_HTML_PARSE_MODE`; заменить импорты

---

### Фаза 3 — бот: fetch + loading

- [ ] Убрать локальную обёртку `fetchPendingWithSession` в `bot.ts`
- [ ] Хелпер `handlePendingFetch` (loading → fetch → errors → onOk → delete с try/catch)
- [ ] `replyFetchError(ctx, result, { audience: "admin" | "voter" })`

**Проверка:** `/login`, сводка, рассылка, «Мои заявки» — те же тексты ошибок.

---

### Фаза 4 — контекст stall

- [ ] `loadStallNotifyContext()` → `DEFAULT_EVENT_ID`, `stallConfig`, `speechFirstSeen`, `stallFilterActive`
- [ ] Использовать в notify / my-applications / scheduled reminders
- [ ] **Не писать** `reminder-state` из ручной «Разослать» (как в AGENTS.md)

---

### Фаза 5 — слои (опционально, перед отпуском)

- [ ] Перенести `format-*` → `src/telegram/messages/` (или `src/format/`)
- [ ] `send-voter-notifications` — только отправка; формат из `telegram/`
- [ ] `reminder` — импорты из `telegram/`, не из `bot/`

---

### Фаза 6 — split `bot.ts` (опционально)

- [ ] `bot/access-middleware.ts`
- [ ] `bot/handlers/` (poll, notify, login, start, my-applications)
- [ ] Константа welcome-текста

Делать при реализации отпуска (PLAN.md §3), если файл разрастётся.

---

## Порядок

```
Фаза 0 ✅ → 1 → 2 → 3 → 4 → [5] → [6]
```

**Минимум с отдачей:** 1 + 2c (фаза 0 уже в master).  
**Перед фичами v2 (отпуск):** 3 + 4 + 5.

---

## Не трогать

- `filterStalledPending` vs `splitPendingByStall` — разные сценарии
- `format-voter-start-message` vs admin notice — разные форматы (Markdown / plain)
- CLI (`login-test`, `stall-date-research`) — dev-only
- `DEFAULT_EVENT_ID` / `DEFAULT_TIMEZONE` — не возвращать в `.env` без явной необходимости

---

## Риски

1. Split 4096 + HTML + footer — регресс на длинных списках.
2. Объединение `replySessionError` — не перепутать тексты админ / голосующий.
3. Ручная рассылка — не начать писать state при рефакторинге контекста.
4. Смена `DEFAULT_EVENT_ID` в коде — сброс `reminder-state.json` (ожидаемо).

---

## Статус (обновлять вручную)

| Фаза | Статус | PR / коммит |
|------|--------|-------------|
| 0 | ✅ | refactor: фаза 0 — уборка и константы event/timezone |
| 1 | ⏳ | |
| 2 | ⏳ | |
| 3 | ⏳ | |
| 4 | ⏳ | |
| 5 | ⏳ | |
| 6 | ⏳ | |
