import React, { createContext, useState, useContext, useEffect } from 'react';
import { ConfigProvider } from 'antd';
import { getCssVariable } from './utils/easyUtils';

const ThemeContext = createContext();

// Имя cookie синхронизировано с src/landing/v2/theme/themeCookie.ts.
// Лендинг (app/) читает её на сервере, поэтому тема сквозная:
// переключил на главной -> дашборд открывается в той же теме.
const THEME_COOKIE = 'air_theme';

const readThemeCookie = () => {
    if (typeof document === 'undefined') return null;
    const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${THEME_COOKIE}=([^;]*)`));
    return m && (m[1] === 'dark' || m[1] === 'light') ? m[1] : null;
};

const writeThemeCookie = (mode) => {
    if (typeof document === 'undefined') return;
    const secure = window.location.protocol === 'https:' ? '; secure' : '';
    document.cookie = `${THEME_COOKIE}=${mode}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax${secure}`;
};

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => {
        // SSR отдаёт 'light', чтобы не расходиться с текущей разметкой Pages Router;
        // реальное значение подхватывается в useEffect ниже.
        if (typeof window === 'undefined') return 'light';
        // Cookie приоритетнее: её мог только что выставить лендинг.
        return readThemeCookie() || (localStorage.getItem('theme') === 'dark' ? 'dark' : 'light');
    });
    const [antTheme, setAntTheme] = useState({
        token: {
            colorPrimary: null,
            colorTextBase: null,
            colorBgBase: null,
            colorSuccess: null,
            colorError: null,
            colorWarning: null,
            colorInfo: null,
            colorLink: null,
            colorLinkHover: null,
            controlBg: null,
            controlOutline: null,
        },
    });

    // Подхватываем тему после гидрации: на сервере window недоступен,
    // а initial state там всегда 'light'.
    useEffect(() => {
        const actual = readThemeCookie() || (localStorage.getItem('theme') === 'dark' ? 'dark' : 'light');
        setTheme(prev => (prev === actual ? prev : actual));
    }, []);

    useEffect(() => {
        localStorage.setItem('theme', theme);
        writeThemeCookie(theme);
        document.body.classList.remove('light', 'dark');
        document.body.classList.add(theme);
        document.documentElement.dataset.theme = theme;

        // Задержка для применения стилей
        setTimeout(() => {
            setAntTheme({
                token: {
                    colorPrimary: getCssVariable('--main-color', document.body),
                    colorTextBase: getCssVariable('--text-color', document.body),
                    colorBgBase: getCssVariable('--bg-color', document.body),
                    colorSuccess: getCssVariable('--conected-color', document.body),
                    colorError: getCssVariable('--error-color', document.body),
                    colorWarning: getCssVariable('--warning-color', document.body),
                    colorInfo: '#1890ff',
                    colorLink: getCssVariable('--link-color', document.body),
                    colorLinkHover: getCssVariable('--link-hover-color', document.body),
                    controlBg: '#fb0202',
                    controlOutline: getCssVariable('--shadow-color', document.body),
                },
            });
        }, 0);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            <ConfigProvider theme={antTheme}>
                {children}
            </ConfigProvider>
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
