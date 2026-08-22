import React from 'react';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '../../src/i18n/routing';
import { Header } from '../../src/landing/v2/sections/Header';
import { Hero } from '../../src/landing/v2/sections/Hero';
import { TrustBar } from '../../src/landing/v2/sections/TrustBar';
import { ValueProps } from '../../src/landing/v2/sections/ValueProps';
import { Security } from '../../src/landing/v2/sections/Security';
import { Playground } from '../../src/landing/v2/sections/Playground';
import { Architecture } from '../../src/landing/v2/sections/Architecture';
import { Economics } from '../../src/landing/v2/sections/Economics';
import { Pricing } from '../../src/landing/v2/sections/Pricing';
import { Support } from '../../src/landing/v2/sections/Support';
import { Faq } from '../../src/landing/v2/sections/Faq';
import { Footer } from '../../src/landing/v2/sections/Footer';
import { JsonLd } from '../../src/landing/v2/seo/JsonLd';
import { buildFaqEntries } from '../../src/landing/v2/sections/faqData';
import { SITE_URL } from '../../src/landing/v2/config/site';
import { EmailConfirmationNotice } from '../../src/landing/v2/auth/EmailConfirmationNotice';

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'meta' });
  const tn = await getTranslations({ locale, namespace: 'nav' });

  // FAQ-разметка собирается на сервере из того же источника, что и аккордеон,
  // поэтому текст в schema.org всегда совпадает с видимым на странице —
  // расхождение Google трактует как манипуляцию разметкой.
  const tf = await getTranslations({ locale, namespace: 'faq' });
  const faqEntries = buildFaqEntries(tf);

  const url =
    locale === routing.defaultLocale ? `${SITE_URL}/` : `${SITE_URL}/${locale}`;

  return (
    <>
      <EmailConfirmationNotice />
      <JsonLd
        locale={locale}
        name={t('title')}
        description={t('description')}
        url={url}
        faq={faqEntries}
      />

      <a href="#main" className="air-skip-link">
        {tn('skipToContent')}
      </a>

      <Header />

      <main id="main">
        {/* Порядок блоков — маркетинговая воронка:
            обещание → доказательства → продукт → техника → цена → снятие возражений */}
        <Hero />
        <TrustBar />
        <ValueProps />
        <Security />
        <Playground />
        <Architecture />
        <Economics />
        <Pricing />
        <Support />
        <Faq />
      </main>

      <Footer />
    </>
  );
}
