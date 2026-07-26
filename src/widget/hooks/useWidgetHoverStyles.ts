import {useEffect} from 'react';
import type {WidgetColors, WidgetTheme} from './useWidgetTheme';

export function useWidgetHoverStyles(theme: WidgetTheme, colors: WidgetColors) {
    useEffect(() => {
        const styleId = 'marusya-widget-dynamic-styles';
        let styleElement = document.getElementById(styleId) as HTMLStyleElement | null;
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = styleId;
            document.head.appendChild(styleElement);
        }

        const isDark = theme === 'dark';
        const buttonHoverBackground = colors.buttonHoverBackground || (isDark ? 'var(--link-color-light)' : 'var(--blue-color)');
        const closeButtonHoverBackground = colors.closeButtonHoverBackground || '#ff4d4f';
        styleElement.textContent = `
            .widget-open-button:hover {
                background-color: ${buttonHoverBackground} !important;
                transform: scale(1.1);
                transition: all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);
            }
            .widget-close-button:hover {
                background-color: ${closeButtonHoverBackground} !important;
                transition: all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);
            }
        `;

        return () => styleElement?.remove();
    }, [colors, theme]);
}
