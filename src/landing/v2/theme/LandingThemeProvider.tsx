'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ConfigProvider, App as AntdApp } from 'antd';
import { getThemeConfig } from './antdTheme';
import {
  DEFAULT_THEME,
  readThemeCookie,
  writeThemeCookie,
  type ThemeMode,
} from './themeCookie';

interface LandingThemeValue {
  mode: ThemeMode;
  toggle: () => void;
  setMode: (mode: ThemeMode) => void;
}

const LandingThemeContext = createContext<LandingThemeValue>({
  mode: DEFAULT_THEME,
  toggle: () => {},
  setMode: () => {},
});

export const useLandingTheme = () => useContext(LandingThemeContext);

interface Props {
  /** Значение, прочитанное из cookie на сервере — гарантирует отсутствие FOUC. */
  initialMode: ThemeMode;
  children: React.ReactNode;
}

/**
 * Применяет тему к <html data-theme> и держит в синхроне три хранилища:
 *   cookie        — читает SSR лендинга,
 *   localStorage  — читает ThemeContext дашборда,
 *   body.class    — на неё завязаны легаси-стили App.css.
 * Благодаря этому переключение темы на лендинге переносится в дашборд.
 */
export function LandingThemeProvider({ initialMode, children }: Props) {
  const [mode, setModeState] = useState<ThemeMode>(initialMode);

  useEffect(() => {
    // Cookie могла разойтись с SSR-значением: другая вкладка,
    // либо тему переключили в дашборде (он пишет localStorage).
    const fromCookie = readThemeCookie();
    if (fromCookie && fromCookie !== initialMode) {
      setModeState(fromCookie);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = mode;
    root.style.colorScheme = mode;

    document.body.classList.remove('light', 'dark');
    document.body.classList.add(mode);

    writeThemeCookie(mode);
    try {
      localStorage.setItem('theme', mode);
    } catch {
      /* приватный режим — не критично, cookie уже записана */
    }
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => setModeState(next), []);
  const toggle = useCallback(
    () => setModeState((prev) => (prev === 'dark' ? 'light' : 'dark')),
    []
  );

  const value = useMemo(
    () => ({ mode, toggle, setMode }),
    [mode, toggle, setMode]
  );

  return (
    <LandingThemeContext.Provider value={value}>
      <ConfigProvider theme={getThemeConfig(mode)}>
        <AntdApp component="div">{children}</AntdApp>
      </ConfigProvider>
    </LandingThemeContext.Provider>
  );
}
