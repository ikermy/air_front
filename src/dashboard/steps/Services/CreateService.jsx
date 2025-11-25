import {GrServices} from "react-icons/gr";
import React, {useRef, useState, useEffect} from "react";
import {Tabs, FloatButton, Button, Modal, message, Tour} from 'antd';
import {
    QuestionCircleOutlined,
    RobotOutlined,
    ContactsOutlined,
    ClockCircleOutlined,
    BarChartOutlined,
    ApiOutlined,
    PlayCircleOutlined,
    StopOutlined,
    ExclamationCircleOutlined,
    CloudServerOutlined
} from '@ant-design/icons';
import {Schedule} from "./schedule";
import {ServiceModelData} from "./modelData";
import {ServiceContactsData} from "./contactsData";
import {Bots} from "./bots";
import {Events} from "./events";
import {ProxyData} from "./proxyData";
import {checkServiceInProcess, stopService} from "./serviceUtils";
import {validateAndRefreshToken} from "../../../utils/easyUtils";
import {showNotification, showErrorNotification} from "../../hotification/showNotification";
import {getTourPanelState, setTourPanelState} from "../../../utils/cookieUtils";
import {ServiceStartService} from "./serviceStartService";
import '../Tour.css';


export function CreateService() {
    // Refs для Tour targets
    const servicesHeaderRef = useRef(null);
    // Используем refs на DOM-контейнеры, а не на компоненты AntD
    const startButtonRef = useRef(null);
    const tabsRef = useRef(null);

    // Ref для сервиса запуска
    const startServiceRef = useRef(null);

    // Ref для компонента Bots
    const botsRef = useRef(null);

    // Ref для компонента ProxyData
    const proxyDataRef = useRef(null);

    const [activeTab, setActiveTab] = useState('model');
    const [visitedTabs, setVisitedTabs] = useState(new Set(['model'])); // Начальная вкладка сразу помечена как посещенная
    const [isServiceRunning, setIsServiceRunning] = useState(false);
    const [isStartModalOpen, setIsStartModalOpen] = useState(false);
    const [isStopModalOpen, setIsStopModalOpen] = useState(false);
    const [isCheckingStatus, setIsCheckingStatus] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false); // Новое состояние для блокировки кнопки
    const [startStatus, setStartStatus] = useState(''); // Текущий статус запуска

    // Tour states
    const [tourVisible, setTourVisible] = useState(false);
    const [current, setCurrent] = useState(0);
    const [tourPanelVisible, setTourPanelVisible] = useState(getTourPanelState('createservice'));

    // Инициализация сервиса при монтировании компонента
    useEffect(() => {
        startServiceRef.current = new ServiceStartService();

        return () => {
            // Закрываем соединение при размонтировании
            if (startServiceRef.current) {
                startServiceRef.current.closeConnection();
            }
        };
    }, []);

    // Проверка статуса сервиса при загрузке компонента
    useEffect(() => {
        const checkStatus = async () => {
            setIsCheckingStatus(true);
            try {
                const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
                if (!token) {
                    message.error('Ошибка аутентификации');
                    setIsCheckingStatus(false);
                    return;
                }

                const isRunning = await checkServiceInProcess(token);
                setIsServiceRunning(isRunning);
            } catch (error) {
                console.error('Ошибка при проверке статуса сервиса:', error);
            } finally {
                setIsCheckingStatus(false);
            }
        };

        checkStatus();
    }, []);

    // Обработчик смены вкладки
    const handleTabChange = (key) => {
        setActiveTab(key);
        setVisitedTabs(prev => new Set([...prev, key]));
    };

    // Обработчик нажатия на кнопку запуска/остановки
    const handleServiceButtonClick = () => {
        if (isServiceRunning) {
            setIsStopModalOpen(true);
        } else {
            setIsStartModalOpen(true);
        }
    };

    // Обработчик подтверждения запуска
    const handleStartConfirm = async () => {
        console.log('handleStartConfirm: начало выполнения');
        setIsActionLoading(true); // Блокируем кнопку
        setStartStatus('Подготовка к запуску...'); // Устанавливаем начальный статус

        try {
            // Настраиваем коллбэки для обработки событий WebSocket ПЕРЕД запуском
            startServiceRef.current.setCallbacks({
                onStatus: (step, msg) => {
                    console.log('WebSocket onStatus:', step, msg);
                    // Приоритет отдаём сообщению от сервера (msg)
                    // Если msg не передано, используем fallback-сообщения
                    if (msg) {
                        setStartStatus(msg);
                    } else {
                        const statusMessages = {
                            'checking_subscription': 'Проверка подписки...',
                            'starting_deblocker': 'Запуск деблокировщика...',
                            'initializing_service': 'Инициализация сервиса...',
                            'loading_user_data': 'Загрузка данных пользователя...',
                            'parsing_tokens': 'Разбор токенов ботов...',
                            'loading_contacts': 'Загрузка контактов...',
                            'loading_access_time': 'Загрузка времени доступа...',
                            'loading_proxy_list': 'Загрузка списка прокси...',
                            'creating_contacts_map': 'Создание карты контактов...',
                            'creating_bots': 'Создание ботов...',
                            'creating_assistant': 'Создание модели ассистента...',
                            'registering_handlers': 'Регистрация обработчиков...',
                            'initializing_client': 'Инициализация клиента Telegram...',
                            'starting_haunting': 'Запуск процесса обработки...',
                            'updating_db_status': 'Обновление статуса в БД...',
                            'clearing_old_events': 'Очистка старых событий...',
                            'service_started': 'Сервис запущен!',
                        };
                        setStartStatus(statusMessages[step] || step);
                    }
                },

                onProgress: (step, msg) => {
                    console.log('WebSocket onProgress:', step, msg);

                    // Специальная обработка для проверки прокси
                    if (step === 'proxy_check') {
                        setStartStatus(msg || 'Проверка MTProxy...');
                    } else if (step === 'creating_bots') {
                        // Обработка прогресса создания ботов
                        setStartStatus(msg || `Прогресс: ${step}`);
                    } else {
                        // Общая обработка прогресса
                        setStartStatus(msg || `Прогресс: ${step}`);
                    }
                },

                onBotStarting: (botId, msg) => {
                    console.log('WebSocket onBotStarting:', botId, msg);
                    // Уведомление о начале инициализации конкретного бота
                    setStartStatus(`Бот #${botId}: ${msg || 'инициализация...'}`);
                },
                onBotCreated: (botId, msg) => {
                    console.log('WebSocket onBotCreated:', botId, msg);
                    // Уведомление о создании конкретного бота
                    setStartStatus(`Бот #${botId}: ${msg || 'создан'}`);
                },
                onBotStarted: (botId, msg) => {
                    console.log('WebSocket onBotStarted:', botId, msg);
                    // Уведомление о запуске конкретного бота
                    setStartStatus(`Бот #${botId}: ${msg || 'запущен'}`);
                },

                onBotError: (botId, error) => {
                    console.warn('WebSocket onBotError:', botId, error);
                    // Ошибка конкретного бота (не фатальная) - показываем предупреждение
                    message.warning(`Бот #${botId}: ${error}`, 5);
                    setStartStatus(`Бот #${botId}: ошибка - ${error}`);
                    // НЕ закрываем модальное окно - другие боты продолжают запускаться
                },

                onCompleted: (step, data) => {
                    console.log('WebSocket onCompleted:', step, data);
                    // Успешное завершение
                    setIsServiceRunning(true);
                    const totalContacts = data?.total_contacts || 0;
                    showNotification('Успешно', `Сервис запущен! Контактов в обработке: ${totalContacts}`);

                    // Обновляем информацию о ботах в таблице
                    if (botsRef.current && botsRef.current.refreshBots) {
                        botsRef.current.refreshBots();
                    }

                    // Обновляем информацию о прокси в таблице
                    if (proxyDataRef.current && proxyDataRef.current.refreshProxyData) {
                        proxyDataRef.current.refreshProxyData();
                    }

                    // Закрываем модальное окно только после успешного завершения
                    // Небольшая задержка, чтобы пользователь успел увидеть финальный статус
                    setTimeout(() => {
                        setIsStartModalOpen(false);
                        setIsActionLoading(false);
                        setStartStatus('');
                    }, 1500);
                },

                onError: (error) => {
                    console.error('WebSocket onError:', error);
                    // Обработка ошибок
                    showErrorNotification('Ошибка запуска', error);
                    // Закрываем модальное окно при ошибке
                    setTimeout(() => {
                        setIsStartModalOpen(false);
                        setIsActionLoading(false);
                        setStartStatus('');
                    }, 1500);
                },

                onTimeout: () => {
                    console.log('WebSocket onTimeout');
                    // Обработка таймаута
                    showErrorNotification('Таймаут', 'Превышено время ожидания запуска сервиса');
                    // Закрываем модальное окно при таймауте
                    setTimeout(() => {
                        setIsStartModalOpen(false);
                        setIsActionLoading(false);
                        setStartStatus('');
                    }, 1500);
                },

                onUpdateToken: () => {
                    console.log('WebSocket onUpdateToken');
                    // Обновление токена
                    message.error('Требуется повторная авторизация');
                    setTimeout(() => {
                        setIsStartModalOpen(false);
                        setIsActionLoading(false);
                        setStartStatus('');
                    }, 1500);
                }
            });

            console.log('handleStartConfirm: вызываем startService (без userID)');
            // Запускаем сервис через WebSocket (userID передаётся через токен автоматически)
            const result = await startServiceRef.current.startService();
            console.log('handleStartConfirm: результат startService =', result);

            if (!result) {
                // Если startService вернул false, значит проблема с токеном
                console.error('handleStartConfirm: startService вернул false');
                setTimeout(() => {
                    setIsStartModalOpen(false);
                    setIsActionLoading(false);
                    setStartStatus('');
                }, 1500);
            }
            // Если result === true, WebSocket установлен и события будут приходить через коллбэки
            // Модальное окно останется открытым до получения onCompleted/onError/onTimeout

        } catch (error) {
            console.error('handleStartConfirm: исключение:', error);
            showErrorNotification('Ошибка запуска', error.message || 'Не удалось запустить сервис');
            setTimeout(() => {
                setIsStartModalOpen(false);
                setIsActionLoading(false);
                setStartStatus('');
            }, 1500);
        }
        // НЕ закрываем модальное окно здесь - оно закроется в коллбэках!
    };

    // Обработчик подтверждения остановки
    const handleStopConfirm = async () => {
        setIsActionLoading(true); // Блокируем кнопку
        try {
            const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
            if (!token) {
                message.error('Ошибка аутентификации');
                return;
            }

            // Вызов API для остановки сервиса
            const response = await stopService(token);

            if (response.success) {
                // После успешной остановки обновляем состояние
                setIsServiceRunning(false);
                showNotification('Успешно', 'Сервис успешно остановлен');
            } else {
                // Передаём текст ошибки от сервера
                showErrorNotification('Ошибка остановки', response.error || 'Не удалось остановить сервис');
            }
        } catch (error) {
            console.error('Ошибка при остановке сервиса:', error);
            showErrorNotification('Ошибка остановки', error.message || 'Не удалось остановить сервис');
        } finally {
            // Небольшая задержка, чтобы пользователь успел увидеть уведомление
            setTimeout(() => {
                setIsStopModalOpen(false); // Закрываем ПРАВИЛЬНОЕ модальное окно
                setIsActionLoading(false);
            }, 1000);
        }
    };

    // Обработчик отмены
    const handleCancel = () => {
        setIsStartModalOpen(false);
        setIsStopModalOpen(false);
    };

    // Функция для запуска тура
    const startTour = () => {
        setTourVisible(true);
        setCurrent(0);
        setTourPanelState('createservice', false);
    };

    // Функция для показа панели Tour при клике на FloatButton
    const showTourPanel = () => {
        setTourPanelVisible(true);
        setTourPanelState('createservice', true);
    };

    // Функция для скрытия панели Tour
    const hideTourPanel = () => {
        setTourPanelVisible(false);
        setTourPanelState('createservice', false);
    };

    // Шаги Tour для CreateService
    const steps = [
        {
            title: '🚀 Добро пожаловать в Лидогенератор',
            description: 'Этот сервис поможет вам автоматизировать поиск лидов через мессенджеры с помощью AI агента. Давайте познакомимся с основными возможностями!',
            target: () => (servicesHeaderRef.current instanceof HTMLElement ? servicesHeaderRef.current : null),
        },
        {
            title: '▶️ Управление сервисом',
            description: 'Здесь вы можете запустить или остановить работу сервиса поиска лидов. Убедитесь, что все параметры настроены корректно перед запуском.',
            target: () => (startButtonRef.current instanceof HTMLElement ? startButtonRef.current : null),
        },
        {
            title: '📋 Вкладки настроек',
            description: 'Используйте вкладки для настройки всех компонентов сервиса. В них вы найдете: Модель агента (настройка AI), Боты (подключение мессенджеров), Контакты (база для рассылки), Расписание (время работы) и Статистику (результаты работы).',
            target: () => (tabsRef.current instanceof HTMLElement ? tabsRef.current : null),
        },
        {
            title: '🧩 Компоненты во вкладках',
            // Обзор всех компонентов внутри tabItems
            description: (
                <div>
                    <div style={{ marginBottom: 8 }}>Состав вкладок и что внутри каждой:</div>
                    <ul style={{ paddingLeft: 18 }}>
                        <li><strong>Модель агента</strong> — компонент ServiceModelData: имя модели, системный промпт, стартовое и целевое сообщения, целевая Telegram‑группа; создать/изменить/удалить.</li>
                        <li><strong>Боты</strong> — компонент Bots: список Telegram user‑ботов, активация, редактирование параметров, QR‑авторизация и ввод пароля, удаление.</li>
                        <li><strong>Прокси</strong> — компонент ProxyData: список MTProxy серверов, добавление/редактирование/удаление прокси, переключение активности, проверка статуса.</li>
                        <li><strong>Контакты</strong> — компонент ServiceContactsData: добавление вручную и из файла, статусы контактов, удаление одного/всех, сохранение, просмотр истории диалога для ответивших.</li>
                        <li><strong>Расписание</strong> — компонент Schedule: настройка интервалов по дням недели, быстрые действия (Пн‑Пт, Все дни, Очистить), сохранение.</li>
                        <li><strong>Статистика</strong> — компонент Events: события ботов в реальном времени, фильтры, пагинация, обновление.</li>
                    </ul>
                </div>
            ),
            target: () => (tabsRef.current instanceof HTMLElement ? tabsRef.current : null),
        },
        {
            title: '🤖 Модель агента',
            description: 'В первой вкладке настраивается AI агент: его личность, цели диалога, инструкции и база знаний. Это основа работы вашего лидогенератора.',
            target: () => (tabsRef.current instanceof HTMLElement ? tabsRef.current : null),
            tabKey: 'model'
        },
        {
            title: '🔌 Подключение ботов',
            description: 'Во второй вкладке подключите и настройте ботов для различных мессенджеров (Telegram, WhatsApp и др.). Боты будут использоваться для автоматической коммуникации с потенциальными лидами.',
            target: () => (tabsRef.current instanceof HTMLElement ? tabsRef.current : null),
            tabKey: 'bots'
        },
        {
            title: '☁️ Настройка прокси',
            description: 'В третьей вкладке настройте прокси-серверы для ботов. Это поможет обойти блокировки и ограничить риски. Рекомендуется использовать надежные прокси.',
            target: () => (tabsRef.current instanceof HTMLElement ? tabsRef.current : null),
            tabKey: 'proxy'
        },
        {
            title: '📇 База контактов',
            description: 'В четвертой вкладке загрузите и управляйте базой контактов для рассылки. Можно импортировать контакты из файлов или добавлять вручную.',
            target: () => (tabsRef.current instanceof HTMLElement ? tabsRef.current : null),
            tabKey: 'contacts'
        },
        {
            title: '⏰ Расписание работы',
            description: 'В пятой вкладке настройте расписание автоматической рассылки: дни недели, время работы и интервалы между сообщениями.',
            target: () => (tabsRef.current instanceof HTMLElement ? tabsRef.current : null),
            tabKey: 'schedule'
        },
        {
            title: '📊 Статистика и события',
            description: 'В последней вкладке отслеживайте результаты работы сервиса: количество отправленных сообщений, полученные ответы, достигнутые цели и другие важные метрики.',
            target: () => (tabsRef.current instanceof HTMLElement ? tabsRef.current : null),
            tabKey: 'statistics'
        },
        {
            title: '✅ Готово к работе!',
            description: 'Теперь вы знаете все основные возможности Лидогенератора. Настройте параметры и запустите сервис для начала автоматического поиска лидов!',
            target: () => (servicesHeaderRef.current instanceof HTMLElement ? servicesHeaderRef.current : null),
        },
    ];

    const tabItems = [
        {
            key: 'model',
            label: (
                <span>
                    <RobotOutlined />&nbsp;Модель агента
                </span>
            ),
            children: visitedTabs.has('model') ? (
                <div className="form-section model-name-section">
                    <div style={{padding: '16px 0'}}>
                        <ServiceModelData />
                    </div>
                </div>
            ) : null,
        },
        {
            key: 'bots',
            label: (
                <span>
                    <ApiOutlined />&nbsp;Боты
                </span>
            ),
            children: visitedTabs.has('bots') ? (
                <div className="form-section model-name-section">
                    <div style={{padding: '16px 0'}}>
                        <Bots ref={botsRef}/>
                    </div>
                </div>
            ) : null,
        },
        {
            key: 'proxy',
            label: (
                <span>
                    <CloudServerOutlined />&nbsp;Прокси
                </span>
            ),
            children: visitedTabs.has('proxy') ? (
                <div className="form-section model-name-section">
                    <div style={{padding: '16px 0'}}>
                        <ProxyData ref={proxyDataRef}/>
                    </div>
                </div>
            ) : null,
        },
        {
            key: 'contacts',
            label: (
                <span>
                    <ContactsOutlined />&nbsp;Контакты
                </span>
            ),
            children: visitedTabs.has('contacts') ? (
                <div className="form-section model-name-section">
                    <div style={{padding: '16px 0'}}>
                        <ServiceContactsData />
                    </div>
                </div>
            ) : null,
        },
        {
            key: 'schedule',
            label: (
                <span>
                    <ClockCircleOutlined />&nbsp;Расписание
                </span>
            ),
            children: visitedTabs.has('schedule') ? (
                <div className="form-section model-name-section">
                    <div style={{padding: '16px 0'}}>
                        <Schedule/>
                    </div>
                </div>
            ) : null,
        },
        {
            key: 'statistics',
            label: (
                <span>
                    <BarChartOutlined />&nbsp;Статистика
                </span>
            ),
            children: visitedTabs.has('statistics') ? (
                <div className="form-section model-name-section">
                    <div style={{padding: '16px 0'}}>
                        <Events/>
                    </div>
                </div>
            ) : null,
        },
    ];

    return (
        <div className="create-model-container">
            <div className="section-title logs-header" ref={servicesHeaderRef}>
                <GrServices/>
                Лидогенератор
            </div>
            <div className="section-description">
                Сервис поиска лидов через мессенджеры с помощью AI агента.
            </div>

            {/* Оборачиваем кнопку в DOM-контейнер с ref для Tour */}
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'left' }} ref={startButtonRef}>
                <Button
                    type={isServiceRunning ? "default" : "primary"}
                    size="large"
                    icon={isServiceRunning ? <StopOutlined /> : <PlayCircleOutlined />}
                    onClick={handleServiceButtonClick}
                    danger={isServiceRunning}
                    loading={isCheckingStatus || isActionLoading}
                    disabled={isActionLoading}
                    style={{ minWidth: 200, height: 48, fontSize: 16 }}
                >
                    {isServiceRunning ? 'Остановить работу' : 'Запуск сервиса'}
                </Button>
            </div>

            <div className="tour-layout">
                <div className="tour-content">
                    {/* Оборачиваем Tabs в DOM-контейнер с ref для Tour */}
                    <div ref={tabsRef}>
                        <Tabs
                            activeKey={activeTab}
                            onChange={handleTabChange}
                            items={tabItems}
                            type="card"
                            size="large"
                        />
                    </div>
                </div>

                {/* Панель управления Tour справа */}
                {tourPanelVisible && (
                    <div className="tour-controls tour-primary">
                        <div className="tour-controls-header">
                            <PlayCircleOutlined className="tour-controls-icon" />
                            <h3 className="tour-controls-title">
                                Интерактивный обзор
                            </h3>
                            <p className="tour-controls-subtitle">
                                Изучите возможности лидогенератора
                            </p>
                        </div>

                        <div className="tour-start-button">
                            <Button
                                type="primary"
                                block
                                size="large"
                                onClick={startTour}
                            >
                                🚀 Начать тур
                            </Button>
                        </div>

                        {tourVisible && (
                            <div className="tour-progress">
                                <div className="tour-progress-step">
                                    <span className="tour-progress-step-text">
                                        Шаг {current + 1} из {steps.length}
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
                            <div className="tour-info-title">📋 Что вы изучите:</div>
                            <ul className="tour-info-list">
                                <li>Управление запуском сервиса</li>
                                <li>Настройку AI агента</li>
                                <li>Подключение ботов</li>
                                <li>Работу с контактами</li>
                                <li>Настройку расписания</li>
                                <li>Просмотр статистики</li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>

            {/* Модальное окно подтверждения запуска */}
            <Modal
                title={
                    <span>
                        <PlayCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                        Запустить поиск лидов?
                    </span>
                }
                open={isStartModalOpen}
                onOk={handleStartConfirm}
                onCancel={handleCancel}
                okText="Запуск"
                cancelText="Отмена"
                okButtonProps={{
                    style: { color: 'black' },
                    type: "primary",
                    icon: <PlayCircleOutlined />,
                    loading: isActionLoading
                }}
                cancelButtonProps={{
                    disabled: isActionLoading
                }}
                closable={!isActionLoading}
                maskClosable={!isActionLoading}
            >
                <p>Вы собираетесь запустить сервис поиска лидов.</p>
                <p>Убедитесь, что все параметры настроены корректно:</p>
                <ul>
                    <li>Модель агента настроена</li>
                    <li>Боты подключены и активны</li>
                    <li>MTProxy добавлены</li>
                    <li>Контакты загружены</li>
                    <li>Расписание установлено</li>
                </ul>
                {startStatus && (
                    <div style={{
                        marginTop: 16,
                        padding: '12px 16px',
                        // background: '#f0f5ff',
                        borderRadius: 4,
                        border: '1px solid #d6e4ff'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 14, color: 'var(--link-hover-color)', fontWeight: 500 }}>
                                ⏳ {startStatus}
                            </span>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Модальное окно подтверждения остановки */}
            <Modal
                title={
                    <span>
                        <ExclamationCircleOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
                        Остановить работу сервиса?
                    </span>
                }
                open={isStopModalOpen}
                onOk={handleStopConfirm}
                onCancel={handleCancel}
                okText="Остановить"
                cancelText="Отмена"
                okButtonProps={{
                    danger: true,
                    icon: <StopOutlined />,
                    loading: isActionLoading
                }}
                cancelButtonProps={{
                    disabled: isActionLoading
                }}
                closable={!isActionLoading}
                maskClosable={!isActionLoading}
            >
                <p>Вы собираетесь остановить работу сервиса поиска лидов.</p>
                <p>Все активные процессы будут остановлены.</p>
            </Modal>

            <FloatButton
                icon={<QuestionCircleOutlined />}
                tooltip="Начать обзор интерфейса"
                className="tour-float-button"
                onClick={showTourPanel}
            />

            <Tour
                open={tourVisible}
                onClose={() => {
                    setTourVisible(false);
                    setCurrent(0);
                    hideTourPanel();
                }}
                steps={steps}
                current={current}
                onChange={(next) => {
                    setCurrent(next);
                    const tabKey = steps[next]?.tabKey;
                    if (tabKey) {
                        setActiveTab(tabKey);
                        setVisitedTabs(prev => new Set([...prev, tabKey]));
                    }
                }}
                indicatorsRender={(current, total) => (
                    <span className="tour-indicator">
                        {current + 1} / {total}
                    </span>
                )}
                type="primary"
                arrow={false}
            />
        </div>
    );
}
