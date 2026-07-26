export interface WidgetRuntimeConfig {
    REACT_APP_LAND?: string;
}

export interface WidgetWindow extends Window {
    WIDGET_STATIC_BASE?: string;
    runtimeConfig?: WidgetRuntimeConfig;
}

export function getWidgetWindow(): WidgetWindow {
    return window as WidgetWindow;
}

export function ensureWidgetStaticBase(): string {
    const widgetWindow = getWidgetWindow();
    if (widgetWindow.WIDGET_STATIC_BASE) return widgetWindow.WIDGET_STATIC_BASE;

    const {hostname, protocol} = window.location;
    widgetWindow.WIDGET_STATIC_BASE = protocol === 'file:' || hostname === 'localhost' || hostname === '127.0.0.1'
        ? './build/widget/'
        : '/widget/';

    return widgetWindow.WIDGET_STATIC_BASE;
}

export function configureWidgetRuntime(landUrl?: string): void {
    const widgetWindow = getWidgetWindow();
    widgetWindow.runtimeConfig = widgetWindow.runtimeConfig || {};
    widgetWindow.runtimeConfig.REACT_APP_LAND = landUrl;
    ensureWidgetStaticBase();
}

export function getWidgetStaticPath(path: string): string {
    if (path.startsWith('landing/')) return `https://info-bot.online/${path}`;
    const widgetWindow = getWidgetWindow();
    return widgetWindow.WIDGET_STATIC_BASE ? `${widgetWindow.WIDGET_STATIC_BASE}${path}` : `/${path}`;
}
