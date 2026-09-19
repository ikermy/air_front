'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Drawer } from 'antd';
import { Menu, X } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import { LocaleSwitcher } from '../components/LocaleSwitcher';
import { useAuthModal } from '../auth/AuthModalContext';
import { goToDashboard, restoreSession } from '../auth/authApi';
import styles from './Header.module.css';

const NAV = [
  { id: 'features', href: '#features' },
  { id: 'security', href: '#security' },
  { id: 'playground', href: '#playground' },
  { id: 'architecture', href: '#architecture' },
  { id: 'pricing', href: '#pricing' },
  { id: 'faq', href: '#faq' },
] as const;

export function Header() {
  const t = useTranslations('nav');
  const tc = useTranslations('cta');
  const { openAuth } = useAuthModal();
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // «Запомнить меня»: если refresh-кука ещё жива, возвращаемся в панель без
  // пароля. Иначе открываем обычную форму входа.
  const handleSignIn = async () => {
    if (await restoreSession()) {
      goToDashboard();
      return;
    }
    openAuth('login');
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={styles.header} data-scrolled={scrolled}>
      <div className={`air-container ${styles.inner}`}>
        <a href="#top" className={styles.logo} aria-label="AiR">
          <img className={styles.logoMark} src="/air-logo.svg" alt="" aria-hidden />
          <span className={styles.logoText}>
            AiR<span className={styles.logoSlash}>/</span>
            <span className={styles.logoSub}>marusia_ai</span>
          </span>
        </a>

        <nav className={styles.nav} aria-label="main">
          {NAV.map((item) => (
            <a key={item.id} href={item.href} className={styles.navLink}>
              {t(item.id)}
            </a>
          ))}
        </nav>

        {/* Ссылка на GitHub намеренно убрана из шапки: шесть пунктов навигации
            плюс язык, тема и две кнопки уже перегружали правый край.
            В футере ссылки на репозитории остаются. */}
        <div className={styles.actions}>
          <LocaleSwitcher />
          <ThemeToggle />
          {/* Две разные точки входа: у существующего пользователя и у нового
              разные намерения — смешивать их одной кнопкой нельзя. */}
          <Button
            type="text"
            size="middle"
            className={styles.signIn}
            onClick={handleSignIn}
          >
            {tc('signIn')}
          </Button>
          {/* В шапке подпись короткая: рядом с ней уже есть «Войти»,
              и длинная строка ломала раскладку. Развёрнутый вариант
              с «30 дней» остаётся в Hero и в тарифах. */}
          <Button
            type="primary"
            size="middle"
            className={styles.cta}
            onClick={() => openAuth('register')}
          >
            {tc('tryFreeShort')}
          </Button>
          <button
            type="button"
            className={styles.burger}
            onClick={() => setDrawerOpen(true)}
            aria-label={t('openMenu')}
          >
            <Menu size={20} />
          </button>
        </div>
      </div>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        placement="right"
        width={288}
        closeIcon={<X size={20} />}
        styles={{ body: { padding: '8px 20px 24px' } }}
      >
        <nav className={styles.drawerNav} aria-label="mobile">
          {NAV.map((item) => (
            <a
              key={item.id}
              href={item.href}
              className={styles.drawerLink}
              onClick={() => setDrawerOpen(false)}
            >
              {t(item.id)}
            </a>
          ))}
          <Button
            size="large"
            block
            onClick={() => {
              setDrawerOpen(false);
              void handleSignIn();
            }}
          >
            {tc('signIn')}
          </Button>
          <Button
            type="primary"
            size="large"
            block
            style={{ marginTop: 10 }}
            onClick={() => {
              setDrawerOpen(false);
              openAuth('register');
            }}
          >
            {tc('tryFreeShort')}
          </Button>
        </nav>
      </Drawer>
    </header>
  );
}
