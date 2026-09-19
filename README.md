# AiR_Front

![air_front](logo.png)

[🇷🇺 Russian version](README.ru.md)

![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=nodedotjs)
![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs)
![License](https://img.shields.io/badge/license-MIT-blue)
[![Telegram](https://img.shields.io/badge/Telegram-Join%20Chat-blue?logo=telegram)](https://t.me/marusia_dev)

`air_front` — frontend application of the AiR platform. It combines a marketing landing page, a dashboard for managing models, channels and services, as well as an embeddable chat widget; it interacts with the `air_orchestrator` backend service via HTTP/gRPC-Web/WebSocket contracts.

## Features

- authorization, sessions, JWT, refresh tokens, TOTP and account recovery;
- managing AI models and providers (OpenAI, MistralAI, Google Gemini), including realtime;
- configuring channels: Telegram Bot and UserBot, WhatsApp UserBot, Avito and WEB widget;
- Lead Hunter and voice call services (gRPC-Web) with live transcription;
- dialogs, instant notifications, CRM (amoCRM), Google OAuth/Calendar/Sheets;
- testing models, response streaming and realtime voice;
- billing, subscriptions and crypto payments with PDF receipt export;
- real-time server log visualization;
- embeddable chat widget with code generation and appearance customization;
- localization of the interface and landing page: Russian, English, Spanish;
- responsive dark and light themes, SEO markup and Open Graph.

## User Data Protection

The access token is stored in a cookie, and it is renewed via a refresh token in an HttpOnly cookie inaccessible to JavaScript. The password is encrypted on the client (AES) before being sent to the server. The user's `MasterKey`, provider API keys and channel settings do not reach the frontend: they are stored and decrypted only on the `air_orchestrator` side after authorization. The widget authorizes using Ed25519 keys, and only public `NEXT_PUBLIC_*` environment variables are included in the client bundle — system secrets do not get into the build.

## Dependency Tree

```text
air_front
├── air_orchestrator (HTTP REST /v1/*)
│   └── authorization, models, channels, services, dialogs, payments
├── air_orchestrator (WebSocket /v1/ws/*)
│   └── instant notifications, logs, model test, realtime and QR authorization
├── air_orchestrator (gRPC-Web calls.v1.Calls)
│   └── outgoing voice calls and event stream
├── envoy
│   └── HTTPS/gRPC-Web routing of the gateway and external traffic
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
└── marusya-widget.js ── embeddable chat for external sites
```

In the production build, REST requests to `air_orchestrator` are proxied through Nginx, gRPC-Web goes directly to `NEXT_PUBLIC_GRPC_HOST`, and the application runs in the Docker networks `air_shared` and `app_internal`.

## Technologies

React 19, Next.js 15 (App Router and Pages Router), TypeScript, Ant Design 6, Ant Design X, next-intl, i18next, gRPC-Web, Protocol Buffers, WebSocket, SSE, axios, crypto-js, html2canvas, jsPDF, webpack, Docker, Nginx and Envoy.

## Getting Started

Create a `.env` in the project root and specify the environment variables:

```bash
PORT=3001
REACT_APP_SHOW_SIMPLE_AUTH=true # Disables the login display, leaving only the authorization form in the dashboard
REACT_APP_ACCESS_TOKEN_MAX_AGE=900
```

For development:

```bash
npm ci --legacy-peer-deps
npm run dev
```

Building the application and widget:

```bash
npm run build
npm run build:widget
```

Or in containers:

```bash
docker compose -f air-front-dev.yml up -d
```

For production, `air-front-prod.yml` is used. Environment variables (`LAND_URL`, `NEXT_PUBLIC_GRPC_HOST`, `BACKEND_INTERNAL_URL`) are loaded from `.env` and must not be committed to the repository.

## Monitoring

The "Logs" section in the dashboard connects to `/v1/ws/log` and shows server logs in real time with level highlighting. The landing page is static and cached on the CDN (`Cache-Control` in `next.config.js`), the widget is served with `no-store` in development and with a short `max-age` in production (`nginx.conf`). Infrastructure metrics and logs are collected by the `air_orchestrator` loop (VictoriaMetrics, VictoriaLogs, Vector, Perses).

## Documentation

- [Widget Integration](widget-integration-guide.html)
- [Next.js Configuration](next.config.js)
- [Landing locale schema](src/i18n/routing.ts)
- [Nginx Configuration](nginx.conf)

## marusia_ai Ecosystem

- [air-common](https://github.com/ikermy/air-common) — shared library for AI microservices
- [air_orchestrator](https://github.com/ikermy/air_orchestrator) — main orchestrator service
- [air_front](https://github.com/ikermy/air_front) — Frontend react next.js: landing, dashboard for managing models, interaction channels and services, embeddable widget
- [air_tgbot](https://github.com/ikermy/air_tgbot) — Telegram Bot operating in polling/webhook mode with delta streaming support
- [air_tguserbot](https://github.com/ikermy/air_tguserbot) — Telegram user bot with the ability to receive and make voice calls
- [air_whatsbot](https://github.com/ikermy/air_whatsbot) — WhatsApp user bot without using GraphAPI with the ability to receive and make voice calls
- [air_widget](https://github.com/ikermy/air_widget) — Widget chat widget for integration into any websites
- [air_avito](https://github.com/ikermy/air_avito) — bot for replying in Avito chats
- [air_operator](https://github.com/ikermy/air_operator) — Service for forwarding replies to/from the AI operator, works for all bot types
- [air_lead-hunter](https://github.com/ikermy/air_lead-hunter) — Service for finding leads by bots in Telegram and WhatsApp, including with outgoing voice calls
- [air_payment](https://github.com/ikermy/air_payment) — Service for accepting crypto payments from users via Bybit
- [marusia_crm](https://github.com/ikermy/marusia_crm) — Service for integration with external CRM systems
- [air-logger](https://github.com/ikermy/air-logger) — Auxiliary event logging service with multi-user mode support and loki log collector support


## License

The project is distributed under the [MIT](LICENSE) license. It permits free use, copying, modification and distribution of the software while retaining the license text and copyright notice.

The full license text is available in the [`LICENSE`](LICENSE) file.

## Contacts

[![Telegram](https://img.shields.io/badge/Telegram-Contact-blue?logo=telegram)](https://t.me/ikermy)
