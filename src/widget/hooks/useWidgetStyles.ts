import {CSSProperties, useMemo} from 'react';

interface WidgetStyleOptions {
    buttonPosition: CSSProperties;
    buttonSize: CSSProperties;
    buttonStyle: CSSProperties;
    themeColors: Record<string, string>;
    indicator: string;
}

export function useWidgetStyles({buttonPosition, buttonSize, buttonStyle, themeColors, indicator}: WidgetStyleOptions) {
    return useMemo(() => ({
        button: {
            right: buttonPosition.right || '30px',
            bottom: buttonPosition.bottom || '30px',
            left: buttonPosition.left || 'auto',
            top: buttonPosition.top || 'auto',
            width: buttonSize.width || '50px',
            height: buttonSize.height || '50px',
            display: 'flex',
            position: 'fixed',
            zIndex: 999999,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: themeColors.buttonBackground,
            ...buttonStyle,
        } as CSSProperties,
        chatWindow: {
            right: buttonPosition.right || '30px',
            bottom: buttonPosition.bottom ? `calc(${buttonPosition.bottom} + ${buttonSize.height || '50px'} + 10px)` : '100px',
            backgroundColor: themeColors.windowBackground,
            borderColor: themeColors.windowBorder,
            color: themeColors.textColor,
        } as CSSProperties,
        cap: {backgroundColor: themeColors.headerBackground, color: themeColors.headerText} as CSSProperties,
        closeButton: {backgroundColor: themeColors.closeButtonBackground, color: themeColors.closeButtonText} as CSSProperties,
        sendButton: {backgroundColor: themeColors.sendButtonBackground, filter: themeColors.sendButtonIconFilter} as CSSProperties,
        indicator: {backgroundColor: indicator === 'connected' ? themeColors.connectedIndicator : themeColors.disconnectedIndicator} as CSSProperties,
        messageUser: {backgroundColor: themeColors.messageBackgroundUser, color: themeColors.messageTextUser} as CSSProperties,
        messageBot: {backgroundColor: themeColors.messageBackgroundBot, color: themeColors.messageTextBot} as CSSProperties,
        input: {backgroundColor: themeColors.inputBackground, color: themeColors.inputText, '::placeholder': {color: themeColors.inputPlaceholder}} as CSSProperties,
    }), [buttonPosition, buttonSize, buttonStyle, indicator, themeColors]);
}
