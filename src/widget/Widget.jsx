import React, { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import './Widget.css';
import './chat/ChatWidget.css'; // Импортируем стили ChatWidget сразу
import '../dialog/ChatWindow.css'; // Импортируем стили для сообщений (.chat-message, .left, .right)
// import {useTranslation}from "react-i18next";

// Lazy loading для ChatWidget - загружается только при клике на кнопку
const ChatWidget = lazy(() => import("./chat/ChatWidget").then(module => ({ default: module.ChatWidget })));


// Функция для получения правильного пути к статическим файлам
function getStaticPath(path) {
    // Для standalone виджета используем абсолютные пути к продакшн ресурсам
    if (typeof window !== 'undefined' && window.WIDGET_STATIC_BASE) {
        // Для landing файлов (aperture.svg) используем прямой путь
        if (path.startsWith('landing/')) {
            // Возвращаем путь к продакшн серверу
            return 'https://info-bot.online/' + path; // https://info-bot.online/landing/aperture.svg
        }
        return window.WIDGET_STATIC_BASE + path;
    }
    // Для внутреннего виджета в Home.jsx используем обычный абсолютный путь
    return '/' + path;
}

export function Widget({
                           examKey: propExamKey,
                           buttonPosition = {},
                           buttonSize = {},
                           buttonStyle = {},
                           colors = {}
                       }) {
    // const {t, i18n} = useTranslation();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [indicator, setIndicator] = useState("disconnected"); // Состояние для индикатора
    const [currentTheme, setCurrentTheme] = useState('light'); // Добавляем состояние темы

    const [connected, setConnected] = useState(undefined);

    // Функция для определения текущей темы
    const detectTheme = useCallback(() => {
        if (typeof document !== 'undefined') {
            const body = document.body;
            if (body.classList.contains('dark')) {
                return 'dark';
            } else if (body.classList.contains('light')) {
                return 'light';
            }
            // Автоматическое определение по системным настройкам
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                return 'dark';
            }
        }
        return 'light';
    }, []);

    // Отслеживаем изменения темы
    useEffect(() => {
        const updateTheme = () => {
            const newTheme = detectTheme();
            setCurrentTheme(newTheme);
        };

        // Устанавливаем начальную тему
        updateTheme();

        // Создаем observer для отслеживания изменений классов body
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    updateTheme();
                }
            });
        });

        // Наблюдаем за изменениями классов body
        if (typeof document !== 'undefined') {
            observer.observe(document.body, {
                attributes: true,
                attributeFilter: ['class']
            });
        }

        // Слушаем системные изменения темы
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleSystemThemeChange = () => updateTheme();

        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleSystemThemeChange);
        } else {
            // Fallback для старых браузеров
            mediaQuery.addListener(handleSystemThemeChange);
        }

        return () => {
            observer.disconnect();
            if (mediaQuery.removeEventListener) {
                mediaQuery.removeEventListener('change', handleSystemThemeChange);
            } else {
                mediaQuery.removeListener(handleSystemThemeChange);
            }
        };
    }, [detectTheme]);

    // Функция получения цветов с учетом темы
    const getThemeAwareColors = useCallback(() => {
        const isDark = currentTheme === 'dark';

        return {
            // Кнопка виджета
            buttonBackground: colors.buttonBackground ||
                (isDark ? 'var(--user-data-bg-dark)' : 'var(--new-hover-color)'),
            buttonIconFilter: colors.buttonIconFilter ||
                (isDark ? 'brightness(0)' : 'brightness(0) invert(1)'),

            // Окно чата
            windowBackground: colors.windowBackground ||
                (isDark ? 'var(--input-bg-dark)' : 'var(--input-bg-light)'),
            windowBorder: colors.windowBorder ||
                (isDark ? 'var(--chat-window-border-dark)' : 'var(--chat-window-border-light)'),
            textColor: colors.textColor ||
                (isDark ? '#e0e0e0' : '#333333'),

            // Заголовок
            headerBackground: colors.headerBackground ||
                (isDark ? 'var(--main-color-light)' : 'var(--dialog-hover-bg-light)'),
            headerText: colors.headerText ||
                (isDark ? '#333333' : '#333333'),
            headerIconFilter: colors.headerIconFilter || 'none',

            // Сообщения чата
            messageBackgroundUser: colors.messageBackgroundUser ||
                (isDark ? 'var(--message-right-bg-dark)' : 'var(--message-right-bg-light)'),
            messageTextUser: colors.messageTextUser ||
                (isDark ? 'var(--text-color-dark)' : 'var(--text-color-light)'),
            messageBackgroundBot: colors.messageBackgroundBot ||
                (isDark ? 'var(--message-left-bg-dark)' : 'var(--message-left-bg--light)'),
            messageTextBot: colors.messageTextBot ||
                (isDark ? 'var(--text-color-dark)' : 'var(--text-color-light)'),

            // Поле ввода
            inputBackground: colors.inputBackground ||
                (isDark ? 'var(--input-bg-dark)' : 'var(--input-bg-light)'),
            inputText: colors.inputText ||
                (isDark ? '#e0e0e0' : '#333333'),
            inputPlaceholder: colors.inputPlaceholder ||
                (isDark ? '#aaaaaa' : '#888888'),

            // Кнопка отправки
            sendButtonBackground: colors.sendButtonBackground ||
                (isDark ? 'var(--button-bg-dark)' : 'var(--button-bg-light)'),
            // sendButtonIconFilter: colors.sendButtonIconFilter ||
            //     (isDark ? 'brightness(0)' : 'brightness(0) invert(1)'),

            // Кнопка закрытия
            closeButtonBackground: colors.closeButtonBackground || 'var(--close-color)',
            closeButtonText: colors.closeButtonText || 'white',

            // Индикаторы подключения
            connectedIndicator: colors.connectedIndicator || '#28a745',
            disconnectedIndicator: colors.disconnectedIndicator || '#dc3545'
        };
    }, [currentTheme, colors]);

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

    // Получаем цвета с учетом темы
    const themeColors = getThemeAwareColors();

    // Создаем и применяем динамические CSS стили для hover-эффектов
    useEffect(() => {
        // Создаем уникальный ID для стилей этого виджета
        const styleId = 'marusya-widget-dynamic-styles';
        let styleElement = document.getElementById(styleId);

        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = styleId;
            document.head.appendChild(styleElement);
        }

        // Получаем hover цвета
        const isDark = currentTheme === 'dark';
        const buttonHoverBackground = colors.buttonHoverBackground ||
            (isDark ? 'var(--link-color-light)' : 'var(--blue-color)');
        const closeButtonHoverBackground = colors.closeButtonHoverBackground || '#ff4d4f';

        // Создаем CSS для hover-эффектов напрямую
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

        // Cleanup function
        return () => {
            if (styleElement && styleElement.parentNode) {
                styleElement.parentNode.removeChild(styleElement);
            }
        };
    }, [themeColors, colors, currentTheme]);

    // Создаем динамические стили для кнопки
    const dynamicButtonStyle = {
        // Позиционирование
        right: buttonPosition.right || '30px',
        bottom: buttonPosition.bottom || '30px',
        left: buttonPosition.left || 'auto',
        top: buttonPosition.top || 'auto',

        // Размеры
        width: buttonSize.width || '50px',
        height: buttonSize.height || '50px',

        // Принудительное отображение и позиционирование
        display: 'flex',
        position: 'fixed',
        zIndex: 999999,
        justifyContent: 'center',
        alignItems: 'center',

        // Цвета с учетом темы
        backgroundColor: themeColors.buttonBackground,

        // Дополнительные стили
        ...buttonStyle
    };

    // Создаем динамические стили для окна чата (позиционируем относительно кнопки)
    const dynamicChatWindowStyle = {
        right: buttonPosition.right || '30px',
        bottom: buttonPosition.bottom ?
            `calc(${buttonPosition.bottom} + ${buttonSize.height || '50px'} + 10px)` :
            '100px', // 30px (bottom кнопки) + 50px (высота кнопки) + 20px (отступ)

        // Цвета окна чата с учетом темы
        backgroundColor: themeColors.windowBackground,
        borderColor: themeColors.windowBorder,
        color: themeColors.textColor
    };

    // Создаем динамические стили для заголовка
    const dynamicCapStyle = {
        backgroundColor: themeColors.headerBackground,
        color: themeColors.headerText
    };

    // Создаем динамические стили для кнопки закрытия
    const dynamicCloseButtonStyle = {
        backgroundColor: themeColors.closeButtonBackground,
        color: themeColors.closeButtonText
    };

    // Создаем динамические стили для кнопки отправки
    const dynamicSendButtonStyle = {
        backgroundColor: themeColors.sendButtonBackground,
        filter: themeColors.sendButtonIconFilter
    };

    // Создаем динамические стили для индикатора подключения
    const dynamicIndicatorStyle = {
        backgroundColor: indicator === 'connected' ?
            themeColors.connectedIndicator :
            themeColors.disconnectedIndicator
    };

    // Создаем динамические стили для сообщений пользователя
    const dynamicMessageUserStyle = {
        backgroundColor: themeColors.messageBackgroundUser,
        color: themeColors.messageTextUser
    };

    // Создаем динамические стили для сообщений бота
    const dynamicMessageBotStyle = {
        backgroundColor: themeColors.messageBackgroundBot,
        color: themeColors.messageTextBot
    };

    // Можно добавить динамические стили для поля ввода
    const dynamicInputStyle = {
        backgroundColor: themeColors.inputBackground,
        color: themeColors.inputText,
        '::placeholder': {
            color: themeColors.inputPlaceholder
        }
    };

    return (
        <>
            {!isModalOpen && (
                <button
                    type="button"
                    className="widget-open-button"
                    style={dynamicButtonStyle}
                    onClick={handleOpenModal}>
                    <img
                        src={getStaticPath("landing/aperture.svg")}
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
                    style={dynamicChatWindowStyle}
                >
                    <div
                        className="widget-cap"
                        style={dynamicCapStyle}
                    >
                        <div
                            className={`widget-circle ${indicator}`}
                            style={dynamicIndicatorStyle}
                        ></div>
                        <img
                            src={getStaticPath("landing/aperture.svg")}
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
                            style={dynamicCloseButtonStyle}
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
                            examKey={propExamKey}
                            connected={connected}
                            setConnected={setConnected}
                            setIsModalOpen={setIsModalOpen}
                            messageStyles={{
                                user: dynamicMessageUserStyle,
                                bot: dynamicMessageBotStyle
                            }} // Передаем стили для сообщений
                            inputStyle={dynamicInputStyle} // Передаем стили для поля ввода
                            sendButtonStyle={dynamicSendButtonStyle} // Передаем стили для кнопки отправки
                        />
                    </Suspense>
                </div>
            )}
        </>
    );
}