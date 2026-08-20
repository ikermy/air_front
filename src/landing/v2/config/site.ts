/** Единый источник внешних ссылок и фактов о проекте. */

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://kermy.org';

export const GITHUB_ORG = 'https://github.com/ikermy/air_orchestrator';

/** Чат сообщества в Telegram. */
export const TELEGRAM_CHAT = 'https://t.me/marusia_dev';
export const TELEGRAM_CHAT_HANDLE = '@marusia_dev';

export const PAYPAL_CLIENT_ID =
  process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ||
  'BAAqxL-W0R0Yt-SCXR8YX1t0pRPjrfr2lNW7d2HtzYrB4LJUndIewG6JI4BmYHICSAoNsHbufUa7qysMbg';

export interface ServiceMeta {
  id: string;
  repo: string;
  /** Слой в схеме экосистемы */
  layer: 'core' | 'channel' | 'service' | 'infra';
}

/** Микросервисы семейства air_. Описания — в messages/*.json. */
export const SERVICES: ServiceMeta[] = [
  { id: 'air_common', repo: `${GITHUB_ORG}/air_common`, layer: 'core' },
  { id: 'air_orchestrator', repo: `${GITHUB_ORG}/air_orchestrator`, layer: 'core' },
  { id: 'air_tgbot', repo: `${GITHUB_ORG}/air_tgbot`, layer: 'channel' },
  { id: 'air_tguserbot', repo: `${GITHUB_ORG}/air_tguserbot`, layer: 'channel' },
  { id: 'air_whatsbot', repo: `${GITHUB_ORG}/air_whatsbot`, layer: 'channel' },
  { id: 'air_widget', repo: `${GITHUB_ORG}/air_widget`, layer: 'channel' },
  { id: 'air_avito', repo: `${GITHUB_ORG}/air_avito`, layer: 'channel' },
  { id: 'air_operator', repo: `${GITHUB_ORG}/air_operator`, layer: 'service' },
  { id: 'air_lead-hunter', repo: `${GITHUB_ORG}/air_lead-hunter`, layer: 'service' },
  { id: 'air_payment', repo: `${GITHUB_ORG}/air_payment`, layer: 'service' },
  { id: 'marusia_crm', repo: `${GITHUB_ORG}/marusia_crm`, layer: 'service' },
  // Панель управления — прикладной слой поверх ядра, а не инфраструктура:
  // рядом с air_logger («наблюдаемость и эксплуатация») она читалась бы неверно.
  { id: 'air_front', repo: `${GITHUB_ORG}/air_front`, layer: 'service' },
  { id: 'air_logger', repo: `${GITHUB_ORG}/air_logger`, layer: 'infra' },
];

export const PRICE_MONTHLY_USD = 1;
export const TRIAL_DAYS = 30;
export const LICENSE = 'MIT';
