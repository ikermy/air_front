import React, { useEffect, useState, lazy, Suspense } from 'react';
import './Widget.css';
import './chat/ChatWidget.css'; // Импортируем стили ChatWidget сразу
import '../dialog/ChatWindow.css'; // Импортируем стили для сообщений (.chat-message, .left, .right)
import {getWidgetStaticPath} from './utils/environment';
import {useWidgetTheme} from './hooks/useWidgetTheme';
import {useWidgetHoverStyles} from './hooks/useWidgetHoverStyles';
import {useWidgetStyles} from './hooks/useWidgetStyles';
import type {WidgetColorConfig} from './model/color.types';
import {SYSTEM_WIDGET_FONT_STACK} from './utils/fontStack';
// import {useTranslation}from "react-i18next";

// Lazy loading для ChatWidget - загружается только при клике на кнопку
const ChatWidget = lazy(() => import("./chat/ChatWidget").then(module => ({ default: module.ChatWidget })));

export interface WidgetProps {
    widgetCode: string;
    buttonPosition?: React.CSSProperties;
    buttonSize?: React.CSSProperties;
    buttonStyle?: React.CSSProperties;
    colors?: WidgetColorConfig;
}

export function Widget({
                           widgetCode,
                           buttonPosition = {},
                           buttonSize = {},
                           buttonStyle = {},
                           colors = {}
                       }: WidgetProps) {
    // const {t, i18n} = useTranslation();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [indicator, setIndicator] = useState("disconnected"); // Состояние для индикатора
    const {theme: currentTheme, themeColors} = useWidgetTheme(colors);
    useWidgetHoverStyles(currentTheme, colors);
    const widgetStyles = useWidgetStyles({buttonPosition, buttonSize, buttonStyle, themeColors, indicator});

    const [connected, setConnected] = useState(undefined);

    const handleOpenModal = () => {
        if (!isModalOpen) {
            setIsModalOpen(true);
        } else {
            setIsModalOpen(false);
        }
    };

    useEffect(() => {
        if (connected) {
            setIndicator("connected")
        } else {
            setIndicator("disconnected")
        }
    }, [connected]);

    return (
        <div className="marusya-widget" style={{fontFamily: SYSTEM_WIDGET_FONT_STACK}}>
            {!isModalOpen && (
                <button
                    type="button"
                    className="widget-open-button"
                    style={widgetStyles.button}
                    onClick={handleOpenModal}>
                    <img
                        src={getWidgetStaticPath("landing/aperture.svg")}
                        alt="Маруся AI"
                        style={{
                            filter: themeColors.buttonIconFilter
                        }}
                    />
                </button>
            )}
            {isModalOpen && (
                <div
                    className="widget-chat-window"
                    style={widgetStyles.chatWindow}
                >
                    <div
                        className="widget-cap"
                        style={widgetStyles.cap}
                    >
                        <div
                            className={`widget-circle ${indicator}`}
                            style={widgetStyles.indicator}
                        ></div>
                        <img
                            src={getWidgetStaticPath("landing/aperture.svg")}
                            alt="Маруся AI"
                            style={{
                                filter: themeColors.headerIconFilter
                            }}
                        />
                        <div className="widget-circle"></div>
                        <b style={{ color: themeColors.headerText }}>Маруся AI</b>
                        <button
                            type="button"
                            className="widget-close-button"
                            style={widgetStyles.closeButton}
                            onClick={handleOpenModal}>×
                        </button>
                    </div>
                    <Suspense fallback={
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            height: '300px',
                            color: themeColors.textColor
                        }}>
                            Загрузка...
                        </div>
                    }>
                        <ChatWidget
                            widgetCode={widgetCode}
                            connected={connected}
                            setConnected={setConnected}
                            setIsModalOpen={setIsModalOpen}
                            messageStyles={{
                                user: widgetStyles.messageUser,
                                bot: widgetStyles.messageBot
                            }} // Передаем стили для сообщений
                            inputStyle={widgetStyles.input} // Передаем стили для поля ввода
                            sendButtonStyle={widgetStyles.sendButton} // Передаем стили для кнопки отправки
                        />
                    </Suspense>
                </div>
            )}
        </div>
    );
}
