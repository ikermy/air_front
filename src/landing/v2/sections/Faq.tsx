'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Collapse } from 'antd';
import { HelpCircle, Minus, Plus, Send } from 'lucide-react';
import { Reveal } from '../components/Reveal';
import { TELEGRAM_CHAT } from '../config/site';
import { buildFaqEntries } from './faqData';
import styles from './Faq.module.css';

/**
 * Аккордеон частых вопросов.
 *
 * 'use client' обязателен: Collapse держит состояние раскрытия.
 * Тексты приходят из неймспейса `faq`, а сам список вопросов —
 * из ./faqData, чтобы ту же пару «вопрос-ответ» мог переиспользовать
 * серверный JsonLd для разметки FAQPage.
 */
export function Faq() {
  const t = useTranslations('faq');
  const entries = buildFaqEntries(t);

  return (
    <section className={`air-section ${styles.section}`} id="faq">
      <div className={`air-container ${styles.grid}`}>
        <Reveal className={styles.aside}>
          <div className={styles.asideInner}>
            <span className="air-eyebrow">
              <HelpCircle size={13} aria-hidden />
              {t('eyebrow')}
            </span>

            <h2 className={`air-h2 ${styles.title}`}>{t('title')}</h2>

            <p className={`air-lead ${styles.lead}`}>{t('lead')}</p>

            <a
              className={styles.contact}
              href={TELEGRAM_CHAT}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className={styles.contactIcon} aria-hidden>
                <Send size={16} />
              </span>
              <span className={styles.contactText}>
                <span className={styles.contactTitle}>{t('moreTitle')}</span>
                <span className={styles.contactSub}>{t('moreCta')}</span>
              </span>
            </a>
          </div>
        </Reveal>

        <Reveal className={styles.list} delay={80}>
          <Collapse
            accordion
            ghost
            defaultActiveKey={entries[0]?.key}
            expandIconPlacement="end"
            expandIcon={({ isActive }) => (
              <span className={styles.toggle} data-active={isActive} aria-hidden>
                {isActive ? <Minus size={16} /> : <Plus size={16} />}
              </span>
            )}
            classNames={{
              root: styles.collapse,
              header: styles.itemHeader,
              title: styles.itemTitle,
              body: styles.itemBody,
            }}
            items={entries.map((entry) => ({
              key: entry.key,
              label: entry.question,
              children: <p className={styles.answer}>{entry.answer}</p>,
            }))}
          />
        </Reveal>
      </div>
    </section>
  );
}

export default Faq;
