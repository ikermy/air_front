import {AddChannel} from "../Channals/addChanal";
import React, {useEffect, useState, useRef} from "react";
import {validateAndRefreshToken} from "../../../utils/easyUtils";
import {getModelData} from "../getModelData";
import {MailOutlined, AndroidOutlined, BellOutlined, QuestionCircleOutlined, PlayCircleOutlined, ThunderboltOutlined} from "@ant-design/icons";
import {FaPlay, FaStop, FaTelegramPlane} from 'react-icons/fa';
import {Alert, Button, Input, Modal, Spin, Switch, Card, Typography, Tour, FloatButton} from "antd";
import {saveChannelData} from "../saveChannelsData";
import {showErrorNotification, showNotification, showWarningNotification} from "../../hotification/showNotification";
import {readChannelData} from "../readChannelData";
import {sendVerifCode} from "./sendVerifCode";
import {generateRandomThreeDigitNumber} from "../../../widget/utils";
import {getMail} from "./getMail";
import {FiTarget} from "react-icons/fi";
import {saveNotifEvent} from "./saveNotifEvent";
import {deleteNotifChanel} from "./deleteNotifChanel";
import './Notifications.css';
import '../Tour.css';
import {getTourPanelState, setTourPanelState} from "../../../utils/cookieUtils";

const { Text, Title } = Typography;

const INITIAL_AVAILABLE_CHANNELS = [
    {
        key: "email",
        label: "Email",
        icon: <MailOutlined/>,
        isExpanded: false,
        isEnabled: false,
        data: ''
    },
    {
        key: "telega",
        label: "Telegram",
        icon: <FaTelegramPlane/>,
        isExpanded: false,
        isEnabled: false,
        data: ''
    },
    {
        key: "instant",
        label: "Instant",
        icon: <ThunderboltOutlined/>,
        isExpanded: false,
        isEnabled: false,
        data: 'enabled'
    },
];

export const Notifications = () => {
    const [loading, setLoading] = useState(true);
    const [modelData, setModelData] = useState(null);
    const [availableChannels, setAvailableChannels] = useState(INITIAL_AVAILABLE_CHANNELS);

    const [selectedChannels, setSelectedChannels] = useState([]); // Выбранные элементы
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [channelToRemove, setChannelToRemove] = useState(null);
    const [isCodeSent, setIsCodeSent] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationStatus, setVerificationStatus] = useState(null);
    const [pin, setPin] = useState(null);
    const enabledChannelsCount = selectedChannels.filter(channel => channel.isEnabled).length;
    // Переключатели уведомлений
    const [startDialog, setStartDialog] = useState(false);
    const [endDialog, setEndDialog] = useState(false);
    const [targetDialog, setTargetDialog] = useState(false);
    // Имя бота
    const [botName, setBotName] = useState('');
    const [tourVisible, setTourVisible] = useState(false);
    const [current, setCurrent] = useState(0);
    const [tourPanelVisible, setTourPanelVisible] = useState(getTourPanelState('notifications')); // Состояние для видимости панели

    // Refs для Tour targets
    const notificationsHeaderRef = useRef(null);
    const addChannelRef = useRef(null);
    const channelsContainerRef = useRef(null);
    const eventsGridRef = useRef(null);

    const handleChannelSelect = (channelKey) => {
        // Find the selected channel from available channels
        const selectedChannel = availableChannels.find(ch => ch.key === channelKey);

        if (selectedChannel) {
            if (channelKey === "email" && selectedChannel.data === "") {
                fetchUserEmail();
            }
            // Add selected channel to selectedChannels array
            setSelectedChannels([...selectedChannels, {
                ...selectedChannel,
                isExpanded: true
            }]);

            // Remove the selected channel from available channels
            setAvailableChannels(availableChannels.filter(ch => ch.key !== channelKey));
        }
    };

    const toggleExpand = (channelKey) => {
        setVerificationStatus('success') // ТОЛЬКО ДЛЯ ТЕСТОВ!!!
        setSelectedChannels(selectedChannels.map(ch => {
            if (ch.key === channelKey) {
                const newExpandedState = !ch.isExpanded;
                // Removed email fetching from here
                return {...ch, isExpanded: newExpandedState};
            }
            return ch;
        }));
    };

    const showRemoveConfirmation = (channelKey) => {
        setChannelToRemove(channelKey);
        setIsModalVisible(true);
    };

    const handleConfirmRemove = async () => {
        const channelToMove = selectedChannels.find(ch => ch.key === channelToRemove);
        // Add back to available channels
        setAvailableChannels([...availableChannels, {
            ...channelToMove,
            isExpanded: false,
            isEnabled: false,
            data: ''
        }]);
        // Remove from selected channels
        setSelectedChannels(selectedChannels.filter(ch => ch.key !== channelToRemove));
        setIsModalVisible(false);

        try {
            const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
            if (token) {
                const result = deleteNotifChanel(token, channelToMove.label)

                if (result) {
                    showNotification("Канал для уведомлений удален", "Ассистент ассистент больше не будет присылать уведомления в этот канал!");
                }
            }
        } catch (error) {
            console.error("Ошибка при получении email:", error);
            showErrorNotification("Ошибка", "Не удалось получить email пользователя");
        }
    };

    const handleCancelRemove = () => {
        setChannelToRemove(null);
        setIsModalVisible(false);
    };

    const saveData = async (key) => {
        const channel = selectedChannels.find(ch => ch.key === key);
        const token = await validateAndRefreshToken(localStorage.getItem("authToken"))

        if (token != null) {
            // Создаем объект со всеми полями
            let channelType = "";
            if (channel.key === "email") {
                channelType = "email";
            } else if (channel.key === "telega") {
                channelType = "telega";
            } else if (channel.key === "instant") {
                channelType = "instant";
            }

            const success = await saveChannelData("notifications", channelType, channel.data, null, channel.isEnabled, token);

            if (success) {
                if (channel.isEnabled) {
                    showNotification("Канал для уведомлений сохранен", "Ассистент будет присылать уведомления в этот канал!");
                } else {
                    showNotification("Канал для уведомлений сохранен но не активирован", "Ассистент не будет присылать уведомления в этот канал!");
                }
            } else {
                showErrorNotification("Ошибка сохранения канала для уведомлений", "Вы не будете получать уведомления ассистента из этого канала!");
            }
        } else {
            showWarningNotification("Ошибка сохранения канала уведомлений", "Токен не обновлен, необходимо повторно авторизоваться!")
        }

        toggleExpand(key);
    };

    const fetchUserEmail = async () => {
        try {
            const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
            if (token) {
                const userData = await getMail(token);

                setSelectedChannels(prev =>
                    prev.map(ch =>
                        ch.key === "email" ? {...ch, data: userData.email} : ch
                    )
                );
            }
        } catch (error) {
            console.error("Ошибка при получении email:", error);
            showErrorNotification("Ошибка", "Не удалось получить email пользователя");
        }
    };

    useEffect(() => {
        const fetchChannelData = async () => {
            try {
                const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
                if (token) {
                    // Получаем данные о модели
                    // Сначала из локального хранилища
                    let modelDataResult
                    if (localStorage.getItem("userModel")) {
                        modelDataResult = true
                    } else {
                        modelDataResult = await getModelData(token)
                    }
                    if (modelDataResult) {
                        setModelData(true);

                        // Получаем данные о каналах
                        const channelsData = await readChannelData("notifications", token);
                        if (channelsData) {
                            const newAvailableChannels = [...INITIAL_AVAILABLE_CHANNELS]; // Используем константу вместо availableChannels
                            const newSelectedChannels = [];

                            // Остальной код остается без изменений...
                            // Обработка Telegram бота
                            if (channelsData.telega) {
                                const telega = newAvailableChannels.find(ch => ch.key === "telega");
                                if (telega) {
                                    const index = newAvailableChannels.indexOf(telega);
                                    if (index > -1) {
                                        newAvailableChannels.splice(index, 1);
                                    }
                                    const hasValidData = channelsData.telega.data && true && channelsData.telega.data !== '';
                                    newSelectedChannels.push({
                                        ...telega,
                                        data: channelsData.telega.data || '',
                                        isEnabled: hasValidData ? Boolean(channelsData.telega.enabled) : false
                                    });
                                }
                                setVerificationStatus('success')
                            }

                            // Обработка email
                            if (channelsData.email.enabled !=null) {
                                const widgetChannel = newAvailableChannels.find(ch => ch.key === "email");
                                if (widgetChannel) {
                                    const index = newAvailableChannels.indexOf(widgetChannel);
                                    if (index > -1) {
                                        newAvailableChannels.splice(index, 1);
                                    }
                                    const hasValidData = channelsData.email.data && true && channelsData.email.data !== '';
                                    newSelectedChannels.push({
                                        ...widgetChannel,
                                        data: channelsData.email.data || '',
                                        isEnabled: hasValidData ? Boolean(channelsData.email.enabled) : false
                                    });
                                }
                            }

                            // Обработка Instant
                            if (channelsData.instant && channelsData.instant.enabled != null) {
                                const instantChannel = newAvailableChannels.find(ch => ch.key === "instant");
                                if (instantChannel) {
                                    const index = newAvailableChannels.indexOf(instantChannel);
                                    if (index > -1) {
                                        newAvailableChannels.splice(index, 1);
                                    }
                                    newSelectedChannels.push({
                                        ...instantChannel,
                                        data: 'enabled',
                                        isEnabled: Boolean(channelsData.instant.enabled)
                                    });
                                }
                            }

                            // Обработка Events
                            if (channelsData.events) {
                                setStartDialog(Boolean(channelsData.events.start))
                                setEndDialog(Boolean(channelsData.events.end))
                                setTargetDialog(Boolean(channelsData.events.target))
                            }

                            // Установка имени бота
                            if (channelsData.BotName) {
                                setBotName(channelsData.BotName);
                            }

                            setAvailableChannels(newAvailableChannels);
                            setSelectedChannels(newSelectedChannels);
                        }
                    }
                }
            } catch (error) {
                console.error("Ошибка при загрузке данных каналов:", error);
            }
            finally {
                setLoading(false);
            }
        };

        fetchChannelData();
    }, []);

    if (loading) {
        return (
            <div className="notifications-loading">
                <Spin size="large" />
                <Text className="loading-text">
                    Загрузка данных...
                </Text>
            </div>
        );
    }

    const toggleSwitch = async (key) => {
        setSelectedChannels(
            selectedChannels.map((ch) => {
                if (ch.key === key) {
                    // Для канала instant всегда разрешаем переключение
                    if (ch.key === "instant") {
                        return {...ch, isEnabled: !ch.isEnabled};
                    }

                    // Для остальных каналов проверяем валидные данные
                    const hasValidData = ch.data && true && ch.data !== '';
                    // Если нет валидных данных, не разрешаем включать канал
                    if (!hasValidData && !ch.isEnabled) {
                        return ch; // Возвращаем без изменений
                    }
                    return {...ch, isEnabled: !ch.isEnabled};
                }
                return ch;
            })
        );
    };

    const sendVerificationCode = async (telegramId) => {
        setIsVerifying(true);
        const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
        if (token) {
            const pin = generateRandomThreeDigitNumber();
            setPin(String(pin));

            const result = await sendVerifCode(token, telegramId, pin);
            if (result) {
                setTimeout(() => {
                    setIsCodeSent(true);
                    setIsVerifying(false);
                    showNotification("Код подтверждения отправлен",
                        "Проверьте сообщения в Telegram и введите код из сообщения");
                }, 1000);
            } else {
                setIsVerifying(false);
                showErrorNotification("Ошибка отправки кода",
                    "Не удалось отправить код подтверждения. Проверьте ID Telegram.");
            }
        } else {
            setIsVerifying(false);
            showErrorNotification("Ошибка отправки кода",
                "Не удалось отправить код подтверждения. Проверьте ID Telegram.");
        }
    };

    const verifyCode = async (code) => {
        setIsVerifying(true);

        if (pin === code) {
            setTimeout(() => {
                setIsVerifying(false);
                setVerificationStatus('success');
                showNotification("Telegram подтвержден",
                    "Ваш Telegram успешно подтвержден для получения уведомлений");
            }, 1000);
        } else {
            setIsVerifying(false);
            setVerificationStatus('error');
            showErrorNotification("Ошибка проверки кода",
                "Введенный код неверный. Попробуйте еще раз.");
        }
    };

    const saveNotification = async (overrides = {}) => {
        const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
        if (token) {
            const s = overrides.start ?? startDialog;
            const e = overrides.end ?? endDialog;
            const t = overrides.target ?? targetDialog;
            const res = await saveNotifEvent(token, s, e, t)
            if (res) {
                showNotification("События уведомлений успешно сохранены",
                    "Вы будете получать уведомления при наступлении выбранных событий");
            }
            else {
                showWarningNotification("Ошибка сохранения событий уведомлений", "Повторите попытку")
            }
        } else {
            showErrorNotification("Ошибка сохранения событий уведомлений",
                "Внутренняя ощипка сервера. Повторите попытку позже.")
        }
    };

    // Функция для запуска тура
    const startTour = () => {
        setTourVisible(true);
        setCurrent(0);
        setTourPanelState('notifications', false); // Сохраняем состояние скрытой панели
    };

    // Функция для показа панели Tour при клике на FloatButton
    const showTourPanel = () => {
        setTourPanelVisible(true);
        setTourPanelState('notifications', true); // Сохраняем состояние показанной панели
    };

    // Функция для скрытия панели Tour
    const hideTourPanel = () => {
        setTourPanelVisible(false);
        setTourPanelState('notifications', false); // Сохраняем состояние скрытой панели
    };

    // Шаги Tour для Notifications
    const steps = [
        {
            title: '🔔 Добро пожаловать в настройки уведомлений',
            description: 'Здесь вы можете настроить каналы для получения уведомлений о событиях и работе вашего ассистента. Настройте Email и Telegram для получения важных уведомлений.',
            target: () => notificationsHeaderRef.current,
        },
        {
            title: '➕ Добавление каналов уведомлений',
            description: 'Нажмите здесь, чтобы добавить новые каналы уведомлений. Доступны Email (автоматически из профиля) и Telegram канал для мгновенных уведомлений.',
            target: () => addChannelRef.current,
        },
        {
            title: '⚙️ Управление каналами',
            description: 'В этой секции отображаются все настроенные каналы. Вы можете включать/выключать каналы, редактировать их настройки и проверять статус подключения.',
            target: () => channelsContainerRef.current,
        },
        {
            title: '📅 События для уведомлений',
            description: 'Выберите события ассистента, о которых хотите получать уведомления: начало диалога, окончание диалога, достижение цели. Настройки автоматически сохраняются при изменении.',
            target: () => eventsGridRef.current,
        },
        {
            title: '✅ Система уведомлений готова!',
            description: 'Поздравляем! Теперь ваша система уведомлений настроена. Вы будете получать важные события работы ассистента в выбранные каналы связи.',
            target: () => eventsGridRef.current,
        },
    ];

    return (
        <div className="create-model-container">
            <div className="section-title" ref={notificationsHeaderRef}>
                <BellOutlined />
                Уведомления модели
            </div>
            <div className="section-description">
                Настройте каналы для получения уведомлений о событиях и работе вашего ассистента
            </div>

            <div className="tour-layout">
                <div className="tour-content">
                    <div className="notifications-modern">
                        {!modelData ? (
                            <div className="no-model-state">
                                <AndroidOutlined className="no-model-icon" />
                                <Title level={3} className="no-model-title">
                                    Модель ассистента не создана
                                </Title>
                                <Text className="no-model-description">
                                    Для настройки уведомлений необходимо сначала создать модель ассистента
                                </Text>
                            </div>
                        ) : (
                            <>
                                {/* Кнопка создания канала */}
                                {availableChannels.length > 0 && (
                                    <div className="add-channel-section" ref={addChannelRef}>
                                        <Title level={4} className="add-channel-title">
                                            Добавить канал уведомлений
                                        </Title>
                                        <AddChannel
                                            availableChannels={availableChannels}
                                            onChannelSelect={handleChannelSelect}
                                        />
                                    </div>
                                )}

                                {/* Отображение выбранных каналов */}
                                <div className="channels-container" ref={channelsContainerRef}>
                                    {selectedChannels.map((channel) => (
                                        <Card key={channel.key} className="channel-card">
                                            <div className="channel-card-header">
                                                <div className="channel-info">
                                                    <div
                                                        className="channel-icon"
                                                        style={{
                                                            color: channel.isEnabled ? "#52c41a" : "#8c8c8c",
                                                            backgroundColor: channel.isEnabled ? "rgba(82, 196, 26, 0.1)" : "rgba(140, 140, 140, 0.1)"
                                                        }}
                                                    >
                                                        {channel.icon}
                                                    </div>
                                                    <Title level={4} className="channel-title">
                                                        {channel.label}
                                                    </Title>
                                                </div>
                                                <div className="channel-status-switch">
                                                    <Text>Статус:</Text>
                                                    <Switch
                                                        checked={channel.isEnabled}
                                                        onChange={() => toggleSwitch(channel.key)}
                                                        disabled={channel.key === "instant" ? false : (!channel.data || false || channel.data === '')}
                                                        checkedChildren={<span style={{color: "black"}}>Включен</span>}
                                                        unCheckedChildren={<span style={{color: "black"}}>Выключен</span>}
                                                    />
                                                </div>
                                            </div>

                                            {channel.isExpanded && (
                                                <div className="channel-card-content">
                                                    {/* EMAIL */}
                                                    {channel.key === "email" && (
                                                        <>
                                                            <Alert
                                                                className="channel-alert"
                                                                message="Использовать Email для всех уведомлений"
                                                                description={
                                                                    <>
                                                                        При регистрации вы указали этот адрес электронной почты:
                                                                        <Text strong style={{color: 'var(--link-color)', marginLeft: 8}}>
                                                                            {channel.data}
                                                                        </Text>
                                                                        <br />
                                                                        Критические уведомления всегда будут приходить на этот email
                                                                    </>
                                                                }
                                                                type={channel.data ? "success" : "warning"}
                                                            />
                                                            {channel.error && (
                                                                <Text type="danger">{channel.error}</Text>
                                                            )}
                                                        </>
                                                    )}

                                                    {/* TELEGRAM */}
                                                    {channel.key === "telega" && (
                                                        <>
                                                            <Alert
                                                                className="channel-alert"
                                                                message="Настройка уведомлений в Telegram"
                                                                description={
                                                                    <>
                                                                        Для получения уведомлений о событиях вашего ассистента,
                                                                        запустите{' '}
                                                                        <a
                                                                            href={`https://t.me/${botName}`}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                        >
                                                                            {botName}
                                                                        </a>
                                                                        {' '}выполните команду /start, и скопируйте полученный Telegram ID
                                                                    </>
                                                                }
                                                                type={channel.data ? "success" : "warning"}
                                                            />

                                                            <div className="channel-input-group">
                                                                <Input
                                                                    prefix={<FaTelegramPlane/>}
                                                                    placeholder="Введите Ваш Telegram ID"
                                                                    value={channel.data}
                                                                    onChange={(e) => {
                                                                        const value = e.target.value;
                                                                        const isNumeric = /^[0-9]*$/.test(value);
                                                                        const error =
                                                                            !isNumeric
                                                                                ? 'Telegram ID должен содержать только цифры!'
                                                                                : value.length > 0 && value.length < 9
                                                                                    ? 'Telegram ID должен быть не менее 9 символов!'
                                                                                    : '';

                                                                        setSelectedChannels(
                                                                            selectedChannels.map((ch) =>
                                                                                ch.key === channel.key
                                                                                    ? {...ch, data: value, error: error}
                                                                                    : ch
                                                                            )
                                                                        );

                                                                        if (verificationStatus) {
                                                                            setVerificationStatus(null);
                                                                            setIsCodeSent(false);
                                                                            setVerificationCode('');
                                                                            setPin('')
                                                                        }
                                                                    }}
                                                                    status={channel.error ? "error" : ""}
                                                                    addonAfter={
                                                                        <Button
                                                                            style={{color: "black"}}
                                                                            type="primary"
                                                                            size="small"
                                                                            onClick={() => sendVerificationCode(channel.data)}
                                                                            loading={isVerifying}
                                                                            disabled={!channel.data || channel.error || isCodeSent || verificationStatus === 'success'}
                                                                        >
                                                                            Отправить код
                                                                        </Button>
                                                                    }
                                                                />
                                                                {channel.error && (
                                                                    <Text type="danger">{channel.error}</Text>
                                                                )}
                                                            </div>

                                                            {isCodeSent && verificationStatus !== 'success' && (
                                                                <div className="verification-section">
                                                                    <Input
                                                                        placeholder="Введите код подтверждения"
                                                                        value={verificationCode}
                                                                        onChange={(e) => setVerificationCode(e.target.value)}
                                                                        status={verificationStatus === 'error' ? "error" : ""}
                                                                        addonAfter={
                                                                            <Button
                                                                                type="primary"
                                                                                size="small"
                                                                                onClick={() => verifyCode(verificationCode)}
                                                                                loading={isVerifying}
                                                                                disabled={!verificationCode}
                                                                            >
                                                                                Проверить
                                                                            </Button>
                                                                        }
                                                                    />
                                                                    {verificationStatus === 'error' && (
                                                                        <Text type="danger">
                                                                            Неверный код подтверждения
                                                                        </Text>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </>
                                                    )}

                                                    {/* INSTANT */}
                                                    {channel.key === "instant" && (
                                                        <>
                                                            <Alert
                                                                className="channel-alert"
                                                                message="Получение сообщений в панели управления"
                                                                description={
                                                                    <>
                                                                        Уведомления будут отображаться в панели управления в режиме реального времени.
                                                                        Вы увидите все важные события работы вашего ассистента прямо в интерфейсе.
                                                                        <br />
                                                                        <Text type="secondary">
                                                                            Этот канал не требует дополнительной настройки - просто включите его.
                                                                        </Text>
                                                                    </>
                                                                }
                                                                type="success"
                                                            />
                                                        </>
                                                    )}

                                                    <div className="channel-actions">
                                                        <div className="channel-actions-left">
                                                            {channel.isExpanded && (
                                                                <Button
                                                                    type="text"
                                                                    danger
                                                                    onClick={() => showRemoveConfirmation(channel.key)}
                                                                >
                                                                    Удалить канал
                                                                </Button>
                                                            )}
                                                        </div>
                                                        <div className="channel-actions-right">
                                                            <Button
                                                                onClick={() => toggleExpand(channel.key)}
                                                            >
                                                                Отмена
                                                            </Button>
                                                            <Button
                                                                style={{color: "black"}}
                                                                type="primary"
                                                                onClick={() => saveData(channel.key)}
                                                                disabled={
                                                                    channel.key === "instant"
                                                                        ? false
                                                                        : channel.key === "telega"
                                                                        ? (!channel.data || verificationStatus !== 'success')
                                                                        : !channel.data
                                                                }
                                                            >
                                                                Сохранить
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {!channel.isExpanded && (
                                                <div className="channel-actions">
                                                    <div className="channel-actions-left">
                                                        <Text type="secondary">
                                                            {channel.data ? 'Настроен' : 'Требует настройки'}
                                                        </Text>
                                                    </div>
                                                    <div className="channel-actions-right">
                                                        <Button
                                                            style={{color: "black"}}
                                                            type="primary"
                                                            onClick={() => toggleExpand(channel.key)}
                                                        >
                                                            Настройки
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </Card>
                                    ))}
                                </div>

                                {/* Секция событий уведомлений */}
                                {enabledChannelsCount > 0 && (
                                    <div className="events-section" ref={eventsGridRef}>
                                        <div className="events-header">
                                            <Title level={3} className="events-title">
                                                События для уведомлений
                                            </Title>
                                            <Text className="events-subtitle">
                                                Выберите события ассистента, о которых вы будете получать уведомления
                                            </Text>
                                        </div>

                                        <div className="events-grid">
                                            {/* Начало диалога */}
                                            <Card className="event-card">
                                                <div className="event-card-header">
                                                    <div className="event-info">
                                                        <div
                                                            className="event-icon"
                                                            style={{
                                                                color: startDialog ? "#52c41a" : "#8c8c8c",
                                                                backgroundColor: startDialog ? "rgba(82, 196, 26, 0.1)" : "rgba(140, 140, 140, 0.1)"
                                                            }}
                                                        >
                                                            <FaPlay />
                                                        </div>
                                                        <Text className="event-name">Начало диалога</Text>
                                                    </div>
                                                    <Switch
                                                        checked={startDialog}
                                                        onChange={async () => {
                                                            const newValue = !startDialog;
                                                            setStartDialog(newValue);
                                                            await saveNotification({ start: newValue });
                                                        }}
                                                        checkedChildren={<span style={{color: "black"}}>Включен</span>}
                                                        unCheckedChildren={<span style={{color: "black"}}>Выключен</span>}
                                                        style={{color: "black"}}
                                                    />
                                                </div>
                                                <div className="event-card-content">
                                                    <Alert
                                                        style={{height: '270px'}}
                                                        message="Старт нового диалога"
                                                        description="Получать уведомление о начале диалога. Ассистент пришлёт уведомление с данными пользователя, начавшего диалог"
                                                        type={startDialog ? "success" : "warning"}
                                                        showIcon
                                                    />
                                                </div>
                                            </Card>

                                            {/* Окончание диалога */}
                                            <Card className="event-card">
                                                <div className="event-card-header">
                                                    <div className="event-info">
                                                        <div
                                                            className="event-icon"
                                                            style={{
                                                                color: endDialog ? "#52c41a" : "#8c8c8c",
                                                                backgroundColor: endDialog ? "rgba(82, 196, 26, 0.1)" : "rgba(140, 140, 140, 0.1)"
                                                            }}
                                                        >
                                                            <FaStop />
                                                        </div>
                                                        <Text className="event-name">Окончание диалога</Text>
                                                    </div>
                                                    <Switch
                                                        checked={endDialog}
                                                        onChange={async () => {
                                                            const newValue = !endDialog;
                                                            setEndDialog(newValue);
                                                            await saveNotification({ end: newValue});
                                                        }}
                                                        checkedChildren={<span style={{color: "black"}}>Включен</span>}
                                                        unCheckedChildren={<span style={{color: "black"}}>Выключен</span>}
                                                        style={{color: "black"}}
                                                    />
                                                </div>
                                                <div className="event-card-content">
                                                    <Alert
                                                        style={{height: '270px'}}
                                                        message="Окончание диалога"
                                                        description="Получать уведомление при окончании диалога. Ассистент пришлёт уведомление с данными пользователя при окончании диалога, если это поддерживается каналом"
                                                        type={endDialog ? "success" : "warning"}
                                                        showIcon
                                                    />
                                                </div>
                                            </Card>

                                            {/* Достижение цели */}
                                            <Card className="event-card">
                                                <div className="event-card-header">
                                                    <div className="event-info">
                                                        <div
                                                            className="event-icon"
                                                            style={{
                                                                color: targetDialog ? "#52c41a" : "#8c8c8c",
                                                                backgroundColor: targetDialog ? "rgba(82, 196, 26, 0.1)" : "rgba(140, 140, 140, 0.1)"
                                                            }}
                                                        >
                                                            <FiTarget />
                                                        </div>
                                                        <Text className="event-name">Достижение цели</Text>
                                                    </div>
                                                    <Switch
                                                        checked={targetDialog}
                                                        onChange={async () => {
                                                            const newValue = !targetDialog;
                                                            setTargetDialog(newValue);
                                                            await saveNotification({ target: newValue });
                                                        }}
                                                        checkedChildren={<span style={{color: "black"}}>Включен</span>}
                                                        unCheckedChildren={<span style={{color: "black"}}>Выключен</span>}
                                                        style={{color: "black"}}
                                                    />
                                                </div>
                                                <div className="event-card-content">
                                                    <Alert
                                                        style={{height: '270px'}}
                                                        message="Достижение цели диалога"
                                                        description="Получать уведомление при достижении цели, заданной в настройках модели. Ассистент пришлёт уведомление с данными пользователя при достижении цели"
                                                        type={targetDialog ? "success" : "warning"}
                                                        showIcon
                                                    />
                                                </div>
                                            </Card>
                                        </div>
                                    </div>
                                )}

                                <Modal
                                    title="Подтвердите удаление"
                                    open={isModalVisible}
                                    onCancel={handleCancelRemove}
                                    className="notifications-modal"
                                    footer={[
                                        <Button key="cancel" onClick={handleCancelRemove}>
                                            Отмена
                                        </Button>,
                                        <Button key="confirm" danger type="primary" onClick={handleConfirmRemove}>
                                            Удалить
                                        </Button>,
                                    ]}
                                >
                                    Вы уверены, что хотите удалить этот канал? Все настройки будут потеряны.
                                </Modal>
                            </>
                        )}
                    </div>
                </div>

                {/* Панель управления Tour справа - показывается только когда tourPanelVisible = true */}
                {tourPanelVisible && (
                    <div className="tour-controls tour-primary">
                        <div className="tour-controls-header">
                            <PlayCircleOutlined className="tour-controls-icon" />
                            <h3 className="tour-controls-title">
                                Интерактивный обзор
                            </h3>
                            <p className="tour-controls-subtitle">
                                Изучите настройки уведомлений пошагово
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
                                <li>Добавление каналов уведомлений</li>
                                <li>Настройку Email и Telegram</li>
                                <li>Выбор событий для мониторинга</li>
                                <li>Управление статусами каналов</li>
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
                tooltip="Начать обзор настроек уведомлений"
                onClick={showTourPanel}
                className="tour-float-button"
            />
        </div>
    );
}
