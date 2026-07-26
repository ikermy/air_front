export interface WidgetColorConfig {
    buttonBackground?: string;
    buttonHoverBackground?: string;
    buttonIconFilter?: string;
    windowBackground?: string;
    windowBorder?: string;
    textColor?: string;
    headerBackground?: string;
    headerText?: string;
    headerIconFilter?: string;
    messageBackgroundUser?: string;
    messageTextUser?: string;
    messageBackgroundBot?: string;
    messageTextBot?: string;
    inputBackground?: string;
    inputText?: string;
    inputPlaceholder?: string;
    sendButtonBackground?: string;
    closeButtonBackground?: string;
    closeButtonHoverBackground?: string;
    closeButtonText?: string;
    connectedIndicator?: string;
    disconnectedIndicator?: string;
}

export const DEFAULT_WIDGET_COLORS: WidgetColorConfig = {};

const COLOR_KEYS = new Set<keyof WidgetColorConfig>([
    'buttonBackground', 'buttonHoverBackground', 'buttonIconFilter', 'windowBackground', 'windowBorder',
    'textColor', 'headerBackground', 'headerText', 'headerIconFilter', 'messageBackgroundUser',
    'messageTextUser', 'messageBackgroundBot', 'messageTextBot', 'inputBackground', 'inputText',
    'inputPlaceholder', 'sendButtonBackground', 'closeButtonBackground', 'closeButtonHoverBackground',
    'closeButtonText', 'connectedIndicator', 'disconnectedIndicator',
]);

export function normalizeWidgetColors(value?: Partial<WidgetColorConfig>): WidgetColorConfig {
    if (!value || typeof value !== 'object') return {};
    return Object.entries(value).reduce<WidgetColorConfig>((result, [key, color]) => {
        if (COLOR_KEYS.has(key as keyof WidgetColorConfig) && typeof color === 'string' && color.trim()) {
            result[key as keyof WidgetColorConfig] = color.trim();
        }
        return result;
    }, {});
}

export function parseWidgetColors(value?: string | null): WidgetColorConfig {
    if (!value) return {};
    try {
        const decoded = decodeURIComponent(value);
        const parsed = JSON.parse(decoded);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? normalizeWidgetColors(parsed) : {};
    } catch {
        return {};
    }
}
