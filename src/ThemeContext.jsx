import React, { createContext, useState, useContext, useEffect } from 'react';
import { ConfigProvider } from 'antd';
import { getCssVariable } from './utils/easyUtils';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
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

    useEffect(() => {
        localStorage.setItem('theme', theme);
        document.body.className = theme;

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