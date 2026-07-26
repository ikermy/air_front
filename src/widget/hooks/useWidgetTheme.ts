import {useCallback, useEffect, useState} from 'react';
import type {WidgetColorConfig} from '../model/color.types';

export type WidgetTheme = 'light' | 'dark';
export type WidgetColors = WidgetColorConfig;

export function useWidgetTheme(colors: WidgetColors = {}) {
    const [theme, setTheme] = useState<WidgetTheme>('light');

    const detectTheme = useCallback((): WidgetTheme => {
        if (document.body.classList.contains('dark')) return 'dark';
        if (document.body.classList.contains('light')) return 'light';
        return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }, []);

    useEffect(() => {
        const updateTheme = () => setTheme(detectTheme());
        updateTheme();

        const observer = new MutationObserver(updateTheme);
        observer.observe(document.body, {attributes: true, attributeFilter: ['class']});
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener?.('change', updateTheme);

        return () => {
            observer.disconnect();
            mediaQuery.removeEventListener?.('change', updateTheme);
        };
    }, [detectTheme]);

    const isDark = theme === 'dark';
    const themeColors = {
        buttonBackground: colors.buttonBackground || (isDark ? 'var(--user-data-bg-dark)' : 'var(--new-hover-color)'),
        buttonIconFilter: colors.buttonIconFilter || (isDark ? 'brightness(0)' : 'brightness(0) invert(1)'),
        windowBackground: colors.windowBackground || (isDark ? 'var(--input-bg-dark)' : 'var(--input-bg-light)'),
        windowBorder: colors.windowBorder || (isDark ? 'var(--chat-window-border-dark)' : 'var(--chat-window-border-light)'),
        textColor: colors.textColor || (isDark ? '#e0e0e0' : '#333333'),
        headerBackground: colors.headerBackground || (isDark ? 'var(--main-color-light)' : 'var(--dialog-hover-bg-light)'),
        headerText: colors.headerText || '#333333',
        headerIconFilter: colors.headerIconFilter || 'none',
        messageBackgroundUser: colors.messageBackgroundUser || (isDark ? 'var(--message-right-bg-dark)' : 'var(--message-right-bg-light)'),
        messageTextUser: colors.messageTextUser || (isDark ? 'var(--text-color-dark)' : 'var(--text-color-light)'),
        messageBackgroundBot: colors.messageBackgroundBot || (isDark ? 'var(--message-left-bg-dark)' : 'var(--message-left-bg-light)'),
        messageTextBot: colors.messageTextBot || (isDark ? 'var(--text-color-dark)' : 'var(--text-color-light)'),
        inputBackground: colors.inputBackground || (isDark ? 'var(--input-bg-dark)' : 'var(--input-bg-light)'),
        inputText: colors.inputText || (isDark ? '#e0e0e0' : '#333333'),
        inputPlaceholder: colors.inputPlaceholder || (isDark ? '#aaaaaa' : '#888888'),
        sendButtonBackground: colors.sendButtonBackground || (isDark ? 'var(--button-bg-dark)' : 'var(--button-bg-light)'),
        closeButtonBackground: colors.closeButtonBackground || 'var(--close-color)',
        closeButtonText: colors.closeButtonText || 'white',
        connectedIndicator: colors.connectedIndicator || '#28a745',
        disconnectedIndicator: colors.disconnectedIndicator || '#dc3545',
    };

    return {theme, isDark, themeColors};
}
