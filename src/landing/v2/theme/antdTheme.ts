import { theme as antdTheme, type ThemeConfig } from 'antd';

/**
 * Токены Ant Design для лендинга.
 * Значения синхронизированы с src/styles/brand-tokens.css.
 *
 * Этот ConfigProvider оборачивает ТОЛЬКО поддерево лендинга (app/),
 * дашборд продолжает жить на своих токенах из ThemeContext.
 */

const shared: ThemeConfig['token'] = {
  borderRadius: 10,
  borderRadiusLG: 18,
  fontFamily:
    "ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  fontSize: 16,
  colorError: '#ff0202',
  colorWarning: '#ff9d00',
  wireframe: false,
};

export const darkThemeConfig: ThemeConfig = {
  algorithm: antdTheme.darkAlgorithm,
  token: {
    ...shared,
    // Лайм на графите = 15.6:1, поэтому он же и primary, и текстовый акцент.
    colorPrimary: '#c8fb77',
    colorSuccess: '#8ac51e',
    colorInfo: '#00add8',
    colorLink: '#8ac51e',
    colorLinkHover: '#a8f817',
    colorBgBase: '#121212',
    colorTextBase: '#ffffff',
    colorBorder: '#2a3326',
    colorBorderSecondary: '#232a20',
  },
  components: {
    Button: {
      // Текст на лаймовой заливке должен быть тёмным, иначе нечитаемо.
      primaryColor: '#0e1a06',
      fontWeight: 600,
    },
    Card: {
      colorBgContainer: '#181c17',
    },
    Collapse: {
      colorBgContainer: '#181c17',
      headerBg: 'transparent',
    },
    Segmented: {
      itemSelectedBg: '#c8fb77',
      itemSelectedColor: '#0e1a06',
      trackBg: '#1b201a',
    },
  },
};

export const lightThemeConfig: ThemeConfig = {
  algorithm: antdTheme.defaultAlgorithm,
  token: {
    ...shared,
    // #c8fb77 на белом — 1.3:1. Как colorPrimary он годится только для
    // заливок, поэтому primary = олива (#5f8300, 4.5:1 — WCAG AA),
    // а лайм подаётся точечно через CSS-переменные.
    colorPrimary: '#5f8300',
    colorSuccess: '#5f8300',
    colorInfo: '#036c86',
    colorLink: '#5f8300',
    colorLinkHover: '#8ac51e',
    colorBgBase: '#ffffff',
    colorTextBase: '#101410',
    colorBorder: '#dfe7d4',
    colorBorderSecondary: '#eef3e6',
  },
  components: {
    Button: {
      primaryColor: '#ffffff',
      fontWeight: 600,
    },
    Card: {
      colorBgContainer: '#ffffff',
    },
    Collapse: {
      colorBgContainer: '#ffffff',
      headerBg: 'transparent',
    },
    Segmented: {
      itemSelectedBg: '#c8fb77',
      itemSelectedColor: '#20401a',
      trackBg: '#eef3e6',
    },
  },
};

export const getThemeConfig = (mode: 'dark' | 'light'): ThemeConfig =>
  mode === 'dark' ? darkThemeConfig : lightThemeConfig;
