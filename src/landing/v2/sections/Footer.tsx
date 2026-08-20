import React from 'react';
import { useTranslations } from 'next-intl';
import { Github, Heart, Scale, Send } from 'lucide-react';
import {
  GITHUB_ORG,
  LICENSE,
  SERVICES,
  TELEGRAM_CHAT,
  TELEGRAM_CHAT_HANDLE,
  type ServiceMeta,
} from '../config/site';
import styles from './Footer.module.css';

/**
 * Подвал. Server Component: интерактива нет.
 * Переключатели темы и языка живут в Header и здесь не дублируются.
 */

/** Порядок слоёв в колонках репозиториев. */
const LAYERS: ServiceMeta['layer'][] = ['core', 'channel', 'service', 'infra'];

export function Footer() {
  const t = useTranslations('footer');

  const byLayer = LAYERS.map((layer) => ({
    layer,
    items: SERVICES.filter((s) => s.layer === layer),
  })).filter((group) => group.items.length > 0);

  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className="air-container">
        <div className={styles.top}>
          {/* --- Бренд --- */}
          <div className={styles.brand}>
            <span className={styles.logo}>
              <span className={styles.logoMark} aria-hidden>
                <span className={styles.logoDot} />
              </span>
              <span className={styles.logoText}>
                AiR<span className={styles.logoSlash}>/</span>
                <span className={styles.logoSub}>marusia_ai</span>
              </span>
            </span>

            <p className={styles.tagline}>{t('tagline')}</p>

            <div className={styles.brandLinks}>
              <a
                className={styles.pill}
                href={GITHUB_ORG}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github size={15} aria-hidden />
                {t('githubOrg')}
              </a>
              <a
                className={styles.pill}
                href={TELEGRAM_CHAT}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Send size={15} aria-hidden />
                {TELEGRAM_CHAT_HANDLE}
              </a>
              <a className={styles.pillAccent} href="#support">
                <Heart size={15} aria-hidden />
                {t('support')}
              </a>
            </div>
          </div>

          {/* --- Репозитории по слоям --- */}
          <nav className={styles.repos} aria-label={t('reposAria')}>
            {byLayer.map((group) => (
              <div key={group.layer} className={styles.repoGroup}>
                <h3 className={styles.groupTitle}>{t(`layers.${group.layer}`)}</h3>
                <ul className={styles.linkList}>
                  {group.items.map((service) => (
                    <li key={service.id}>
                      <a
                        className={styles.repoLink}
                        href={service.repo}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span className={styles.repoName}>{service.id}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* --- Юридический блок --- */}
        <div className={styles.bottom}>
          <p className={styles.copy}>
            © {year} AiR · marusia_ai. {t('rights')}
          </p>

          <nav className={styles.legal} aria-label={t('legalAria')}>
            <a
              className={styles.legalLink}
            href="/license"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Scale size={14} aria-hidden />
              {t('license', { license: LICENSE })}
            </a>
            <a className={styles.legalLink} href="/privacy-policy">
              {t('privacy')}
            </a>
            <a className={styles.legalLink} href="#faq">
              {t('faq')}
            </a>
          </nav>
        </div>

        <p className={styles.disclaimer}>{t('disclaimer')}</p>
      </div>
    </footer>
  );
}

export default Footer;
