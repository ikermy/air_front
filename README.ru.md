# AiR_Front

![air_front](logo.png)

[🇬🇧 English version](README.md)

![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=nodedotjs)
![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs)
![Лицензия](https://img.shields.io/badge/license-MIT-blue)
[![Telegram](https://img.shields.io/badge/Telegram-Join%20Chat-blue?logo=telegram)](https://t.me/marusia_dev)

`air_front` — frontend-приложение платформы AiR. Объединяет маркетинговый лендинг, панель управления моделями, каналами и сервисами, а также встраиваемый виджет чата; взаимодействует с backend-сервисом `air_orchestrator` по HTTP/gRPC-Web/WebSocket-контрактам.

## Возможности

- авторизация, сессии, JWT, refresh-токены, TOTP и восстановление доступа;
- управление AI-моделями и провайдерами (OpenAI, MistralAI, Google Gemini), в том числе realtime;
- настройка каналов: Telegram Bot и UserBot, WhatsApp UserBot, Avito и WEB-виджет;
- сервисы Lead Hunter и голосовых звонков (gRPC-Web) с живой транскрипцией;
- диалоги, мгновенные уведомления, CRM (amoCRM), Google OAuth/Calendar/Sheets;
- тестирование моделей, стриминг ответов и realtime-голос;
- биллинг, подписки и криптоплатежи с экспортом чеков в PDF;
- визуализация серверных логов в реальном времени;
- встраиваемый виджет чата с генерацией кода и настройкой внешнего вида;
- локализация интерфейса и лендинга: русский, английский, испанский;
- адаптивная тёмная и светлая темы, SEO-разметка и Open Graph.

## Защита пользовательских данных

Access-токен хранится в cookie, а его продление выполняется через refresh-токен в HttpOnly-cookie, недоступной для JavaScript. Пароль шифруется на клиенте (AES) до отправки на сервер. Пользовательский `MasterKey`, API-ключи провайдеров и настройки каналов на frontend не попадают: они хранятся и расшифровываются только на стороне `air_orchestrator` после авторизации. Виджет авторизуется по ключам Ed25519, а в клиентский бандл включаются только публичные переменные окружения `NEXT_PUBLIC_*` — системные секреты в сборку не проникают.

## Дерево зависимостей

```text
air_front
├── air_orchestrator (HTTP REST /v1/*)
│   └── авторизация, модели, каналы, сервисы, диалоги, платежи
├── air_orchestrator (WebSocket /v1/ws/*)
│   └── мгновенные уведомления, логи, тест модели, realtime и QR-авторизация
├── air_orchestrator (gRPC-Web calls.v1.Calls)
│   └── исходящие голосовые звонки и поток событий
├── envoy
│   └── HTTPS/gRPC-Web маршрутизация шлюза и внешнего трафика
├── air_avito
├── air_payment
└── air_lead-hunter

landing (App Router)
├── ru ── /
├── en ── /en
└── es ── /es

dashboard (Pages Router SPA)
└── /dashboard, /login, /confirm, /reset, /simple-auth

widget
└── marusya-widget.js ── встраиваемый чат для внешних сайтов
```

В production-сборке REST-запросы к `air_orchestrator` проксируются через Nginx, gRPC-Web идёт напрямую на `NEXT_PUBLIC_GRPC_HOST`, а приложение работает в Docker-сетях `air_shared` и `app_internal`.

## Технологии

React 19, Next.js 15 (App Router и Pages Router), TypeScript, Ant Design 6, Ant Design X, next-intl, i18next, gRPC-Web, Protocol Buffers, WebSocket, SSE, axios, crypto-js, html2canvas, jsPDF, webpack, Docker, Nginx и Envoy.

## Запуск

Создайте `.env` в корне проекта и укажите переменные окружения:

```bash
PORT=3001
REACT_APP_SHOW_SIMPLE_AUTH=true # Отключает отображение логина, оставляя только форму авторизации в панели управления
REACT_APP_ACCESS_TOKEN_MAX_AGE=900
```

Для разработки:

```bash
npm ci --legacy-peer-deps
npm run dev
```

Сборка приложения и виджета:

```bash
npm run build
npm run build:widget
```

Либо в контейнерах:

```bash
docker compose -f air-front-dev.yml up -d
```

Для production используется `air-front-prod.yml`. Переменные окружения (`LAND_URL`, `NEXT_PUBLIC_GRPC_HOST`, `BACKEND_INTERNAL_URL`) подключаются из `.env` и не должны попадать в репозиторий.

## Мониторинг

Раздел «Логи» в панели управления подключается к `/v1/ws/log` и показывает серверные логи в реальном времени с подсветкой уровней. Лендинг статический и кешируется на CDN (`Cache-Control` в `next.config.js`), виджет в разработке отдаётся со `no-store`, а в production — с коротким `max-age` (`nginx.conf`). Сбор метрик и логов инфраструктуры выполняет контур `air_orchestrator` (VictoriaMetrics, VictoriaLogs, Vector, Perses).

## Документация

- [Интеграция виджета](widget-integration-guide.html)
- [Конфигурация Next.js](next.config.js)
- [Схема локалей лендинга](src/i18n/routing.ts)
- [Конфигурация Nginx](nginx.conf)

## Экосистема marusia_ai

- [air-common](https://github.com/ikermy/air-common) — общая библиотека для AI‑микросервисов
- [air_orchestrator](https://github.com/ikermy/air_orchestrator) — главный сервис оркестратор
- [air_front](https://github.com/ikermy/air_front) — Frontend react next.js: лендинг, панель управления моделями, каналами взаимодействия и сервисами, встраиваемый виджет
- [air_tgbot](https://github.com/ikermy/air_tgbot) — Telegram Bot работа в режиме polling/webhook с возможностью стриминга дельт
- [air_tguserbot](https://github.com/ikermy/air_tguserbot) — Telegram пользовательский бот с возможностью принимать и совершать голосовые звонки
- [air_whatsbot](https://github.com/ikermy/air_whatsbot) — WhatsApp пользовательский бот без использования GraphAPI с возможностью принимать и совершать голосовые звонки
- [air_widget](https://github.com/ikermy/air_widget) — Widget виджет чат для интеграции на любые сайты
- [air_avito](https://github.com/ikermy/air_avito) — бот для ответов в чатах Авито
- [air_operator](https://github.com/ikermy/air_operator) — Сервис переадресации ответов на/от оператора AI работает для всех типов ботов
- [air_lead-hunter](https://github.com/ikermy/air_lead-hunter) — Сервис поиска лидов ботами в Telegram и WhatsApp, в том числе с исходящими голосовыми вызовами
- [air_payment](https://github.com/ikermy/air_payment) — Сервис приёма криптоплатежей от пользователей через Bybit
- [marusia_crm](https://github.com/ikermy/marusia_crm) — Сервис интеграции с внешними CRM системами
- [air-logger](https://github.com/ikermy/air-logger) — Вспомогательный сервис логирования событий с поддержкой многопользовательского режима и поддержкой сборщика логов loki


## Лицензия

Проект распространяется по лицензии [MIT](LICENSE). Она разрешает свободно использовать, копировать, изменять и распространять программное обеспечение при сохранении текста лицензии и уведомления об авторских правах.

Полный текст лицензии доступен в файле [`LICENSE`](LICENSE).

## Контакты

[![Telegram](https://img.shields.io/badge/Telegram-Contact-blue?logo=telegram)](https://t.me/ikermy)
