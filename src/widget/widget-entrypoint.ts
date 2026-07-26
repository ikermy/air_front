import React from 'react';
import {createRoot, Root} from 'react-dom/client';
import {Widget} from './Widget';
import '../i18n';
import '../App.css';
import './Widget.css';
import '../dialog/ChatWindow.css';
import './chat/ChatWidget.css';
import {configureWidgetRuntime} from './utils/environment';
import {normalizeWidgetColors, parseWidgetColors} from './model/color.types';
import type {WidgetColorConfig} from './model/color.types';

export interface WidgetInitOptions {
    widgetCode?: string;
    buttonPosition?: React.CSSProperties;
    buttonSize?: React.CSSProperties;
    buttonStyle?: React.CSSProperties;
    colors?: WidgetColorConfig;
}

export interface WidgetInstance {
    destroy: () => void;
    container: HTMLDivElement;
    root: Root;
}

export interface MarusyaWidgetApi {
    init: (options?: WidgetInitOptions) => WidgetInstance | null;
    destroy: () => void;
}

declare global {
    interface Window {
        MarusyaWidget: MarusyaWidgetApi;
        WIDGET_STATIC_BASE?: string;
        runtimeConfig?: {REACT_APP_LAND?: string};
        process?: {env?: Record<string, string | undefined>};
    }
}

const injectWidgetCSS = () => {
    if (document.body && !document.body.classList.contains('light') && !document.body.classList.contains('dark')) {
        document.body.classList.add('light');
    }
};

injectWidgetCSS();

const landUrl = process.env.LAND_URL;
configureWidgetRuntime(landUrl);

const MarusyaWidgetAPI: MarusyaWidgetApi = {
    init(options = {}) {
        const {widgetCode} = options;
        if (!widgetCode) {
            console.error('Marusya Widget: widgetCode is required for initialization');
            return null;
        }

        const widgetContainer = document.createElement('div');
        widgetContainer.id = 'marusya-widget-container';
        document.body.appendChild(widgetContainer);

        try {
            const root = createRoot(widgetContainer);
            root.render(React.createElement(Widget, {
                widgetCode,
                buttonPosition: options.buttonPosition || {},
                buttonSize: options.buttonSize || {},
                buttonStyle: options.buttonStyle || {},
                    colors: normalizeWidgetColors(options.colors),
            }));

            return {
                root,
                container: widgetContainer,
                destroy: () => {
                    root.unmount();
                    widgetContainer.remove();
                },
            };
        } catch (error) {
            console.error('Failed to initialize full React Widget:', error);
            widgetContainer.remove();
            return null;
        }
    },

    destroy() {
        document.getElementById('marusya-widget-container')?.remove();
    },
};

window.MarusyaWidget = MarusyaWidgetAPI;

const autoInit = () => {
    const scriptTag = document.querySelector<HTMLScriptElement>('script[src*="marusya-widget"]');
    const widgetCode = scriptTag?.getAttribute('data-widget-code');
    if (!widgetCode) return;

    const init = () => MarusyaWidgetAPI.init({
        widgetCode,
        colors: parseWidgetColors(scriptTag?.dataset.widgetColors),
    });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once: true});
    else init();
};

autoInit();

export default MarusyaWidgetAPI;
