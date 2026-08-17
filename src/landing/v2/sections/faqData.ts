/**
 * Данные FAQ вынесены из JSX, чтобы их можно было переиспользовать.
 *
 * Потребители:
 *   1. sections/Faq.tsx    — рендер аккордеона;
 *   2. seo/JsonLd.tsx      — разметка FAQPage (schema.org).
 *
 * Модуль намеренно БЕЗ 'use client': его импортирует серверный JsonLd,
 * и client-директива утащила бы данные в клиентский бандл.
 *
 * Сами тексты живут в messages/<locale>/faq.json по схеме:
 *   faq.items.<key>.q — вопрос
 *   faq.items.<key>.a — ответ
 */

export const FAQ_KEYS = [
  'masterkey',
  'logging',
  'price',
  'providers',
  'whatsapp',
  'voice',
  'dataExport',
  'selfhosted',
  'byok',
  'integrations',
] as const;

export type FaqKey = (typeof FAQ_KEYS)[number];

/** Ключ вопроса внутри неймспейса `faq`. */
export const faqQuestionKey = (key: FaqKey) => `items.${key}.q` as const;

/** Ключ ответа внутри неймспейса `faq`. */
export const faqAnswerKey = (key: FaqKey) => `items.${key}.a` as const;

export interface FaqEntry {
  key: FaqKey;
  question: string;
  answer: string;
}

/**
 * Собирает пары «вопрос-ответ».
 *
 * @param t функция перевода, привязанная к неймспейсу `faq`
 *          (`useTranslations('faq')` либо `await getTranslations({locale, namespace: 'faq'})`).
 *
 * @example
 *   const t = await getTranslations({ locale, namespace: 'faq' });
 *   const entries = buildFaqEntries(t);
 *   // -> [{ key: 'masterkey', question: '…', answer: '…' }, …]
 */
export function buildFaqEntries(t: (key: string) => string): FaqEntry[] {
  return FAQ_KEYS.map((key) => ({
    key,
    question: t(faqQuestionKey(key)),
    answer: t(faqAnswerKey(key)),
  }));
}
