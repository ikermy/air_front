import {AddChannel} from "../Channals/addChanal";
import React, {useEffect, useState, useRef} from "react";
import {useTranslation} from 'react-i18next';
import {
    MailOutlined,
    AndroidOutlined,
    BellOutlined,
    QuestionCircleOutlined,
    PlayCircleOutlined,
    ThunderboltOutlined,
    CheckCircleOutlined
} from "@ant-design/icons";
import {FaPlay, FaStop, FaTelegramPlane} from 'react-icons/fa';
import {Alert, Button, Input, Modal, Spin, Switch, Card, Typography, Tour, FloatButton} from "antd";
import {showErrorNotification, showNotification, showWarningNotification} from "../../hotification/showNotification";
import {FiTarget} from "react-icons/fi";
import './Notifications.css';
import '../Tour.css';
import {getTourPanelState, setTourPanelState} from "../../../utils/cookieUtils";
import {
    deleteNotifChanel,
    getMail,
    readNotificationsData,
    saveNotifEvent,
    saveNotificationsData,
    sendVerifCode
} from "./notificationUtils";
import {restartActiveChannels, chAvailable} from "../Channals/chUtils";
import {getModelData} from "../CreateModelFormElements/modUtils";

const {Text, Title} = Typography;

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
    const {t} = useTranslation();
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

    // State для модального окна перезапуска сервисов
    const [isRestartServicesModalOpen, setIsRestartServicesModalOpen] = useState(false);
    const [restartProgressVisible, setRestartProgressVisible] = useState(false);
    const [restartMessages, setRestartMessages] = useState([]);
    const [restartComplete, setRestartComplete] = useState(false);
    const [restartLoading, setRestartLoading] = useState(false);

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

    const toggleExpand = async (channelKey) => {
        // Проверка доступности канала Telegram
        if (channelKey === 'telega') {
            const isAvailable = await chAvailable('tgbot');
            if (!isAvailable) {
                showErrorNotification(
                    t("error") || "Ошибка",
                    t("channelUnavailable") || "Этот канал сейчас недоступен"
                );
                return;
            }
        }

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
            const result = deleteNotifChanel(channelToMove.label)

            if (result) {
                showNotification(t("notifChannelDeleted") || "Канал для уведомлений удален", t("notifChannelDeletedDesc") || "Агент больше не будет присылать уведомления в этот канал!");
            }
        } catch (error) {
            console.error("Ошибка при получении email:", error);
            showErrorNotification(t("error") || "Ошибка", t("notifEmailError") || "Не удалось получить email пользователя");
        }
    };

    const handleCancelRemove = () => {
        setChannelToRemove(null);
        setIsModalVisible(false);
    };

    const saveData = async (key) => {
        const channel = selectedChannels.find(ch => ch.key === key);

        // Создаем объект со всеми полями
        let channelType = "";
        if (channel.key === "email") {
            channelType = "email";
        } else if (channel.key === "telega") {
            channelType = "telega";
        } else if (channel.key === "instant") {
            channelType = "instant";
        }

        const result = await saveNotificationsData(channelType, channel.data, null, channel.isEnabled);

        if (result.success) {
            if (channel.isEnabled) {
                showNotification(t("notifChannelSaved") || "Канал для уведомлений сохранен", t("notifChannelSavedEnabled") || "Агент будет присылать уведомления в этот канал!");
            } else {
                showNotification(t("notifChannelSavedDisabled") || "Канал для уведомлений сохранен но не активирован", t("notifChannelSavedDisabledDesc") || "Агент не будет присылать уведомления в этот канал!");
            }

            // Проверяем, есть ли активные сервисы для перезапуска
            if ((channelType !== "instant") && (channelType !== "telega") && (channelType !== "email")) {
                if (result.active_channels) {
                    setIsRestartServicesModalOpen(true);
                }
            }
        } else {
            showErrorNotification(t("notifChannelSaveError") || "Ошибка сохранения канала для уведомлений", t("notifChannelSaveErrorDesc") || "Вы не будете получать уведомления агента из этого канала!");
        }

        await toggleExpand(key);
    };

    const fetchUserEmail = async () => {
        try {
            const userData = await getMail();

            setSelectedChannels(prev =>
                prev.map(ch =>
                    ch.key === "email" ? {...ch, data: userData.email} : ch
                )
            );
        } catch (error) {
            console.error("Ошибка при получении email:", error);
            showErrorNotification(t("error") || "Ошибка", t("notifEmailError") || "Не удалось получить email пользователя");
        }
    };

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                // Получаем данные о модели
                // Сначала из локального хранилища
                let modelDataResult
                if (localStorage.getItem("userModel")) {
                    modelDataResult = true
                } else {
                    modelDataResult = await getModelData()
                }
                if (modelDataResult) {
                    setModelData(true);

                    // Получаем данные о каналах
                    const channelsData = await readNotificationsData();
                    if (channelsData) {
                        const newAvailableChannels = [...INITIAL_AVAILABLE_CHANNELS]; // Используем константу вместо availableChannels
                        const newSelectedChannels = [];

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
                        if (channelsData.email.enabled != null) {
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

                        // Обработка LeadEvents
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
            } catch (error) {
                console.error("Ошибка при загрузке данных каналов:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchNotifications();
    }, []);

    if (loading) {
        return (
            <div className="notifications-loading">
                <Spin size="large"/>
                <Text className="loading-text">
                    {t("loading") || "Загрузка данных..."}
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

    const generateRandomThreeDigitNumber = () => {
        return Math.floor(100 + Math.random() * 900);
    };

    const sendVerificationCode = async (telegramId) => {
        setIsVerifying(true);
        const pin = generateRandomThreeDigitNumber();
        setPin(String(pin));

        const result = await sendVerifCode(telegramId, pin);
        if (result) {
            setTimeout(() => {
                setIsCodeSent(true);
                setIsVerifying(false);
                showNotification(t("notifCodeSent") || "Код подтверждения отправлен",
                    t("notifCodeSentDesc") || "Проверьте сообщения в Telegram и введите код из сообщения");
            }, 1000);
        } else {
            setIsVerifying(false);
            showErrorNotification(t("notifCodeSendError") || "Ошибка отправки кода",
                t("notifCodeSendErrorDesc") || "Не удалось отправить код подтверждения. Проверьте ID Telegram.");
        }
    };

    const verifyCode = async (code) => {
        setIsVerifying(true);

        if (pin === code) {
            setTimeout(() => {
                setIsVerifying(false);
                setVerificationStatus('success');
                showNotification(t("notifTelegramVerified") || "Telegram подтвержден",
                    t("notifTelegramVerifiedDesc") || "Ваш Telegram успешно подтвержден для получения уведомлений");
            }, 1000);
        } else {
            setIsVerifying(false);
            setVerificationStatus('error');
            showErrorNotification(t("notifCodeVerifyError") || "Ошибка проверки кода",
                t("notifCodeVerifyErrorDesc") || "Введенный код неверный. Попробуйте еще раз.");
        }
    };

    const saveNotification = async (overrides = {}) => {
        const s = overrides.start ?? startDialog;
        const e = overrides.end ?? endDialog;
        const targetValue = overrides.target ?? targetDialog;
        const res = await saveNotifEvent(s, e, targetValue)
        if (res.success) {
            showNotification(t("notifEventsSaved") || "События уведомлений успешно сохранены",
                t("notifEventsSavedDesc") || "Вы будете получать уведомления при наступлении выбранных событий");

            // Проверяем, есть ли активные сервисы для перезапуска
            if (res.active_channels) {
                setIsRestartServicesModalOpen(true);
            }
        } else {
            showWarningNotification(t("notifEventsSaveError") || "Ошибка сохранения событий уведомлений", t("notifEventsSaveErrorRetry") || "Повторите попытку")
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
            title: t("notifTourWelcome") || '🔔 Добро пожаловать в настройки уведомлений',
            description: t("notifTourWelcomeDesc") || 'Здесь вы можете настроить каналы для получения уведомлений о событиях и работе вашего агента. Настройте Email и Telegram для получения важных уведомлений.',
            target: () => notificationsHeaderRef.current,
        },
        {
            title: t("notifTourAddChannels") || '➕ Добавление каналов уведомлений',
            description: t("notifTourAddChannelsDesc") || 'Нажмите здесь, чтобы добавить новые каналы уведомлений. Доступны Email (автоматически из профиля) и Telegram канал для мгновенных уведомлений.',
            target: () => addChannelRef.current,
        },
        {
            title: t("notifTourManageChannels") || '⚙️ Управление каналами',
            description: t("notifTourManageChannelsDesc") || 'В этой секции отображаются все настроенные каналы. Вы можете включать/выключать каналы, редактировать их настройки и проверять статус подключения.',
            target: () => channelsContainerRef.current,
        },
        {
            title: t("notifTourEvents") || '📅 События для уведомлений',
            description: t("notifTourEventsDesc") || 'Выберите события агента, о которых хотите получать уведомления: начало диалога, окончание диалога, достижение цели. Настройки автоматически сохраняются при изменении.',
            target: () => eventsGridRef.current,
        },
        {
            title: t("notifTourReady") || '✅ Система уведомлений готова!',
            description: t("notifTourReadyDesc") || 'Поздравляем! Теперь ваша система уведомлений настроена. Вы будете получать важные события работы агента в выбранные каналы связи.',
            target: () => eventsGridRef.current,
        },
    ];

    return (
        <div className="create-model-container">
            <div className="section-title" ref={notificationsHeaderRef}>
                <BellOutlined/>
                {t("notifModelTitle") || "Уведомления модели"}
            </div>
            <div className="section-description">
                {t("notifModelDesc") || "Настройте каналы для получения уведомлений о событиях и работе вашего агента"}
            </div>

            <div className="tour-layout">
                <div className="tour-content">
                    <div className="notifications-modern">
                        {!modelData ? (
                            <div className="no-model-state">
                                <AndroidOutlined className="no-model-icon"/>
                                <Title level={3} className="no-model-title">
                                    {t("notifNoModel") || "Модель агента не создана"}
                                </Title>
                                <Text className="no-model-description">
                                    {t("notifNoModelDesc") || "Для настройки уведомлений необходимо сначала создать модель агента"}
                                </Text>
                            </div>
                        ) : (
                            <>
                                {/* Кнопка создания канала */}
                                {availableChannels.length > 0 && (
                                    <div className="add-channel-section" ref={addChannelRef}>
                                        <Title level={4} className="add-channel-title">
                                            {t("notifAddChannel") || "Добавить канал уведомлений"}
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
                                                {channel.isExpanded && (
                                                    <div className="channel-status-switch">
                                                        <Text>{t("notifStatus") || "Статус:"}</Text>
                                                        <Switch
                                                            checked={channel.isEnabled}
                                                            onChange={() => toggleSwitch(channel.key)}
                                                            disabled={channel.key === "instant" ? false : (!channel.data || false || channel.data === '')}
                                                            checkedChildren={<span
                                                                style={{color: "black"}}>{t("notifEnabled") || "Включен"}</span>}
                                                            unCheckedChildren={<span
                                                                style={{color: "black"}}>{t("notifDisabled") || "Выключен"}</span>}
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            {channel.isExpanded && (
                                                <div className="channel-card-content">
                                                    {/* EMAIL */}
                                                    {channel.key === "email" && (
                                                        <>
                                                            <Alert
                                                                className="channel-alert"
                                                                message={t("notifEmailTitle") || "Использовать Email для всех уведомлений"}
                                                                description={
                                                                    <>
                                                                        {t("notifEmailDesc") || "При регистрации вы указали этот адрес электронной почты:"}
                                                                        <Text strong style={{
                                                                            color: 'var(--link-color)',
                                                                            marginLeft: 8
                                                                        }}>
                                                                            {channel.data}
                                                                        </Text>
                                                                        <br/>
                                                                        {t("notifEmailCritical") || "Критические уведомления всегда будут приходить на этот email"}
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
                                                                message={t("notifTelegramTitle") || "Настройка уведомлений в Telegram"}
                                                                description={
                                                                    <>
                                                                        {t("notifTelegramDesc1") || "Для получения уведомлений о событиях вашего агента, запустите"}{' '}
                                                                        <a
                                                                            href={`https://t.me/${botName}`}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                        >
                                                                            {botName}
                                                                        </a>
                                                                        {' '}{t("notifTelegramDesc2") || "выполните команду /start, и скопируйте полученный Telegram ID"}
                                                                    </>
                                                                }
                                                                type={channel.data ? "success" : "warning"}
                                                            />

                                                            <div className="channel-input-group">
                                                                <Input
                                                                    prefix={<FaTelegramPlane/>}
                                                                    placeholder={t("notifTelegramIdPlaceholder") || "Введите Ваш Telegram ID"}
                                                                    value={channel.data}
                                                                    onChange={(e) => {
                                                                        const value = e.target.value;
                                                                        const isNumeric = /^[0-9]*$/.test(value);
                                                                        const error =
                                                                            !isNumeric
                                                                                ? (t("notifTelegramIdNumeric") || 'Telegram ID должен содержать только цифры!')
                                                                                : value.length > 0 && value.length < 9
                                                                                    ? (t("notifTelegramIdLength") || 'Telegram ID должен быть не менее 9 символов!')
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
                                                                            {t("notifVerifyButton") || "Подтвердить"}
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
                                                                        placeholder={t("notifCodePlaceholder") || "Введите код подтверждения"}
                                                                        value={verificationCode}
                                                                        onChange={(e) => setVerificationCode(e.target.value)}
                                                                        onPressEnter={() => verificationCode && !isVerifying && verifyCode(verificationCode)}
                                                                        status={verificationStatus === 'error' ? "error" : ""}
                                                                        addonAfter={
                                                                            <Button
                                                                                type="primary"
                                                                                size="small"
                                                                                onClick={() => verifyCode(verificationCode)}
                                                                                loading={isVerifying}
                                                                                disabled={!verificationCode}
                                                                            >
                                                                                {t("notifVerifyCode") || "Проверить"}
                                                                            </Button>
                                                                        }
                                                                    />
                                                                    {verificationStatus === 'error' && (
                                                                        <Text type="danger">
                                                                            {t("notifCodeVerifyErrorDesc") || "Неверный код подтверждения"}
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
                                                                message={t("notifInstantTitle") || "Получение сообщений в панели управления"}
                                                                description={
                                                                    <>
                                                                        {t("notifInstantDesc") || "Уведомления будут отображаться в панели управления в режиме реального времени. Вы увидите все важные события работы вашего агента прямо в интерфейсе."}
                                                                        <br/>
                                                                        <Text type="secondary">
                                                                            {t("notifInstantNoSetup") || "Этот канал не требует дополнительной настройки - просто включите его."}
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
                                                                    {t("notifRemoveButton") || "Удалить канал"}
                                                                </Button>
                                                            )}
                                                        </div>
                                                        <div className="channel-actions-right">
                                                            <Button
                                                                onClick={() => toggleExpand(channel.key)}
                                                            >
                                                                {t("cancel") || "Отмена"}
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
                                                                {t("save") || "Сохранить"}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {!channel.isExpanded && (
                                                <div className="channel-actions">
                                                    <div className="channel-actions-left">
                                                        <Text type="secondary">
                                                            {channel.data ? (t("configured") || 'Настроен') : (t("requiresSetup") || 'Требует настройки')}
                                                        </Text>
                                                    </div>
                                                    <div className="channel-actions-right">
                                                        <Button
                                                            style={{color: "black"}}
                                                            type="primary"
                                                            onClick={() => toggleExpand(channel.key)}
                                                        >
                                                            {t("settings") || "Настройки"}
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
                                                {t("notifEventsTitle") || "События для уведомлений"}
                                            </Title>
                                            <Text className="events-subtitle">
                                                {t("notifEventsDesc") || "Выберите события агента, о которых вы будете получать уведомления"}
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
                                                            <FaPlay/>
                                                        </div>
                                                        <Text
                                                            className="event-name">{t("notifStartDialog") || "Начало диалога"}</Text>
                                                    </div>
                                                    <Switch
                                                        checked={startDialog}
                                                        onChange={async () => {
                                                            const newValue = !startDialog;
                                                            setStartDialog(newValue);
                                                            await saveNotification({start: newValue});
                                                        }}
                                                        checkedChildren={<span
                                                            style={{color: "black"}}>{t("notifEnabled") || "Включен"}</span>}
                                                        unCheckedChildren={<span
                                                            style={{color: "black"}}>{t("notifDisabled") || "Выключен"}</span>}
                                                        style={{color: "black"}}
                                                    />
                                                </div>
                                                <div className="event-card-content">
                                                    <Alert
                                                        style={{height: '270px'}}
                                                        message={t("notifStartDialogTitle") || "Старт нового диалога"}
                                                        description={t("notifStartDialogDesc") || "Получать уведомление о начале диалога. Агент пришлёт уведомление с данными пользователя, начавшего диалог"}
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
                                                            <FaStop/>
                                                        </div>
                                                        <Text
                                                            className="event-name">{t("notifEndDialog") || "Окончание диалога"}</Text>
                                                    </div>
                                                    <Switch
                                                        checked={endDialog}
                                                        onChange={async () => {
                                                            const newValue = !endDialog;
                                                            setEndDialog(newValue);
                                                            await saveNotification({end: newValue});
                                                        }}
                                                        checkedChildren={<span
                                                            style={{color: "black"}}>{t("notifEnabled") || "Включен"}</span>}
                                                        unCheckedChildren={<span
                                                            style={{color: "black"}}>{t("notifDisabled") || "Выключен"}</span>}
                                                        style={{color: "black"}}
                                                    />
                                                </div>
                                                <div className="event-card-content">
                                                    <Alert
                                                        style={{height: '270px'}}
                                                        message={t("notifEndDialogTitle") || "Окончание диалога"}
                                                        description={t("notifEndDialogDesc") || "Получать уведомление при окончании диалога. Агент пришлёт уведомление с данными пользователя при окончании диалога, если это поддерживается каналом"}
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
                                                            <FiTarget/>
                                                        </div>
                                                        <Text
                                                            className="event-name">{t("notifTargetReached") || "Достижение цели"}</Text>
                                                    </div>
                                                    <Switch
                                                        checked={targetDialog}
                                                        onChange={async () => {
                                                            const newValue = !targetDialog;
                                                            setTargetDialog(newValue);
                                                            await saveNotification({target: newValue});
                                                        }}
                                                        checkedChildren={<span
                                                            style={{color: "black"}}>{t("notifEnabled") || "Включен"}</span>}
                                                        unCheckedChildren={<span
                                                            style={{color: "black"}}>{t("notifDisabled") || "Выключен"}</span>}
                                                        style={{color: "black"}}
                                                    />
                                                </div>
                                                <div className="event-card-content">
                                                    <Alert
                                                        style={{height: '270px'}}
                                                        message={t("notifTargetReachedTitle") || "Достижение цели диалога"}
                                                        description={t("notifTargetReachedDesc") || "Получать уведомление при достижении цели, заданной в настройках модели. Агент пришлёт уведомление с данными пользователя при достижении цели"}
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
                                    maskClassName="blur-modal-mask"
                                    maskClosable={false}
                                    zIndex={20000}
                                    footer={[
                                        <Button key="cancel" onClick={handleCancelRemove}>
                                            {t("cancel") || "Отмена"}
                                        </Button>,
                                        <Button key="confirm" danger type="primary" onClick={handleConfirmRemove}>
                                            {t("delete") || "Удалить"}
                                        </Button>,
                                    ]}
                                >
                                    {t("notifRemoveConfirm") || "Вы уверены, что хотите удалить этот канал? Все настройки будут потеряны."}
                                </Modal>
                            </>
                        )}
                    </div>
                </div>

                {/* Панель управления Tour справа - показывается только когда tourPanelVisible = true */}
                {tourPanelVisible && (
                    <div className="tour-controls tour-primary">
                        <div className="tour-controls-header">
                            <PlayCircleOutlined className="tour-controls-icon"/>
                            <h3 className="tour-controls-title">
                                {t("notifTourTitle") || "Интерактивный обзор"}
                            </h3>
                            <p className="tour-controls-subtitle">
                                {t("notifTourSubtitle") || "Изучите настройки уведомлений пошагово"}
                            </p>
                        </div>

                        <div className="tour-start-button">
                            <Button
                                type="primary"
                                block
                                size="large"
                                onClick={startTour}
                            >
                                {t("notifTourStart") || "🚀 Начать тур"}
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
                            <div className="tour-info-title">{t("notifTourWhatYouLearn") || "📋 Что вы изучите:"}</div>
                            <ul className="tour-info-list">
                                <li>{t("notifTourLearn1") || "Добавление каналов уведомлений"}</li>
                                <li>{t("notifTourLearn2") || "Настройку Email и Telegram"}</li>
                                <li>{t("notifTourLearn3") || "Выбор событий для мониторинга"}</li>
                                <li>{t("notifTourLearn4") || "Управление статусами каналов"}</li>
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
                icon={<QuestionCircleOutlined/>}
                tooltip={t("notifTourTooltip") || "Начать обзор настроек уведомлений"}
                onClick={showTourPanel}
                className="tour-float-button"
            />

            {/* Модальное окно перезапуска сервисов */}
            <Modal
                title={restartProgressVisible ? (t("createModelRestartTitleProgress") || "Перезапуск сервисов в процессе...") : (t("createModelRestartTitle") || "Перезапуск сервисов")}
                open={isRestartServicesModalOpen}

                onOk={async () => {
                    if (!restartProgressVisible) {
                        // Начинаем процесс перезапуска
                        try {
                            setRestartLoading(true);
                            setRestartProgressVisible(true);
                            setRestartMessages([]);
                            setRestartComplete(false);


                            // Функция для перевода сообщений от сервера
                            const translateMessage = (msg) => {
                                const translations = {
                                    '🔌 Соединение с сервером установлено': t("chUtilsConnectionEstablished") || '🔌 Соединение с сервером установлено',
                                    '✅ Перезапуск сервисов завершен успешно': t("chUtilsRestartCompleted") || '✅ Перезапуск сервисов завершен успешно',
                                    '❌ Произошла ошибка при перезапуске сервисов': t("chUtilsRestartError") || '❌ Произошла ошибка при перезапуске сервисов',
                                    '❌ Ошибка соединения с сервером': t("chUtilsConnectionError") || '❌ Ошибка соединения с сервером'
                                };
                                return translations[msg] || msg;
                            };

                            // Передаём callback для получения сообщений
                            await restartActiveChannels((message) => {
                                setRestartMessages(prev => [...prev, translateMessage(message)]);
                            });

                            setRestartComplete(true);
                            setRestartLoading(false);

                            setTimeout(() => {
                                showNotification(t("createModelRestartSuccess") || 'Успешно', t("createModelRestartSuccessMsg") || 'Активные сервисы перезапущены');
                                setRestartProgressVisible(false);
                                setIsRestartServicesModalOpen(false);
                            }, 2000);

                        } catch (error) {
                            setRestartMessages(prev => [...prev, `❌ ${error.message || (t("createModelRestartErrorMsg") || 'Ошибка при перезапуске активных сервисов')}`]);
                            showErrorNotification(t("createModelRestartError") || 'Ошибка', error.message || (t("createModelRestartErrorMsg") || 'Ошибка при перезапуске активных сервисов'));
                            setRestartLoading(false);
                        }
                    } else {
                        // Закрываем окно после завершения
                        setRestartProgressVisible(false);
                        setIsRestartServicesModalOpen(false);
                    }
                }}
                onCancel={() => {
                    setRestartProgressVisible(false);
                    setIsRestartServicesModalOpen(false);
                }}
                okText={restartProgressVisible ? (t("createModelRestartOkComplete") || "Закрыть") : (t("createModelRestartOk") || "Перезапустить")}
                okButtonProps={{
                    style: {color: 'black'},
                    disabled: restartLoading
                }}
                cancelText={t("channelsCancelButton") || "Отмена"}
                cancelButtonProps={{
                    style: {display: restartProgressVisible ? 'none' : 'inline-block'}
                }}
                closable={!restartLoading}
                maskClosable={false}
                centered
                zIndex={10000}
            >
                {!restartProgressVisible ? (
                    <p>{t("createModelRestartText") || "Есть активные сервисы работающие со старой моделью Агента, перезапустить сервисы?"}</p>
                ) : (
                    <>
                        {restartLoading && <Spin size="large"/>}
                        <div style={{marginTop: '20px', maxHeight: '300px', overflowY: 'auto'}}>
                            {restartMessages.map((msg, index) => (
                                <div key={index} style={{
                                    marginBottom: '8px',
                                    padding: '8px',
                                    backgroundColor: 'var(--dialog-bg-color)',
                                    borderRadius: '4px'
                                }}>
                                    {msg}
                                </div>
                            ))}
                        </div>
                        {restartComplete && (
                            <div style={{marginTop: '16px', textAlign: 'center'}}>
                                <CheckCircleOutlined style={{fontSize: '24px', color: '#52c41a', marginRight: '8px'}}/>
                                <span>{t("createModelRestartComplete") || "Перезапуск завершен!"}</span>
                            </div>
                        )}
                    </>
                )}
            </Modal>
        </div>
    );
}
