import React, {useState, useEffect, useRef} from 'react';
import {Spin, Button, Tour, FloatButton, Typography} from 'antd';
import {FileTextOutlined, QuestionCircleOutlined, PlayCircleOutlined} from '@ant-design/icons';
import {validateAndRefreshToken} from "../../../utils/easyUtils";
import {getTourPanelState, setTourPanelState} from "../../../utils/cookieUtils";
import {useTranslation} from 'react-i18next';
import '../Tour.css';

// Функция для определения цвета лог-сообщения на основе ANSI кодов и содержимого
const getLogColor = (message) => {
    // Проверяем ANSI коды цветов
    if (message.includes('\u001b[31m')) return '#ff4d4f'; // ERROR - красный
    if (message.includes('\u001b[33m')) return '#faad14'; // WARNING - желтый
    if (message.includes('\u001b[32m')) return '#52c41a'; // DEBUG - зеленый
    if (message.includes('\u001b[35m')) return '#d946ef'; // FATAL - фиолетовый
    if (message.includes('\u001b[37m') || message.includes('\u001b[0m')) return '#fff'; // INFO - белый

    // Проверяем по содержимому сообщения (fallback)
    const upperMessage = message.toUpperCase();
    if (upperMessage.includes('ERROR') || upperMessage.includes('ERR') || message.includes('❌')) {
        return '#ff4d4f'; // красный
    }
    if (upperMessage.includes('WARNING') || upperMessage.includes('WARN') || message.includes('⚠️')) {
        return '#faad14'; // желтый
    }
    if (upperMessage.includes('DEBUG') || upperMessage.includes('DBG')) {
        return '#52c41a'; // зеленый
    }
    if (upperMessage.includes('FATAL') || upperMessage.includes('CRITICAL')) {
        return '#d946ef'; // фиолетовый
    }
    if (upperMessage.includes('INFO') || message.includes('✅')) {
        return '#fff'; // белый
    }

    // По умолчанию белый цвет для обычных сообщений
    return '#fff';
};

// Функция для очистки ANSI кодов из текста для отображения
const cleanAnsiCodes = (text) => {
    // eslint-disable-next-line no-control-regex
    return text.replace(/\u001b\[[0-9;]*m/g, '');
};

export function Logs() {
    const { t } = useTranslation();
    const [messages, setMessages] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [tourVisible, setTourVisible] = useState(false);
    const [current, setCurrent] = useState(0);
    const [tourPanelVisible, setTourPanelVisible] = useState(getTourPanelState('logs')); // Состояние для видимости панели
    const wsRef = useRef(null);
    const logsContainerRef = useRef(null);

    // Refs для Tour targets
    const logsHeaderRef = useRef(null);
    const connectButtonRef = useRef(null);
    const statusIndicatorRef = useRef(null);
    const controlButtonsRef = useRef(null);

    const LAND_WSS = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND_WSS) || process.env.REACT_APP_LAND_WSS;
    const wsUrl = `${LAND_WSS}/ws/log`;

    const scrollToBottom = () => {
        if (logsContainerRef.current) {
            logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        // Прокручиваем вниз только если есть сообщения
        if (messages.length > 0) {
            scrollToBottom();
        }
    }, [messages]);

    // Функция для запуска тура
    const startTour = () => {
        setTourVisible(true);
        setCurrent(0);
        setTourPanelState('logs', false); // Сохраняем состояние скрытой панели
    };

    // Функция для показа панели Tour при клике на FloatButton
    const showTourPanel = () => {
        setTourPanelVisible(true);
        setTourPanelState('logs', true); // Сохраняем состояние показанной панели
    };

    // Функция для скрытия панели Tour
    const hideTourPanel = () => {
        setTourPanelVisible(false);
        setTourPanelState('logs', false); // Сохраняем состояние скрытой панели
    };

    const addMessage = (message) => {
        const timestamp = new Date().toLocaleTimeString('ru-RU');

        // Разбиваем сообщение на строки, если есть переносы
        const lines = message.split('\n').filter(line => line.trim() !== '');

        lines.forEach(line => {
            setMessages(prev => [...prev, {
                text: line,
                timestamp
            }]);
        });
    };

    const connectWebSocket = async () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            return;
        }

        setLoading(true);
        setError(null);
        setMessages([]);
        addMessage(`🔄 ${t("logsConnecting") || "Подключение к серверу логов..."}`);

        try {
            // Получаем и валидируем токен
            const validToken = await validateAndRefreshToken(localStorage.getItem("authToken"));

            if (!validToken) {
                setError(t("logsTokenError") || "Токен не доступен или истек");
                setLoading(false);
                return;
            }

            // Добавляем токен как параметр запроса к WebSocket URL
            const wsUrlWithToken = `${wsUrl}?token=${encodeURIComponent(validToken)}`;
            wsRef.current = new WebSocket(wsUrlWithToken);

            wsRef.current.onopen = () => {
                setIsConnected(true);
                setLoading(false);
                addMessage(`✅ ${t("logsConnectionEstablished") || "Подключение установлено"}`);
                addMessage(`📄 ${t("logsStartReceiving") || "Начинаем получение логов в режиме реального времени..."}`);
            };

            wsRef.current.onmessage = (event) => {
                const message = event.data;

                // Проверяем, является ли сообщение системным
                if (message.startsWith('❌')) {
                    addMessage(message);
                    return;
                }

                // Обрабатываем обычные логи
                if (message && message.trim()) {
                    addMessage(message);
                }
            };

            wsRef.current.onclose = (event) => {
                setIsConnected(false);
                setLoading(false);

                // Более детальная обработка кодов закрытия
                if (event.code === 1000) {
                    addMessage(`📝 ${t("logsClosedByUser") || "Соединение закрыто пользователем"}`);
                } else if (event.code === 1001) {
                    addMessage(`⚠️ ${t("logsClosedByServer") || "Сервер завершил соединение"}`);
                } else if (event.code === 1006) {
                    addMessage(`❌ ${t("logsConnectionAborted") || "Соединение прервано без кода закрытия"}`);
                } else if (event.wasClean) {
                    addMessage(`📝 ${t("logsConnectionClosed") || "Соединение закрыто"}`);
                } else {
                    addMessage(`⚠️ ${t("logsConnectionInterrupted") || "Соединение прервано неожиданно (код:"} ${event.code})`);
                }

                // Очищаем ссылку на WebSocket
                wsRef.current = null;
            };

            wsRef.current.onerror = (error) => {
                setIsConnected(false);
                setLoading(false);
                setError(t("logsServerError") || 'Ошибка подключения к серверу');
                addMessage(`❌ ${t("logsConnectionError") || "Ошибка подключения к WebSocket"}`);
                console.error('WebSocket error:', error);
            };

            // Обработка ping-сообщений
            wsRef.current.onping = () => {
                // Ping сообщения для поддержания соединения
            };

        } catch (err) {
            setLoading(false);
            setError(t("logsServerError") || 'Ошибка при создании WebSocket соединения');
            addMessage(`❌ ${t("logsSocketCreationError") || "Не удалось создать WebSocket соединение"}`);
            console.error('WebSocket creation error:', err);
        }
    };

    const disconnectWebSocket = () => {
        if (wsRef.current) {
            // Проверяем состояние соединения перед закрытием
            if (wsRef.current.readyState === WebSocket.OPEN ||
                wsRef.current.readyState === WebSocket.CONNECTING) {
                // Отправляем код нормального закрытия (1000)
                wsRef.current.close(1000, 'Client disconnect');
            }
            wsRef.current = null;
        }
        setIsConnected(false);
    };

    const clearConsole = () => {
        setMessages([]);
    };

    useEffect(() => {
        // Автоматически подключаемся при монтировании компонента
        // connectWebSocket();

        return () => {
            disconnectWebSocket();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const steps = [
        {
            title: t("logsTourWelcome") || '🚀 Добро пожаловать в систему логов',
            description: t("logsTourWelcomeDesc") || 'Этот интерфейс позволяет просматривать системные логи в реальном времени для мониторинга и отладки приложений.',
            target: () => logsHeaderRef.current,
        },
        {
            title: t("logsTourConnect") || '🔌 Подключение к логам',
            description: t("logsTourConnectDesc") || 'Нажмите эту кнопку, чтобы установить WebSocket соединение с сервером логов и начать получать данные в реальном времени.',
            target: () => connectButtonRef.current,
        },
        {
            title: t("logsTourStatus") || '📊 Индикатор состояния',
            description: t("logsTourStatusDesc") || 'Здесь отображается текущий статус подключения. Зелёный индикатор означает активное соединение.',
            target: () => statusIndicatorRef.current,
        },
        {
            title: t("logsTourControl") || '🔧 Управление подключением',
            description: t("logsTourControlDesc") || 'Используйте эти кнопки для отключения от сервера логов или очистки консоли.',
            target: () => controlButtonsRef.current,
        },
        {
            title: t("logsTourConsole") || '📺 Консоль логов',
            description: t("logsTourConsoleDesc") || 'Здесь отображаются логи в реальном времени. Сообщения окрашиваются по уровню важности: красный - ошибки, жёлтый - предупреждения, зелёный - отладочная информация.',
            target: () => logsContainerRef.current,
        },
        {
            title: t("logsTourReady") || '✅ Готово!',
            description: t("logsTourReadyDesc") || 'Теперь вы знаете, как использовать систему мониторинга логов. Начните с подключения к серверу!',
            target: () => logsContainerRef.current,
        },
    ];

    const {Text} = Typography;
    if (loading) {
        return <div className="notifications-loading">
            <Spin size="large" />
            <Text className="loading-text">
                {t("loading") || "Загрузка данных..."}
            </Text>
        </div>
    }

    return (
        <div className="create-model-container">
            <div className="section-title logs-header" ref={logsHeaderRef}>
                <FileTextOutlined/>
                {t("logsTitle") || "Системные логи"}
            </div>
            <div className="section-description">
                {t("logsDescription") || "Просматривайте логи системы в режиме реального времени для мониторинга и отладки"}
            </div>

            <div className="tour-layout">
                <div className="tour-content">
                    <div className="form-section model-name-section">
                        <div style={{padding: '16px 0'}}>
                            <div style={{marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center'}}>
                                <Button
                                    ref={connectButtonRef}
                                    className="connect-button"
                                    style={{color: "black"}}
                                    type="primary"
                                    onClick={connectWebSocket}
                                    disabled={isConnected || loading}
                                    loading={loading}
                                >
                                    {isConnected ? (t("logsConnected") || 'Подключено') : (t("logsConnect") || 'Подключиться к логам')}
                                </Button>

                                <div className="control-buttons" style={{display: 'flex', gap: '8px'}} ref={controlButtonsRef}>
                                    <Button
                                        onClick={disconnectWebSocket}
                                        disabled={!isConnected && !loading}
                                    >
                                        {t("logsDisconnect") || "Отключиться"}
                                    </Button>

                                    <Button
                                        onClick={clearConsole}
                                        disabled={messages.length === 0}
                                    >
                                        {t("logsClear") || "Очистить"}
                                    </Button>
                                </div>

                                <div className="status-indicator" style={{marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px'}} ref={statusIndicatorRef}>
                                    <span style={{
                                        fontSize: '12px',
                                        color: isConnected ? '#52c41a' : '#8c8c8c',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                <span style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: isConnected ? '#52c41a' : '#d9d9d9'
                                }}></span>
                                        {isConnected ? (t("logsConnected") || 'Подключено') : (t("logsDisconnectedStatus") || 'Отключено')}
                            </span>
                                </div>
                            </div>

                            {error && (
                                <div style={{
                                    padding: '8px 12px',
                                    backgroundColor: '#fff2f0',
                                    border: '1px solid #ffccc7',
                                    borderRadius: '4px',
                                    color: '#ff4d4f',
                                    marginBottom: '16px',
                                    fontSize: '13px'
                                }}>
                                    {error}
                                </div>
                            )}

                            <div style={{
                                border: '1px solid #d9d9d9',
                                borderRadius: '6px',
                                backgroundColor: '#000',
                                color: '#fff',
                                padding: '12px',
                                height: '600px',
                                overflowY: 'auto',
                                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                                fontSize: '13px',
                                lineHeight: '1.4'
                            }} ref={logsContainerRef} className="logs-container">
                                <div style={{marginBottom: '8px', color: '#52c41a', fontWeight: 'bold'}}>
                                    {t("logsHeader") || "=== Системные логи в режиме реального времени ==="}
                                </div>

                                {messages.length === 0 && !loading && (
                                    <div style={{color: '#8c8c8c', fontStyle: 'italic'}}>
                                        {t("logsClickToConnect") || 'Нажмите "Подключиться к логам" для начала получения логов в режиме реального времени...'}
                                    </div>
                                )}

                                {messages.map((message, index) => (
                                    <div key={index} style={{marginBottom: '2px'}}>
                                <span style={{color: '#8c8c8c', fontSize: '11px'}}>
                                    [{message.timestamp}]
                                </span>
                                        <span style={{
                                            marginLeft: '8px',
                                            color: getLogColor(message.text),
                                            wordBreak: 'break-word'
                                        }}>
                                    {cleanAnsiCodes(message.text)}
                                </span>
                                    </div>
                                ))}
                            </div>

                            <div style={{
                                marginTop: '12px',
                                fontSize: '12px',
                                color: '#8c8c8c',
                                textAlign: 'center'
                            }}>
                                {t("logsUpdateFrequency") || "Системные логи обновляются в режиме реального времени каждые 500мс"}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Панель управления Tour справа - показывается только когда tourPanelVisible = true */}
                {tourPanelVisible && (
                    <div className="tour-controls tour-primary">
                        <div className="tour-controls-header">
                            <PlayCircleOutlined className="tour-controls-icon" />
                            <h3 className="tour-controls-title">
                                {t("logsTourTitle") || "Интерактивный обзор"}
                            </h3>
                            <p className="tour-controls-subtitle">
                                {t("logsTourSubtitle") || "Изучите интерфейс системы логов пошагово"}
                            </p>
                        </div>

                        <div className="tour-start-button">
                            <Button
                                type="primary"
                                block
                                size="large"
                                onClick={startTour}
                            >
                                {t("logsTourStart") || "🚀 Начать тур"}
                            </Button>
                        </div>

                        {tourVisible && (
                            <div className="tour-progress">
                                <div className="tour-progress-step">
                                    <span className="tour-progress-step-text">
                                        {t("logsTourStep") || "Шаг"} {current + 1} {t("notifTourOf") || "из"} {steps.length}
                                    </span>
                                </div>
                                <div className="tour-progress-bar">
                                    <div
                                        className="tour-progress-fill"
                                        style={{width: `${((current + 1) / steps.length) * 100}%`}}
                                    />
                                </div>
                                <div className="tour-progress-title">
                                    {steps[current]?.title}
                                </div>
                            </div>
                        )}

                        <div className="tour-info">
                            <div className="tour-info-title">{t("logsTourWhatYouLearn") || "📋 Что вы изучите:"}</div>
                            <ul className="tour-info-list">
                                <li>{t("logsTourLearn1") || "Подключение к серверу логов"}</li>
                                <li>{t("logsTourLearn2") || "Мониторинг состояния системы"}</li>
                                <li>{t("logsTourLearn3") || "Управление консолью логов"}</li>
                                <li>{t("logsTourLearn4") || "Интерпретация сообщений"}</li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>

            <Tour
                open={tourVisible}
                onClose={() => {
                    setTourVisible(false);
                    setCurrent(0);
                    hideTourPanel()
                }}
                steps={steps}
                current={current}
                onChange={setCurrent}
                indicatorsRender={(current, total) => (
                    <span className="tour-indicator">
                    {current + 1} / {total}
                </span>
                )}
                type="primary"
                arrow={false}
            />

            <FloatButton
                icon={<QuestionCircleOutlined />}
                tooltip={t("tourFloatButtonTooltip") || "Начать обзор интерфейса"}
                onClick={showTourPanel}
                className="tour-float-button"
            />
        </div>
    );
}
