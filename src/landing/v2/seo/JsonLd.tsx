import React from 'react';
import {
  SITE_URL,
  GITHUB_ORG,
  PRICE_MONTHLY_USD,
  LICENSE,
} from '../config/site';
import type { FaqEntry } from '../sections/faqData';

interface Props {
  locale: string;
  name: string;
  description: string;
  url: string;
  /** Пары «вопрос-ответ» из того же источника, что и видимый аккордеон. */
  faq?: FaqEntry[];
}

/**
 * Структурированные данные для поиска.
 *
 * Важно: как Offer размечена ТОЛЬКО подписка $1/мес. Донат произвольной
 * суммы намеренно не размечается — Google принял бы его за цену продукта
 * и испортил сниппет.
 */
export function JsonLd({ locale, name, description, url, faq }: Props) {
  const graph: Record<string, unknown>[] = [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'AiR',
      alternateName: 'marusia_ai',
      url: SITE_URL,
      sameAs: [GITHUB_ORG],
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: 'AiR',
      inLanguage: locale,
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${SITE_URL}/#software`,
      name: 'AiR',
      applicationCategory: 'BusinessApplication',
      applicationSubCategory: 'AI Agent Platform',
      operatingSystem: 'Web, Docker, Linux',
      url,
      description,
      license: '/license',
      isAccessibleForFree: true,
      softwareHelp: GITHUB_ORG,
      offers: {
        '@type': 'Offer',
        price: String(PRICE_MONTHLY_USD),
        priceCurrency: 'USD',
        category: 'subscription',
        availability: 'https://schema.org/InStock',
        url,
      },
    },
    {
      '@type': 'WebPage',
      '@id': `${url}#webpage`,
      url,
      name,
      description,
      inLanguage: locale,
      isPartOf: { '@id': `${SITE_URL}/#website` },
      about: { '@id': `${SITE_URL}/#software` },
    },
  ];

  // FAQPage добавляется только когда вопросы реально отрендерены на странице:
  // разметка без видимого соответствия нарушает рекомендации Google.
  if (faq && faq.length > 0) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      inLanguage: locale,
      isPartOf: { '@id': `${url}#webpage` },
      mainEntity: faq.map((entry) => ({
        '@type': 'Question',
        name: entry.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: entry.answer,
        },
      })),
    });
  }

  return (
    <script
      type="application/ld+json"
      // Данные статические и не содержат пользовательского ввода.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }),
      }}
    />
  );
}
