import React, {useEffect, useRef, useState} from "react";
import {
    Button,
    FloatButton,
    Modal,
    Tour,
    Tabs,
    message
} from 'antd';
import {
    PlayCircleOutlined,
    QuestionCircleOutlined,
    ExclamationCircleOutlined,
    RobotOutlined,
    ContactsOutlined,
    ClockCircleOutlined,
    BarChartOutlined,
    ApiOutlined,
    StopOutlined,
    CloudServerOutlined,
    DeleteOutlined
} from '@ant-design/icons';
import {useTranslation} from 'react-i18next';
import {LeadSchedule} from "./LeadHunter/leadSchedule";
import {ServiceModelData} from "./LeadHunter/leadModelData";
import {ServiceContactsData} from "./LeadHunter/leadContacts";
import {LeadBots} from "./LeadHunter/leadBots";
import {LeadEvents} from "./LeadHunter/leadEvents";
import {LeadProxyData} from "./LeadHunter/leadProxyData";
import {checkServiceInProcess, stopService, readServiceAllBotInfo} from "./LeadHunter/leadUtils";
import {showNotification, showErrorNotification} from "../../hotification/showNotification";
import {getTourPanelState, setTourPanelState} from "../../../utils/cookieUtils";
import {LeadStartService} from "./LeadHunter/leadStartService";
import {DelService} from "./serviceUtils";

export function LeadHunterService({ onServiceDeleted }) {
    const {t} = useTranslation();

    // Refs для Tour targets
    const servicesHeaderRef = useRef(null);
    // Используем refs на DOM-контейнеры, а не на компоненты AntD
    const startButtonRef = useRef(null);
    const tabsRef = useRef(null);

    // Ref для сервиса запуска
    const startServiceRef = useRef(null);

    // Ref для компонента LeadBots
    const botsRef = useRef(null);

    // Ref для компонента LeadProxyData
    const proxyDataRef = useRef(null);

    // Ref для компонента ServiceContactsData
    const contactsRef = useRef(null);

    const [activeTab, setActiveTab] = useState('model');
    const [visitedTabs, setVisitedTabs] = useState(new Set(['model'])); // Начальная вкладка сразу помечена как посещенная
    const [isServiceRunning, setIsServiceRunning] = useState(false);
    const [isStartModalOpen, setIsStartModalOpen] = useState(false);
    const [isStopModalOpen, setIsStopModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isCheckingStatus, setIsCheckingStatus] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false); // Новое состояние для блокировки кнопки
    const [startStatus, setStartStatus] = useState(''); // Текущий статус запуска
    const [activeTelegramBots, setActiveTelegramBots] = useState(null);

    // Tour states
    const [tourVisible, setTourVisible] = useState(false);
    const [current, setCurrent] = useState(0);
    const [tourPanelVisible, setTourPanelVisible] = useState(getTourPanelState('createservice'));

    // Инициализация сервиса при монтировании компонента
    useEffect(() => {
        startServiceRef.current = new LeadStartService();

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
            if (typeof window === 'undefined') return;
            setIsCheckingStatus(true);
            try {
                const isRunning = await checkServiceInProcess();
                setIsServiceRunning(isRunning);
            } catch (error) {
                console.error(t("serviceCheckError") || 'Ошибка при проверке статуса сервиса:', error);
            } finally {
                setIsCheckingStatus(false);
            }
        };

        checkStatus();
    }, [t]);

    // Загружаем ботов независимо от того, открывалась ли вкладка «Боты».
    // Иначе botsRef ещё пуст, пока вкладка не была посещена.
    useEffect(() => {
        let cancelled = false;
        readServiceAllBotInfo()
            .then((data) => {
                if (cancelled) return;
                const bots = Array.isArray(data?.bots) ? data.bots : [];
                setActiveTelegramBots(bots.filter(bot =>
                    String(bot.Provider || bot.provider || '').toLowerCase() === 'telegram' &&
                    Number(bot.IsActive) === 1
                ).length);
            })
            .catch(() => {
                if (!cancelled) setActiveTelegramBots(0);
            });
        return () => { cancelled = true; };
    }, []);

    // Обработчик смены вкладки
    const handleTabChange = (key) => {
        setActiveTab(key);
        setVisitedTabs(prev => new Set([...prev, key]));
    };

    // Обработчик выбора сервиса
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
        setIsActionLoading(true); // Блокируем кнопку
        setStartStatus(t("serviceStarting") || 'Подготовка к запуску...'); // Устанавливаем начальный статус

        // Флаг для предотвращения дублирования уведомлений об ошибке
        let errorHandled = false;

        try {
            // Настраиваем коллбэки для обработки событий WebSocket ПЕРЕД запуском
            startServiceRef.current.setCallbacks({
                onStatus: (step, msg) => {
                    // Обработка ошибки запуска
                    if (step === 'service_start_failed') {
                        if (!errorHandled) {
                            errorHandled = true;
                            showErrorNotification(
                                t("serviceStartFailed") || 'Ошибка запуска сервиса',
                                msg || (t("serviceStartError") || 'Не удалось запустить сервис')
                            );
                            setTimeout(() => {
                                setIsStartModalOpen(false);
                                setIsActionLoading(false);
                                setStartStatus('');
                            }, 1500);
                        }
                        return;
                    }

                    // Приоритет отдаём сообщению от сервера (msg)
                    // Если msg не передано, используем fallback-сообщения
                    if (msg) {
                        setStartStatus(msg);
                    } else {
                        const statusMessages = {
                            'checking_subscription': t("serviceStatusChecking"),
                            'starting_deblocker': t("serviceStatusDeblocker"),
                            'initializing_service': t("serviceStatusInit"),
                            'loading_user_data': t("serviceStatusUserData"),
                            'parsing_tokens': t("serviceStatusTokens"),
                            'loading_contacts': t("serviceStatusContacts"),
                            'loading_access_time': t("serviceStatusAccessTime"),
                            'loading_proxy_list': t("serviceStatusProxyList"),
                            'creating_contacts_map': t("serviceStatusContactsMap"),
                            'creating_bots': t("serviceStatusBots"),
                            'creating_assistant': t("serviceStatusAssistant"),
                            'registering_handlers': t("serviceStatusHandlers"),
                            'initializing_client': t("serviceStatusClient"),
                            'starting_haunting': t("serviceStatusHaunting"),
                            'updating_db_status': t("serviceStatusDb"),
                            'clearing_old_events': t("serviceStatusEvents"),
                            'service_started': t("serviceStatusStarted"),
                        };
                        setStartStatus(statusMessages[step] || step);
                    }
                },

                onProgress: (step, msg) => {
                    // Специальная обработка для проверки прокси
                    if (step === 'proxy_check') {
                        setStartStatus(msg || t("serviceStatusProxyCheck") || 'Проверка proxy...');
                    } else if (step === 'creating_bots') {
                        // Обработка прогресса создания ботов
                        setStartStatus(msg || `${t("progress") || "Прогресс"}: ${step}`);
                    } else {
                        // Общая обработка прогресса
                        setStartStatus(msg || `${t("progress") || "Прогресс"}: ${step}`);
                    }
                },

                onBotStarting: (botId, msg) => {
                    // Уведомление о начале инициализации конкретного бота
                    setStartStatus(`${t("bot") || "Бот"} #${botId}: ${msg || t("serviceBotInit") || 'инициализация...'}`);
                },
                onBotCreated: (botId, msg) => {
                    // Уведомление о создании конкретного бота
                    setStartStatus(`${t("bot") || "Бот"} #${botId}: ${msg || t("serviceBotCreated") || 'создан'}`);
                },
                onBotStarted: (botId, msg) => {
                    // Уведомление о запуске конкретного бота
                    setStartStatus(`${t("bot") || "Бот"} #${botId}: ${msg || t("serviceBotStarted") || 'запущен'}`);
                },

                onBotError: (botId, error) => {
                    console.warn('WebSocket onBotError:', botId, error);
                    // Ошибка конкретного бота (не фатальная) - показываем предупреждение
                    message.warning(`${t("bot") || "Бот"} #${botId}: ${error}`, 5);
                    setStartStatus(`${t("bot") || "Бот"} #${botId}: ${t("error") || "ошибка"} - ${error}`);
                    // НЕ закрываем модальное окно - другие боты продолжают запускаться
                },

                onCompleted: (step, data) => {
                    // Успешное завершение
                    setIsServiceRunning(true);
                    const totalContacts = data?.total_contacts || 0;
                    showNotification(t("success") || 'Успешно', `${t("serviceStartSuccess") || "Сервис запущен! Контактов в обработке:"} ${totalContacts}`);

                    setTimeout(() => {
                        setIsStartModalOpen(false);
                        setIsActionLoading(false);
                        setStartStatus('');
                    }, 1500);
                },

                onError: (error) => {
                    console.error('WebSocket onError:', error);
                    // Обработка ошибок только если она еще не была обработана в onStatus
                    if (!errorHandled) {
                        errorHandled = true;
                        showErrorNotification(t("serviceStartErrorTitle") || 'Ошибка запуска', error);
                        setTimeout(() => {
                            setIsStartModalOpen(false);
                            setIsActionLoading(false);
                            setStartStatus('');
                        }, 1500);
                    }
                },

                onTimeout: () => {
                    // Обработка таймаута
                    showErrorNotification(t("serviceStartTimeoutTitle") || 'Таймаут', t("serviceStartTimeout") || 'Превышено время ожидания запуска сервиса');
                    setTimeout(() => {
                        setIsStartModalOpen(false);
                        setIsActionLoading(false);
                        setStartStatus('');
                    }, 1500);
                },

                onUpdateToken: () => {
                    // Обновление токена
                    message.error(t("serviceRequireAuth") || 'Требуется повторная авторизация');
                    setTimeout(() => {
                        setIsStartModalOpen(false);
                        setIsActionLoading(false);
                        setStartStatus('');
                    }, 1500);
                }
            });

            // Запускаем сервис через WebSocket (userID передаётся через токен автоматически)
            const result = await startServiceRef.current.startService();

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
            showErrorNotification(t("serviceStartErrorTitle") || 'Ошибка запуска', error.message || (t("serviceStartError") || 'Не удалось запустить сервис'));
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
            // Вызов API для остановки сервиса
            const response = await stopService();

            if (response.success) {
                // После успешной остановки обновляем состояние
                setIsServiceRunning(false);
                showNotification(t("success") || 'Успешно', t("serviceStopSuccess") || 'Сервис успешно остановлен');

                // ...existing code...
            } else {
                // Передаём текст ошибки от сервера
                showErrorNotification(t("serviceStopErrorTitle") || 'Ошибка остановки', response.error || (t("serviceStopError") || 'Не удалось остановить сервис'));
            }
        } catch (error) {
            console.error(t("serviceStopErrorTitle") || 'Ошибка при остановке сервиса:', error);
            showErrorNotification(t("serviceStopErrorTitle") || 'Ошибка остановки', error.message || (t("serviceStopError") || 'Не удалось остановить сервис'));
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
        setIsDeleteModalOpen(false);
    };

    // Обработчик открытия модального окна удаления
    const handleDeleteClick = () => {
        setIsDeleteModalOpen(true);
    };

    // Обработчик подтверждения удаления
    const handleDeleteConfirm = async () => {
        try {
            const response = await DelService("lead-haunter");
            if (response.ok) {
                setIsDeleteModalOpen(false);
                showNotification(
                    t("success") || 'Успешно',
                    t("serviceDeleted") || 'Сервис успешно удалён'
                );
                // Вызываем callback для возврата к списку сервисов
                if (onServiceDeleted) {
                    onServiceDeleted();
                }
            } else {
                throw new Error("Failed to delete service");
            }
        } catch (error) {
            setIsDeleteModalOpen(false);
            showErrorNotification(
                t("error") || 'Ошибка',
                t("serviceDeleteError") || 'Не удалось удалить сервис'
            );
        }
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
            title: t("serviceTourWelcome") || '🚀 Добро пожаловать в Лидогенератор',
            description: t("serviceTourWelcomeDesc") || 'Этот сервис поможет вам автоматизировать поиск лидов через мессенджеры с помощью AI агента. Давайте познакомимся с основными возможностями!',
            target: () => (servicesHeaderRef.current instanceof HTMLElement ? servicesHeaderRef.current : null),
        },
        {
            title: t("serviceTourControl") || '▶️ Управление сервисом',
            description: t("serviceTourControlDesc") || 'Здесь вы можете запустить или остановить работу сервиса поиска лидов. Убедитесь, что все параметры настроены корректно перед запуском.',
            target: () => (startButtonRef.current instanceof HTMLElement ? startButtonRef.current : null),
        },
        {
            title: t("serviceTourTabs") || '📋 Вкладки настроек',
            description: t("serviceTourTabsDesc") || 'Используйте вкладки для настройки всех компонентов сервиса. В них вы найдете: Модель агента (настройка AI), Боты (подключение мессенджеров), Контакты (база для рассылки), Расписание (время работы) и Статистику (результаты работы).',
            target: () => (tabsRef.current instanceof HTMLElement ? tabsRef.current : null),
        },
        {
            title: t("serviceTourComponents") || '🧩 Компоненты во вкладках',
            // Обзор всех компонентов внутри tabItems
            description: (
                <div>
                    <div style={{ marginBottom: 8 }}>{t("serviceTourComponentsIntro") || "Состав вкладок и что внутри каждой:"}</div>
                    <ul style={{ paddingLeft: 18 }}>
                        <li><strong>{t("serviceTabModel") || "Модель агента"}</strong> — {t("serviceTourComponentsModel") || "компонент ServiceModelData: имя модели, системный промпт, стартовое и целевое сообщения, целевая Telegram‑группа; создать/изменить/удалить."}</li>
                        <li><strong>{t("serviceTabBots") || "Боты"}</strong> — {t("serviceTourComponentsBots") || "компонент LeadBots: список Telegram user‑ботов, активация, редактирование параметров, QR‑авторизация и ввод пароля, удаление."}</li>
                        <li><strong>{t("serviceTabProxy") || "Прокси"}</strong> — {t("serviceTourComponentsProxy") || "компонент LeadProxyData: список proxy серверов, добавление/редактирование/удаление прокси, переключение активности, проверка статуса."}</li>
                        <li><strong>{t("serviceTabContacts") || "Контакты"}</strong> — {t("serviceTourComponentsContacts") || "компонент ServiceContactsData: добавление вручную и из файла, статусы контактов, удаление одного/всех, сохранение, просмотр истории диалога для ответивших."}</li>
                        <li><strong>{t("serviceTabSchedule") || "Расписание"}</strong> — {t("serviceTourComponentsSchedule") || "компонент LeadSchedule: настройка интервалов по дням недели, быстрые действия (Пн‑Пт, Все дни, Очистить), сохранение."}</li>
                        <li><strong>{t("serviceTabStatistics") || "Статистика"}</strong> — {t("serviceTourComponentsStats") || "компонент LeadEvents: события ботов в реальном времени, фильтры, пагинация, обновление."}</li>
                    </ul>
                </div>
            ),
            target: () => (tabsRef.current instanceof HTMLElement ? tabsRef.current : null),
        },
        {
            title: t("serviceTourModelTab") || '🤖 Модель агента',
            description: t("serviceTourModelTabDesc") || 'В первой вкладке настраивается AI агент: его личность, цели диалога, инструкции и база знаний. Это основа работы вашего лидогенератора.',
            target: () => (tabsRef.current instanceof HTMLElement ? tabsRef.current : null),
            tabKey: 'model'
        },
        {
            title: t("serviceTourBotsTab") || '🔌 Подключение ботов',
            description: t("serviceTourBotsTabDesc") || 'Во второй вкладке подключите и настройте ботов для различных мессенджеров (Telegram, WhatsApp и др.). Боты будут использоваться для автоматической коммуникации с потенциальными лидами.',
            target: () => (tabsRef.current instanceof HTMLElement ? tabsRef.current : null),
            tabKey: 'bots'
        },
        {
            title: t("serviceTourProxyTab") || '☁️ Настройка прокси',
            description: t("serviceTourProxyTabDesc") || 'В третьей вкладке настройте прокси-серверы для ботов. Это поможет обойти блокировки и ограничить риски. Рекомендуется использовать надежные прокси.',
            target: () => (tabsRef.current instanceof HTMLElement ? tabsRef.current : null),
            tabKey: 'proxy'
        },
        {
            title: t("serviceTourContactsTab") || '📇 База контактов',
            description: t("serviceTourContactsTabDesc") || 'В четвертой вкладке загрузите и управляйте базой контактов для рассылки. Можно импортировать контакты из файлов или добавлять вручную.',
            target: () => (tabsRef.current instanceof HTMLElement ? tabsRef.current : null),
            tabKey: 'contacts'
        },
        {
            title: t("serviceTourScheduleTab") || '⏰ Расписание работы',
            description: t("serviceTourScheduleTabDesc") || 'В пятой вкладке настройте расписание автоматической рассылки: дни недели, время работы и интервалы между сообщениями.',
            target: () => (tabsRef.current instanceof HTMLElement ? tabsRef.current : null),
            tabKey: 'schedule'
        },
        {
            title: t("serviceTourStatsTab") || '📊 Статистика и события',
            description: t("serviceTourStatsTabDesc") || 'В последней вкладке отслеживайте результаты работы сервиса: количество отправленных сообщений, полученные ответы, достигнутые цели и другие важные метрики.',
            target: () => (tabsRef.current instanceof HTMLElement ? tabsRef.current : null),
            tabKey: 'statistics'
        },
        {
            title: t("serviceTourReady") || '✅ Готово к работе!',
            description: t("serviceTourReadyDesc") || 'Теперь вы знаете все основные возможности Лидогенератора. Настройте параметры и запустите сервис для начала автоматического поиска лидов!',
            target: () => (servicesHeaderRef.current instanceof HTMLElement ? servicesHeaderRef.current : null),
        },
    ];

    const tabItems = [
        {
            key: 'model',
            label: (
                <span>
                    <RobotOutlined />&nbsp;{t("serviceTabModel") || "Модель агента"}
                </span>
            ),
            children: visitedTabs.has('model') ? (
                <div className="form-section model-name-section">
                    <div style={{padding: '16px 0'}}>
                        <ServiceModelData isServiceRunning={isServiceRunning} />
                    </div>
                </div>
            ) : null,
        },
        {
            key: 'bots',
            label: (
                <span>
                    <ApiOutlined />&nbsp;{t("serviceTabBots") || "Боты"}
                </span>
            ),
            children: visitedTabs.has('bots') ? (
                <div className="form-section model-name-section">
                    <div style={{padding: '16px 0'}}>
                        <LeadBots ref={botsRef}/>
                    </div>
                </div>
            ) : null,
        },
        {
            key: 'proxy',
            label: (
                <span>
                    <CloudServerOutlined />&nbsp;{t("serviceTabProxy") || "Прокси"}
                </span>
            ),
            children: visitedTabs.has('proxy') ? (
                <div className="form-section model-name-section">
                    <div style={{padding: '16px 0'}}>
                        <LeadProxyData ref={proxyDataRef}/>
                    </div>
                </div>
            ) : null,
        },
        {
            key: 'contacts',
            label: (
                <span>
                    <ContactsOutlined />&nbsp;{t("serviceTabContacts") || "Контакты"}
                </span>
            ),
            children: visitedTabs.has('contacts') ? (
                <div className="form-section model-name-section">
                    <div style={{padding: '16px 0'}}>
                        <ServiceContactsData ref={contactsRef} />
                    </div>
                </div>
            ) : null,
        },
        {
            key: 'schedule',
            label: (
                <span>
                    <ClockCircleOutlined />&nbsp;{t("serviceTabSchedule") || "Расписание"}
                </span>
            ),
            children: visitedTabs.has('schedule') ? (
                <div className="form-section model-name-section">
                    <div style={{padding: '16px 0'}}>
                        <LeadSchedule/>
                    </div>
                </div>
            ) : null,
        },
        {
            key: 'statistics',
            label: (
                <span>
                    <BarChartOutlined />&nbsp;{t("serviceTabStatistics") || "Статистика"}
                </span>
            ),
            children: visitedTabs.has('statistics') ? (
                <div className="form-section model-name-section">
                    <div style={{padding: '16px 0'}}>
                        <LeadEvents/>
                    </div>
                </div>
            ) : null,
        },
    ];

    return (
        <div style={{ position: 'relative' }}>
            {/* Кнопка удаления сервиса в правом верхнем углу */}
            <div
                onClick={handleDeleteClick}
                title={t("serviceDelete") || "Удалить сервис"}
                style={{
                    position: 'absolute',
                    top: '0',
                    right: '0',
                    cursor: 'pointer',
                    fontSize: '20px',
                    color: '#ff4d4f',
                    zIndex: 10,
                    padding: '8px',
                    borderRadius: '4px',
                    transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#fff1f0';
                    e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.transform = 'scale(1)';
                }}
            >
                <DeleteOutlined />
            </div>

            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'flex-start' }} ref={startButtonRef}>
                <Button
                    type={isServiceRunning ? "default" : "primary"}
                    size="large"
                    icon={isServiceRunning ? <StopOutlined /> : <PlayCircleOutlined />}
                    onClick={handleServiceButtonClick}
                    danger={isServiceRunning}
                    loading={isCheckingStatus || isActionLoading}
                    style={{ minWidth: 200, height: 48, fontSize: 16 }}
                >
                    {isServiceRunning ? (t("serviceStop") || 'Остановить работу') : (t("serviceStart") || 'Запуск сервиса')}
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
                                        {t("serviceTourTitle") || "Интерактивный обзор"}
                                    </h3>
                                    <p className="tour-controls-subtitle">
                                        {t("serviceTourSubtitle") || "Изучите возможности лидогенератора"}
                                    </p>
                                </div>

                                <div className="tour-start-button">
                                    <Button
                                        type="primary"
                                        block
                                        size="large"
                                        onClick={startTour}
                                    >
                                        {t("serviceTourStart") || "🚀 Начать тур"}
                                    </Button>
                                </div>

                                {tourVisible && (
                                    <div className="tour-progress">
                                        <div className="tour-progress-step">
                                    <span className="tour-progress-step-text">
                                        {t("notifTourStep") || "Шаг"} {current + 1} {t("notifTourOf") || "из"} {steps.length}
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
                                    <div className="tour-info-title">{t("serviceTourWhatYouLearn") || "📋 Что вы изучите:"}</div>
                                    <ul className="tour-info-list">
                                        <li>{t("serviceTourLearn1") || "Управление запуском сервиса"}</li>
                                        <li>{t("serviceTourLearn2") || "Настройку AI агента"}</li>
                                        <li>{t("serviceTourLearn3") || "Подключение ботов"}</li>
                                        <li>{t("serviceTourLearn4") || "Работу с контактами"}</li>
                                        <li>{t("serviceTourLearn5") || "Настройку расписания"}</li>
                                        <li>{t("serviceTourLearn6") || "Просмотр статистики"}</li>
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
                        {t("serviceStartModalTitle") || "Запустить поиск лидов?"}
                    </span>
                }
                open={isStartModalOpen}
                onOk={handleStartConfirm}
                onCancel={handleCancel}
                okText={t("serviceStartModalOk") || "Запуск"}
                cancelText={t("cancel") || "Отмена"}
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
                mask={{ closable: !isActionLoading }}
            >
                {/* Предупреждение при отсутствии активных Telegram ботов */}
                {(() => {
                    const refBots = botsRef.current?.getActiveTelegramBots?.();
                    const botsCount = Array.isArray(refBots) ? refBots.length : activeTelegramBots;
                    if (botsCount === 0) {
                        return (
                            <div style={{
                                marginBottom: 16,
                                padding: '12px 16px',
                                background: '#fff7e6',
                                borderRadius: 4,
                                border: '1px solid #ffd591'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: 16 }}>⚠️</span>
                                    <span style={{ fontSize: 14, color: '#d46b08', fontWeight: 500 }}>
                                        {t("serviceNoTelegramBots") || "Нет ни одного Telegram бота, добавление контакта в целевую телеграм группу невозможно!"}
                                    </span>
                                </div>
                            </div>
                        );
                    }
                    return null;
                })()}

                <p>{t("serviceStartModalText1") || "Вы собираетесь запустить сервис поиска лидов."}</p>
                <p>{t("serviceStartModalText2") || "Убедитесь, что все параметры настроены корректно:"}</p>
                <ul>
                    <li>{t("serviceStartModalParam1") || "Модель агента настроена"}</li>
                    <li>{t("serviceStartModalParam2") || "Боты подключены и активны"}</li>
                    <li>{t("serviceStartModalParam3") || "Proxy добавлены"}</li>
                    <li>{t("serviceStartModalParam4") || "Контакты загружены"}</li>
                    <li>{t("serviceStartModalParam5") || "Расписание установлено"}</li>
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
                        {t("serviceStopModalTitle") || "Остановить работу сервиса?"}
                    </span>
                }
                open={isStopModalOpen}
                onOk={handleStopConfirm}
                onCancel={handleCancel}
                okText={t("serviceStopModalOk") || "Остановить"}
                cancelText={t("cancel") || "Отмена"}
                okButtonProps={{
                    danger: true,
                    icon: <StopOutlined />,
                    loading: isActionLoading
                }}
                cancelButtonProps={{
                    disabled: isActionLoading
                }}
                closable={!isActionLoading}
                mask={{ closable: !isActionLoading }}
            >
                <p>{t("serviceStopModalText1") || "Вы собираетесь остановить работу сервиса поиска лидов."}</p>
                <p>{t("serviceStopModalText2") || "Все активные процессы будут остановлены."}</p>
            </Modal>

            {/* Модальное окно подтверждения удаления */}
            <Modal
                title={
                    <span style={{ color: '#ff4d4f' }}>
                        <ExclamationCircleOutlined /> {t("dialogsConfirmDeleteTitle") || "Подтверждение удаления"}
                    </span>
                }
                open={isDeleteModalOpen}
                onOk={handleDeleteConfirm}
                onCancel={handleCancel}
                okText={t("delete") || "Удалить"}
                cancelText={t("cancel") || "Отмена"}
                okButtonProps={{
                    danger: true
                }}
            >
                <p>
                    {t("serviceDeleteConfirmText") || "Вы уверены, что хотите удалить сервис"} "{t("serviceTitle") || "Лидогенератор"}"?
                </p>
            </Modal>

            <FloatButton
                icon={<QuestionCircleOutlined />}
                tooltip={t("tourFloatButtonTooltip") || "Начать обзор интерфейса"}
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
