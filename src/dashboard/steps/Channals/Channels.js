import React, {useCallback, useEffect, useRef, useState} from "react";
import {AddChannel} from "./addChanal";
import {
    AndroidOutlined,
    CommentOutlined,
    GlobalOutlined,
    PlayCircleOutlined,
    QuestionCircleOutlined
} from "@ant-design/icons";
import {Badge, Button, Card, Empty, FloatButton, Modal, Spin, Switch, Tour, Typography} from "antd";
import {showErrorNotification, showNotification, showWarningNotification} from "../../hotification/showNotification";
import {FaInstagram, FaTelegramPlane, FaWhatsapp} from 'react-icons/fa';
import AvitoIcon from "./AvitoIcon";
import {TBotSection} from "./sections/TBotSection";
import {WidgetSection} from "./sections/WidgetSection";
import {TelegramAuthService} from "./telegramAuthService";
import {TgUserBotSection} from "./sections/TgUserBotSection";
import {telegramGetContact} from "./telegramGetContact";
import {WhatsBotSection} from "./sections/WhatsBotSection";
import {WhatsAuthServive} from "./whatsAuthServive";
import {whatsappGetContact} from "./whatsappGetContact";
import {getTourPanelState, setTourPanelState} from "../../../utils/cookieUtils";
import {
    chAvailable,
    checkSubscription,
    deleteChannelData,
    readChannelData,
    saveChannelData
} from "./chUtils";
import {useTranslation} from "react-i18next";
import {AvitoSection} from "./sections/AvitoSection";
import {checkHayModel} from "../CreateModelFormElements/modUtils";

// Сервер может вернуть пустые данные как {}, "{}", пустую строку или null.
// Объекты и строки нужно проверять по содержимому, а не только по truthiness.
const hasChannelData = (data) => {
    if (data === null || data === undefined) return false;

    if (typeof data === "string") {
        const value = data.trim();
        if (!value) return false;

        try {
            return hasChannelData(JSON.parse(value));
        } catch {
            return true;
        }
    }

    if (Array.isArray(data)) return data.length > 0;
    if (typeof data === "object") return Object.keys(data).length > 0;

    return true;
};


export const Channels = () => {
    const {t} = useTranslation();
    const {Text} = Typography;
    const [loading, setLoading] = useState(true);
    const [modelData, setModelData] = useState(false);
    const [availableChannels, setAvailableChannels] = useState([
        {
            key: "tbot",
            label: "Telegram Bot",
            icon: <FaTelegramPlane/>,
            isExpanded: false,
            isEnabled: false,
            data: ''
        },
        {
            key: "widg",
            label: "WEB Widget",
            icon: <CommentOutlined/>,
            isExpanded: false,
            isEnabled: false,
            data: ''
        },
        {
            key: "tguserbot",
            label: "Telegram UserBot",
            icon: <FaTelegramPlane/>,
            isExpanded: false,
            isEnabled: false,
            data: '',
            options: {text: true, call: true},
            contacts: '',
            contactsIds: []
        },
        {
            key: "whatsbot",
            label: "WhatsApp UserBot",
            icon: <FaWhatsapp/>,
            isExpanded: false,
            isEnabled: false,
            data: '',
            contacts: '',
            contactsIds: []
        },
        {
            key: "avito",
            label: "Avito",
            // icon: <AvitoIcon size={10} />,
            icon: <AvitoIcon/>,
            isExpanded: false,
            isEnabled: false,
            data: '',
            isConnected: false
        },
        {
            key: "insta",
            label: "Instagram UserBot",
            icon: <FaInstagram/>,
            isExpanded: false,
            isEnabled: false,
            data: '',
            contacts: '',
            contactsIds: []
        }
    ]); // Элементы меню
    const [selectedChannels, setSelectedChannels] = useState([]); // Выбранные элементы
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [channelToRemove, setChannelToRemove] = useState(null);
    // const [isGeneratingCode, setIsGeneratingCode] = useState(false);
    const [isGeneratingQRCode, setIsGeneratingQRCode] = useState(false);
    const [showQRCode, setShowQRCode] = useState(false);
    const [isLoadingContacts, setIsLoadingContacts] = useState(false);
    const [contactsLoadingStatus, setContactsLoadingStatus] = useState({message: '', progress: 0});

    const [authService, setAuthService] = useState(null);
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [needPassword, setNeedPassword] = useState(false);
    const [password2FA, setPassword2FA] = useState('');
    const [passwordModalVisible, setPasswordModalVisible] = useState(false);
    const [tourVisible, setTourVisible] = useState(false);
    const [current, setCurrent] = useState(0);
    const [tourPanelVisible, setTourPanelVisible] = useState(getTourPanelState('channels')); // Состояние для видимости панели


    // Состояние для хранения исходных значений каналов
    const [originalChannelStates, setOriginalChannelStates] = useState({});

    // Состояние рядом с другими useState
    const [switchDisabled, setSwitchDisabled] = useState({});

    // Refs для Tour targets
    const channelsHeaderRef = useRef(null);
    const addChannelRef = useRef(null);
    const channelsListHeaderRef = useRef(null);
    const channelsListRef = useRef(null); // Изменено с channelsGridRef на channelsListRef

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const fetchChannelData = useCallback(async () => {
        try {
            // Проверяем наличие модели без загрузки всех её данных.
            const modelCheckResult = await checkHayModel();
            if (modelCheckResult.success && modelCheckResult.status === true) {
                setModelData(true);

                // Получаем данные о каналах
                const channelsData = await readChannelData();
                if (channelsData) {
                    // Создаем базовый набор каналов внутри функции, независимо от текущего состояния
                    const baseChannels = [
                        {
                            key: "tbot",
                            label: "Telegram Bot",
                            icon: <FaTelegramPlane/>,
                            isExpanded: false,
                            isEnabled: false,
                            data: ''
                        },
                        {
                            key: "widg",
                            label: "WEB Widget",
                            icon: <CommentOutlined/>,
                            isExpanded: false,
                            isEnabled: false,
                            data: ''
                        },
                        {
                            key: "tguserbot",
                            label: "Telegram UserBot",
                            icon: <FaTelegramPlane/>,
                            isExpanded: false,
                            isEnabled: false,
                            data: '',
                            options: {text: true, call: true},
                            contacts: '',
                            contactsIds: []
                        },
                        {
                            key: "whatsbot",
                            label: "WhatsApp UserBot",
                            icon: <FaWhatsapp/>,
                            isExpanded: false,
                            isEnabled: false,
                            data: '',
                            contacts: '',
                            contactsIds: []
                        },
                        {
                            key: "avito",
                            label: "Avito",
                            icon: <AvitoIcon size={15}/>,
                            isExpanded: false,
                            isEnabled: false,
                            data: '',
                            isConnected: false
                        },
                        {
                            key: "insta",
                            label: "Instagram Bot",
                            icon: <FaInstagram/>,
                            isExpanded: false,
                            isEnabled: false,
                            data: '',
                            contacts: '',
                            contactsIds: []
                        }
                    ];

                    const newAvailableChannels = [...baseChannels];
                    const newSelectedChannels = [];

                    // Обработка Telegram бота
                    if (channelsData.tgbot && hasChannelData(channelsData.tgbot.data)) {
                        const tgChannel = newAvailableChannels.find(ch => ch.key === "tbot");
                        if (tgChannel) {
                            const index = newAvailableChannels.indexOf(tgChannel);
                            if (index > -1) {
                                newAvailableChannels.splice(index, 1);
                            }
                            try {
                                const rawData = channelsData.tgbot.data;
                                const parsedData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
                                newSelectedChannels.push({
                                    ...tgChannel,
                                    data: typeof rawData === 'string' ? rawData : JSON.stringify(parsedData),
                                    isEnabled: Boolean(channelsData.tgbot.enabled)
                                });
                            } catch (error) {
                                console.error("Ошибка обработки данных Telegram Bot:", error);
                                // В случае ошибки добавляем канал с пустыми данными
                                newSelectedChannels.push({
                                    ...tgChannel,
                                    data: JSON.stringify({token: ''}),
                                    isEnabled: Boolean(channelsData.tgbot.enabled)
                                });
                            }
                        }
                    }

                    // Обработка виджета
                    if (channelsData.widget && hasChannelData(channelsData.widget.data)) {
                        const widgetChannel = newAvailableChannels.find(ch => ch.key === "widg");
                        if (widgetChannel) {
                            const index = newAvailableChannels.indexOf(widgetChannel);
                            if (index > -1) {
                                newAvailableChannels.splice(index, 1);
                            }
                            try {
                                const widgetData = channelsData.widget.data;
                                const scriptData = typeof widgetData === 'object' ? widgetData : widgetData;
                                newSelectedChannels.push({
                                    ...widgetChannel,
                                    data: scriptData || '',
                                    isEnabled: Boolean(channelsData.widget.enabled)
                                });
                            } catch (error) {
                                console.error("Ошибка обработки данных Widget:", error);
                                newSelectedChannels.push({
                                    ...widgetChannel,
                                    data: '',
                                    isEnabled: Boolean(channelsData.widget.enabled)
                                });
                            }
                        }
                    }

                    // Обработка WhatsApp UserBot
                    if (channelsData.whatsbot && hasChannelData(channelsData.whatsbot.data)) {
                        const whatsChannel = newAvailableChannels.find(ch => ch.key === "whatsbot");
                        if (whatsChannel) {
                            const index = newAvailableChannels.indexOf(whatsChannel);
                            if (index > -1) {
                                newAvailableChannels.splice(index, 1);
                            }

                            let uidsArray = [];
                            let dataWithoutUids = {};

                            try {
                                let whatsData;

                                // Проверяем тип данных - они могут приходить как объект или JSON строка
                                if (typeof channelsData.whatsbot.data === 'string') {
                                    whatsData = JSON.parse(channelsData.whatsbot.data);
                                } else {
                                    whatsData = channelsData.whatsbot.data;
                                }

                                // Извлекаем Uids если они есть
                                if (whatsData.Uids) {
                                    uidsArray = whatsData.Uids.split(' ').filter(id => id.trim() !== '');
                                    // Создаем копию объекта без поля Uids
                                    dataWithoutUids = {...whatsData};
                                    delete dataWithoutUids.Uids;
                                } else {
                                    dataWithoutUids = whatsData;
                                }

                                newSelectedChannels.push({
                                    ...whatsChannel,
                                    data: JSON.stringify(dataWithoutUids),
                                    contacts: uidsArray.length > 0 ? "added" : "",
                                    contactsIds: uidsArray,
                                    isEnabled: Boolean(channelsData.whatsbot.enabled)
                                });
                            } catch (error) {
                                console.error("Ошибка обработки данных WhatsApp:", error);
                                // В случае ошибки сохраняем оригинальные данные
                                newSelectedChannels.push({
                                    ...whatsChannel,
                                    data: typeof channelsData.whatsbot.data === 'object'
                                        ? JSON.stringify(channelsData.whatsbot.data)
                                        : channelsData.whatsbot.data || '{}',
                                    contacts: '',
                                    contactsIds: [],
                                    isEnabled: Boolean(channelsData.whatsbot.enabled)
                                });
                            }
                        }
                    }

                    if (channelsData.tguserbot && hasChannelData(channelsData.tguserbot.data)) {
                        let uidsArray = [];
                        let tokenDataString = '';
                        let options = {text: true, call: true};

                        try {
                            const rawChannelData = channelsData.tguserbot.data;
                            let outerData = rawChannelData;

                            if (typeof rawChannelData === 'string') {
                                outerData = JSON.parse(rawChannelData);
                            }

                            const rawToken = outerData?.token ?? channelsData.tguserbot.token;
                            tokenDataString = typeof rawToken === 'string'
                                ? rawToken
                                : rawToken
                                    ? JSON.stringify(rawToken)
                                    : '';
                            options = {
                                text: outerData?.options?.text ?? true,
                                call: outerData?.options?.call ?? true,
                                ...(outerData?.options || {})
                            };

                            if (outerData?.options?.uids) {
                                uidsArray = outerData.options.uids.split(' ').filter(id => id.trim() !== '');
                            }
                        } catch (error) {
                            console.error("Ошибка обработки данных:", error.message, channelsData.tguserbot);
                        }

                        // Находим и обновляем канал
                        const data = newAvailableChannels.find(ch => ch.key === "tguserbot");
                        if (data) {
                            const index = newAvailableChannels.indexOf(data);
                            if (index > -1) {
                                newAvailableChannels.splice(index, 1);
                            }

                            newSelectedChannels.push({
                                ...data,
                                data: JSON.stringify({token: tokenDataString, options}),
                                phone: channelsData.tguserbot.phone || '',
                                appId: channelsData.tguserbot.appID || channelsData.tguserbot.appId || '',
                                appHash: channelsData.tguserbot.appHash || '',
                                options,
                                contacts: uidsArray.length > 0 ? "added" : "",
                                contactsIds: uidsArray,
                                isEnabled: Boolean(channelsData.tguserbot.enabled)
                            });
                        }
                    }

                    // Обработка Instagram Bot НЕВЕРНАЯ ТЕСТОВАЯ РЕАЛИЗАЦИЯ!!!
                    if (channelsData.insta && hasChannelData(channelsData.insta.data)) {
                        const instaChannel = newAvailableChannels.find(ch => ch.key === "insta");
                        if (instaChannel) {
                            const index = newAvailableChannels.indexOf(instaChannel);
                            if (index > -1) {
                                newAvailableChannels.splice(index, 1);
                            }

                            let uidsArray = [];
                            let dataWithoutUids = {};

                            try {
                                let instaData;

                                // Проверяем тип данных - они могут приходить как объект или JSON строка
                                if (typeof channelsData.insta.data === 'string') {
                                    instaData = JSON.parse(channelsData.insta.data);
                                } else {
                                    instaData = channelsData.insta.data;
                                }

                                // Извлекаем Uids если они есть
                                if (instaData.Uids) {
                                    uidsArray = instaData.Uids.split(' ').filter(id => id.trim() !== '');
                                    // Создаем копию объекта без поля Uids
                                    dataWithoutUids = {...instaData};
                                    delete dataWithoutUids.Uids;
                                } else {
                                    dataWithoutUids = instaData;
                                }

                                newSelectedChannels.push({
                                    ...instaChannel,
                                    data: JSON.stringify(dataWithoutUids),
                                    contacts: uidsArray.length > 0 ? "added" : "",
                                    contactsIds: uidsArray,
                                    isEnabled: Boolean(channelsData.insta.enabled)
                                });
                            } catch (error) {
                                console.error("Ошибка обработки данных Instagram:", error);
                                // В случае ошибки сохраняем оригинальные данные
                                newSelectedChannels.push({
                                    ...instaChannel,
                                    data: typeof channelsData.insta.data === 'object'
                                        ? JSON.stringify(channelsData.insta.data)
                                        : channelsData.insta.data || '{}',
                                    contacts: '',
                                    contactsIds: [],
                                    isEnabled: Boolean(channelsData.insta.enabled)
                                });
                            }
                        }
                    }

                    // Обработка Avito Bot
                    if (channelsData.avito && hasChannelData(channelsData.avito.data)) {
                        const avitoChannel = newAvailableChannels.find(ch => ch.key === "avito");
                        if (avitoChannel) {
                            const index = newAvailableChannels.indexOf(avitoChannel);
                            if (index > -1) {
                                newAvailableChannels.splice(index, 1);
                            }

                            // Проверяем, был ли канал уже в selectedChannels (чтобы сохранить isExpanded)
                            const existingChannel = selectedChannels.find(ch => ch.key === "avito");

                            try {
                                let avitoData;

                                // Проверяем тип данных
                                if (typeof channelsData.avito.data === 'string') {
                                    avitoData = JSON.parse(channelsData.avito.data);
                                } else {
                                    avitoData = channelsData.avito.data;
                                }

                                newSelectedChannels.push({
                                    ...avitoChannel,
                                    data: JSON.stringify(avitoData),
                                    isEnabled: Boolean(channelsData.avito.enabled),
                                    isConnected: true,
                                    isExpanded: existingChannel ? existingChannel.isExpanded : false
                                });
                            } catch (error) {
                                console.error("Ошибка обработки данных Avito:", error);
                                newSelectedChannels.push({
                                    ...avitoChannel,
                                    data: typeof channelsData.avito.data === 'object'
                                        ? JSON.stringify(channelsData.avito.data)
                                        : channelsData.avito.data || '{}',
                                    isEnabled: Boolean(channelsData.avito.enabled),
                                    isConnected: false,
                                    isExpanded: existingChannel ? existingChannel.isExpanded : false
                                });
                            }
                        }
                    }

                    setAvailableChannels(newAvailableChannels);
                    setSelectedChannels(newSelectedChannels);
                }
            } else {
                showWarningNotification(t("authError") || "Ошибка авторизации", t("tokenNotFound") || "Токен не найден");
            }
        } catch (error) {
            console.error("Ошибка при загрузке данных каналов:", error);
        } finally {
            setLoading(false); // Гарантируем вызов setLoading(false) в любом случае
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Убираем selectedChannels из зависимостей, чтобы предотвратить бесконечный цикл

    useEffect(() => {
        const fetchDataAsync = async () => {
            try {
                await fetchChannelData();
            } catch (error) {
                console.error("Ошибка при загрузке данных:", error);
            }
        };
        fetchDataAsync();
    }, [fetchChannelData]);

    if (loading) {
        return <div className="notifications-loading">
            <Spin size="large"/>
            <Text className="loading-text">
                Загрузка данных...
            </Text>
        </div>
    }

    async function checkChAvailable(key) {
        switch (key) {
            case "widg":
                return await chAvailable('widget');
            case "tbot":
                return await chAvailable('tgbot');
            case "whatsbot":
                return await chAvailable('whats');
            case "tguserbot":
                return await chAvailable('tguser');
            case "insta":
                return await chAvailable('insta');
            case "avito":
                return await chAvailable('avito');
            default:
                return false;
        }
    }

    const handleChannelSelect = async (key) => {
        const isAvailable = await checkChAvailable(key);
        if (!isAvailable) {
            showErrorNotification(t("error") || "Ошибка", t("channelUnavailable") || "Этот канал сейчас недоступен");
            return;
        }
        const selectedChannel = availableChannels.find((channel) => channel.key === key);
        if (selectedChannel) {
            setSelectedChannels([...selectedChannels, selectedChannel]);
            setAvailableChannels(availableChannels.filter((channel) => channel.key !== key));
        }
    };

    const showRemoveConfirmation = (key) => {
        setChannelToRemove(key);
        setIsModalVisible(true);
    };

    const handleConfirmRemove = async () => {
        const removedChannel = selectedChannels.find((channel) => channel.key === channelToRemove);
        if (removedChannel) {
            const channelType = getChanelName(removedChannel.key)
            const success = await deleteChannelData(channelType);

            if (success) {
                // Создаем очищенную копию канала для возврата в доступные
                const clearedChannel = {
                    ...removedChannel,
                    data: '',
                    isEnabled: false,
                    isExpanded: false,
                    contacts: '',
                    contactsIds: []
                };

                // Обновляем состояние UI только если удаление прошло успешно
                setAvailableChannels(prev => [...prev, clearedChannel]);
                setSelectedChannels(prev => prev.filter((channel) => channel.key !== channelToRemove));
                showNotification(t("channelDeleted") || "Канал удален", t("channelDeletedSuccess") || "Канал успешно удален из системы");
            } else {
                showErrorNotification(t("channelDeleteError") || "Ошибка удаления", t("channelDeleteFailed") || "Не удалось удалить канал");
            }
        }

        setIsModalVisible(false);
        setChannelToRemove(null);
    };

    const handleCancelRemove = () => {
        setIsModalVisible(false);
        setChannelToRemove(null);
    };

    const handleGetTgQR = async () => {
        try {
            setIsGeneratingQRCode(true);
            setShowQRCode(false);

            const channel = selectedChannels.find(ch => ch.key === "tguserbot");
            if (!channel || !channel.phone || !channel.appId || !channel.appHash) {
                showErrorNotification(t("error") || "Ошибка", t("channelAuthRequired") || "Укажите все параметры для авторизации");
                setIsGeneratingQRCode(false);
                return;
            }

            // Создаем сервис авторизации
            const service = new TelegramAuthService(t);
            setAuthService(service);

            // Настраиваем обработчики событий
            service.setCallbacks({
                onQrCode: (qrUrl) => {
                    setQrCodeUrl(qrUrl);
                    setShowQRCode(true);
                    setIsGeneratingQRCode(false);
                },
                onPasswordRequest: () => {
                    setNeedPassword(true);
                    setShowQRCode(false);
                    setPasswordModalVisible(true);
                },
                // onSuccess: (message) => {
                onSuccess: async () => {
                    // showNotification("Успех", message);
                    showNotification(t("channelAuthSuccess") || "Успех", t("channelAuthCompleted") || "Авторизация успешно завершена");
                    setShowQRCode(false);
                    setIsGeneratingQRCode(false);
                    // Обновляем все данные каналов через централизованную функцию
                    await fetchChannelData();
                },
                onUpdateToken: () => {
                    showWarningNotification(t("authError") || "Ошибка авторизации", t("tokenNotFound") || "Токен не найден");
                    setShowQRCode(false);
                    setIsGeneratingQRCode(false);
                },
                onError: (error) => {
                    showErrorNotification(t("authError") || "Ошибка авторизации", error);
                    setShowQRCode(false);
                    setIsGeneratingQRCode(false);
                }
            });

            // Начинаем процесс авторизации
            await service.startAuthentication({
                appId: channel.appId,
                appHash: channel.appHash,
                phone: channel.phone,
            });

        } catch (error) {
            console.error("Ошибка запуска авторизации:", error);
            showErrorNotification(t("error") || "Ошибка", t("channelAuthStartError") || "Не удалось начать процесс авторизации");
            setIsGeneratingQRCode(false);
        }
    };

    const handleGetWhatsQR = async () => {
        try {
            setIsGeneratingQRCode(true);
            setShowQRCode(false);

            // const channel = selectedChannels.find(ch => ch.key === "whatsbot");

            // Создаем сервис авторизации
            const service = new WhatsAuthServive(t);
            setAuthService(service);

            // Настраиваем обработчики событий
            service.setCallbacks({
                onQrCode: (qrUrl) => {
                    setQrCodeUrl(qrUrl);
                    setShowQRCode(true);
                    setIsGeneratingQRCode(false);
                },
                onQrSuccess: async () => {
                    showNotification(t("channelQRCodeScanned") || "QR код", t("channelQRCodeScannedMessage") || "Отсканирован, завершение авторизации...");
                    setShowQRCode(false);
                    setIsGeneratingQRCode(false);
                },
                onSuccess: async () => {
                    showNotification(t("channelAuthSuccess") || "Успех", t("channelAuthCompleted") || "Авторизация успешно завершена");
                    // На всякий случай, скрываю QR-код, хотя он уже не должен быть скрыт
                    setShowQRCode(false);
                    setIsGeneratingQRCode(false);
                    // Обновляем все данные каналов через централизованную функцию
                    await fetchChannelData();
                },
                onUpdateToken: () => {
                    showWarningNotification(t("authError") || "Ошибка авторизации", t("tokenNotFound") || "Токен не найден");
                    setShowQRCode(false);
                    setIsGeneratingQRCode(false);
                },
                onError: (error) => {
                    showErrorNotification(t("authError") || "Ошибка авторизации", error);
                    setShowQRCode(false);
                    setIsGeneratingQRCode(false);
                }
            });

            // Начинаем процесс авторизации
            await service.startAuthentication();

        } catch (error) {
            console.error("Ошибка запуска авторизации:", error);
            showErrorNotification(t("error") || "Ошибка", t("channelAuthStartError") || "Не удалось начать процесс авторизации");
            setIsGeneratingQRCode(false);
        }
    };

    const handleGetTgContacts = async () => {
        try {
            setIsLoadingContacts(true);
            setContactsLoadingStatus({message: 'Инициализация...', progress: 0});

            const response = await telegramGetContact(
                (progressData) => {
                    // Обновляем статус загрузки для отображения пользователю
                    setContactsLoadingStatus({
                        message: progressData.message,
                        progress: progressData.progress,
                        current: progressData.current,
                        total: progressData.total
                    });
                },
                t
            );

            // Данные уже приходят в правильном формате из telegramGetContact
            // Просто форматируем поля для совместимости с ContactsModal
            const formattedContacts = {
                humans: response.humans ? response.humans.map(human => ({
                    id: human.id,
                    firstName: human.first_name || "",
                    lastName: human.last_name || "",
                    phone: human.phone,
                    username: human.username
                })) : [],
                bots: response.bots ? response.bots.map(bot => ({
                    id: bot.id,
                    firstName: bot.first_name || "",
                    lastName: bot.last_name || "",
                    username: bot.username
                })) : [],
                channels: response.channels ? response.channels.map(channel => ({
                    id: channel.id,
                    firstName: channel.title || "",
                    title: channel.title,
                    username: channel.username
                })) : [],
                groups: response.groups ? response.groups.map(group => ({
                    id: group.id,
                    firstName: group.title || "",
                    title: group.title
                })) : [],
                supergroups: response.supergroups ? response.supergroups.map(group => ({
                    id: group.id,
                    firstName: group.title || "",
                    title: group.title
                })) : []
            };

            setSelectedChannels(prevChannels =>
                prevChannels.map(channel =>
                    channel.key === "tguserbot"
                        ? {...channel, contacts: formattedContacts}
                        : channel
                )
            );
        } catch (error) {
            console.error('Ошибка при получении контактов:', error);
            setContactsLoadingStatus({message: `Ошибка: ${error.message}`, progress: 0});
            showErrorNotification(t("error") || "Ошибка", t("channelContactsError") || "Не удалось получить контакты, попробуйте позже");

            // Важно: выбрасываем ошибку дальше, чтобы openContactsModal знал о неудаче
            throw error;
        } finally {
            setIsLoadingContacts(false);
            // Очищаем статус через небольшую задержку
            setTimeout(() => {
                setContactsLoadingStatus({message: '', progress: 0});
            }, 2000);
        }
    };

    const handleGetWaContacts = async () => {
        try {
            setIsLoadingContacts(true);
            setContactsLoadingStatus({message: 'Инициализация...', progress: 0});

            const response = await whatsappGetContact(
                (progressData) => {
                    // Обновляем статус загрузки для отображения пользователю
                    setContactsLoadingStatus({
                        message: progressData.message,
                        progress: progressData.progress,
                        current: progressData.current,
                        total: progressData.total
                    });
                },
                t
            );

            // Теперь response - это простой массив контактов
            // Форматируем их в структуру, ожидаемую ContactsModal
            const formattedContacts = {
                humans: response ? response.map(contact => ({
                    id: contact.id,
                    firstName: contact.first_name || contact.name || "",
                    lastName: contact.last_name,
                    phone: contact.phone,
                    username: contact.username
                })) : [],
                bots: [], // WhatsApp не различает ботов, все контакты считаются людьми
                channels: [],
                groups: [],
                supergroups: []
            };

            setSelectedChannels(prevChannels =>
                prevChannels.map(channel =>
                    channel.key === "whatsbot"
                        ? {...channel, contacts: formattedContacts}
                        : channel
                )
            );
        } catch (error) {
            console.error('Ошибка при получении контактов WhatsApp:', error);
            setContactsLoadingStatus({message: `Ошибка: ${error.message}`, progress: 0});
            // showErrorNotification("Ошибка", "Не удалось получить контакты WhatsApp, попробуйте позже");

            // Важно: выбрасываем ошибку дальше, чтобы handleOpenContactsModal знал о неудаче
            throw error;
        } finally {
            setIsLoadingContacts(false);
            // Очищаем статус через небольшую задержку
            setTimeout(() => {
                setContactsLoadingStatus({message: '', progress: 0});
            }, 2000);
        }
    };

    const handleSubmitPassword = () => {
        if (authService && password2FA) {
            authService.submitPassword(password2FA);
            setPasswordModalVisible(false);
            // toggleExpand("tguserbot");
        }
    };


    const toggleExpand = (key) => {
        setSelectedChannels(
            selectedChannels.map((channel) => {
                if (channel.key === key) {
                    if (!channel.isExpanded) {
                        // При разворачивании сохраняем исходное состояние
                        setOriginalChannelStates(prev => ({
                            ...prev,
                            [key]: {
                                isEnabled: channel.isEnabled,
                                data: channel.data,
                                contacts: channel.contacts,
                                contactsIds: channel.contactsIds
                            }
                        }));
                    }
                    return {...channel, isExpanded: !channel.isExpanded};
                }
                return channel;
            })
        );
    };

    // Функция для отмены изменений
    const cancelChanges = (key) => {
        const originalState = originalChannelStates[key];
        if (originalState) {
            setSelectedChannels(
                selectedChannels.map((channel) => {
                    if (channel.key === key) {
                        return {
                            ...channel,
                            isEnabled: originalState.isEnabled,
                            data: originalState.data,
                            contacts: originalState.contacts,
                            contactsIds: originalState.contactsIds,
                            isExpanded: false
                        };
                    }
                    return channel;
                })
            );

            // Удаляем сохранённое состояние
            setOriginalChannelStates(prev => {
                const newState = {...prev};
                delete newState[key];
                return newState;
            });
        } else {
            // Если нет сохранённого состояния, просто сворачиваем
            toggleExpand(key);
        }
    };

    const getChanelName = (key) => {
        switch (key) {
            case "tbot":
                return "tgbot"
            case "widg":
                return "widget"
            case "tguserbot":
                return "tgubot"
            case "whatsbot":
                return "whatsbot"
            case "avito":
                return "avito"
            default:
                return "error"
        }
    }

    const saveData = async (key) => {
        const channel = selectedChannels.find(ch => ch.key === key);

        const channelType = getChanelName(channel.key)
        const success = await saveChannelData(channelType, channel.data, channel.contactsIds, channel.isEnabled);

        if (success) {
            if (channel.isEnabled) {
                showNotification(t("channelSaveSuccess") || "Канал сохранен и включён", t("channelSaveSuccessMessage") || "Агент работает с этим каналом!");
            } else {
                showNotification(t("channelSaveDisabled") || "Канал сохранен но не включён", t("channelSaveDisabledMessage") || "Агент не работает с этим каналом!");
            }
        } else {
            showErrorNotification(t("channelSaveError") || "Ошибка сохранения канала", t("channelSaveWarning") || "Агент не сможет взаимодействовать с этим каналом!");
        }

        // Close the expanded view after saving for all channel types
        toggleExpand(key);
    };

    // Простая обёртка, блокирует переключатель на 2 секунды
    // javascript
    const handleToggleWithDisable = async (key) => {
        setSwitchDisabled(prev => ({...prev, [key]: true}));
        try {
            await toggleSwitch(key);
        } catch (e) {
            // toggleSwitch уже показывает уведомления об ошибках, если нужно — можно обработать дополнительно
        } finally {
            // разблокируем сразу после завершения toggleSwitch
            setSwitchDisabled(prev => ({...prev, [key]: false}));
        }
    };

    const toggleSwitch = async (key) => {

        try {
            // Вызов метода проверки подписки, который вернет true/false
            const canToggle = await checkSubscription();

            if (canToggle) {
                const channel = selectedChannels.find(ch => ch.key === key);
                const newEnabledState = !channel.isEnabled;

                // Только если проверка прошла успешно, меняем состояние
                setSelectedChannels(
                    selectedChannels.map((ch) =>
                        ch.key === key
                            ? {...ch, isEnabled: newEnabledState}
                            : ch
                    )
                );

                // Для канала Avito автоматически сохраняем на сервере
                if (key === 'avito') {
                    const channelType = getChanelName(key);
                    const success = await saveChannelData(channelType, channel.data, channel.contactsIds, newEnabledState);

                    if (success) {
                        if (newEnabledState) {
                            showNotification(t("channelEnabled") || "Канал включён", "Avito канал активирован!");
                        } else {
                            showNotification(t("channelDisabled") || "Канал выключен", "Avito канал деактивирован!");
                        }
                    }
                }
            } else {
                // Если проверка не прошла, показываем уведомление
                showWarningNotification(
                    "Невозможно активировать канал",
                    "Необходимо продлить подписку"
                );
            }
        } catch (error) {
            console.error("Ошибка при проверке доступности канала:", error);
            showErrorNotification(t("error") || "Ошибка", t("channelCheckError") || "Не удалось проверить доступность канала");
        }
    };

    // Функция для запуска тура
    const startTour = () => {
        setTourVisible(true);
        setCurrent(0);
        setTourPanelState('channels', false); // Сохраняем состояние скрытой панели
    };

    // Функция для показа панели Tour при клике на FloatButton
    const showTourPanel = () => {
        setTourPanelVisible(true);
        setTourPanelState('channels', true); // Сохраняем состояние показанной панели
    };

    const hideTourPanel = () => {
        setTourPanelVisible(false);
        setTourPanelState('channels', false); // Сохраняем состояние скрытой панели
    };

    // Шаги Tour для Channels - обновленные без упоминания карточек
    const steps = [
        {
            title: t("channelsTourWelcome") || "🌐 Добро пожаловать в каналы связи",
            description: t("channelsTourWelcomeDesc") || "Здесь вы можете настроить различные каналы для взаимодействия пользователей с вашим агентом: Telegram Bot, Web Widget, Telegram UserBot и WhatsApp UserBot.",
            target: () => channelsHeaderRef.current,
        },
        {
            title: t("channelsTourAdd") || "➕ Добавление новых каналов",
            description: t("channelsTourAddDesc") || "Нажмите здесь, чтобы добавить новый канал связи. Доступны различные платформы: Telegram, WhatsApp, веб-виджеты для интеграции с сайтом.",
            target: () => addChannelRef.current,
        },
        {
            title: t("channelsTourList") || "📋 Список каналов",
            description: t("channelsTourListDesc") || "Здесь отображаются все настроенные каналы в удобном списочном формате. Каждый канал показывает статус, настройки и элементы управления.",
            target: () => channelsListHeaderRef.current,
        },
        {
            title: t("channelsTourManage") || "⚙️ Управление каналами",
            description: t("channelsTourManageDesc") || "Кликните на канал для настройки параметров, включения/выключения или удаления канала. Используйте переключатель для быстрого включения/отключения канала.",
            target: () => channelsListRef.current,
        },
        {
            title: t("channelsTourReady") || "✅ Готово к подключению!",
            description: t("channelsTourReadyDesc") || "Теперь вы знаете, как управлять каналами связи. Добавьте нужные каналы, настройте их параметры и начните принимать сообщения от пользователей!",
            target: () => channelsListRef.current,
        },
    ];

    return (
        <div className="create-model-container">
            <div className="section-title" ref={channelsHeaderRef}>
                <GlobalOutlined/>
                {t("channels") || "Каналы связи"}
            </div>
            <div className="section-description">
                {t("channelsDescription") || "Настройте каналы для взаимодействия пользователей с вашим агентом через различные платформы"}
            </div>

            <div className="tour-layout">
                <div className="tour-content">
                    <div className="channels-modern">
                        {!modelData ? (
                            <div className="no-model-state-modern">
                                <AndroidOutlined className="no-model-icon-modern"/>
                                <Typography.Title level={3} className="no-model-title-modern">
                                    {t("modelNotCreated") || "Модель агента не создана"}
                                </Typography.Title>
                                <Typography.Text className="no-model-description-modern">
                                    {t("modelNotCreatedDescription") || "Для настройки каналов необходимо сначала создать модель агента"}
                                </Typography.Text>
                            </div>
                        ) : (
                            <>
                                {/* Кнопка создания канала */}
                                {availableChannels.length > 0 && (
                                    <div style={{marginTop: '16px'}} ref={addChannelRef}>
                                        <AddChannel
                                            availableChannels={availableChannels}
                                            onChannelSelect={handleChannelSelect}
                                        />
                                    </div>
                                )}

                                {/* Заголовок с переключателем вида */}
                                <div className="channels-list-header" ref={channelsListHeaderRef}>
                                    <div className="header-left">
                                        <Typography.Title level={3}>
                                            {t("channelsConfigured") || "Настроенные каналы"}
                                        </Typography.Title>
                                        <Typography.Text type="secondary">
                                            {t("channelsTotal", {count: selectedChannels.length}) || `Всего каналов: ${selectedChannels.length}`}
                                        </Typography.Text>
                                    </div>
                                </div>

                                {selectedChannels.length > 0 ? (
                                    // Списочный вид
                                    <div className="channels-list-view" ref={channelsListRef}>
                                        {selectedChannels.map((channel) => (
                                            <div key={channel.key} className="channel-list-item">
                                                {channel.isExpanded ? (
                                                    // Развернутый вид для списка
                                                    <Card className="channel-card-modern">
                                                        <div className="channel-card-header-modern">
                                                            <div className="channel-info-modern">
                                                                <div
                                                                    className={`channel-icon-modern ${channel.isEnabled ? 'enabled' : ''}`}>
                                                                    {channel.icon}
                                                                </div>
                                                                <Typography.Title level={5}
                                                                                  className="channel-title-modern">
                                                                    {channel.label}
                                                                </Typography.Title>
                                                            </div>
                                                            <div className="channel-status-switch-modern">
                                                                <Typography.Text
                                                                    style={{marginRight: 8}}>{t("channelStatus") || "Статус:"}</Typography.Text>
                                                                <Switch
                                                                    checked={channel.isEnabled && !!channel.data}
                                                                    // onChange={() => toggleSwitch(channel.key)}
                                                                    onChange={() => handleToggleWithDisable(channel.key)}
                                                                    disabled={!channel.data || !!switchDisabled[channel.key]}
                                                                    checkedChildren={<span
                                                                        style={{color: "black"}}>{t("channelEnabled") || "Включен"}</span>}
                                                                    unCheckedChildren={<span
                                                                        style={{color: "black"}}>{t("channelDisabled") || "Выключен"}</span>}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="channel-card-content-modern">
                                                            {channel.key === "tbot" && (
                                                                <TBotSection
                                                                    channel={channel}
                                                                    selectedChannels={selectedChannels}
                                                                    setSelectedChannels={setSelectedChannels}
                                                                />
                                                            )}
                                                            {channel.key === "widg" && (
                                                                <WidgetSection
                                                                    channel={channel}
                                                                    selectedChannels={selectedChannels}
                                                                    setSelectedChannels={setSelectedChannels}
                                                                    // isGeneratingCode={isGeneratingCode}
                                                                    // setIsGeneratingCode={setIsGeneratingCode}
                                                                    // getWidgetCode={getWidgetCode}
                                                                />
                                                            )}
                                                            {channel.key === "tguserbot" && (
                                                                <TgUserBotSection
                                                                    channel={channel}
                                                                    selectedChannels={selectedChannels}
                                                                    setSelectedChannels={setSelectedChannels}
                                                                    isGeneratingQRCode={isGeneratingQRCode}
                                                                    isLoadingContacts={isLoadingContacts}
                                                                    contactsLoadingStatus={contactsLoadingStatus}
                                                                    qrCodeUrl={qrCodeUrl}
                                                                    showQRCode={showQRCode}
                                                                    setShowQRCode={setShowQRCode}
                                                                    authService={authService}
                                                                    password2FA={password2FA}
                                                                    setPassword2FA={setPassword2FA}
                                                                    passwordModalVisible={passwordModalVisible}
                                                                    setPasswordModalVisible={setPasswordModalVisible}
                                                                    handleGetQR={handleGetTgQR}
                                                                    handleGetContacts={handleGetTgContacts}
                                                                    handleSubmitPassword={handleSubmitPassword}
                                                                    needPassword={needPassword}
                                                                    originalChannelStates={originalChannelStates}
                                                                />
                                                            )}
                                                            {channel.key === "whatsbot" && (
                                                                <WhatsBotSection
                                                                    channel={channel}
                                                                    selectedChannels={selectedChannels}
                                                                    setSelectedChannels={setSelectedChannels}
                                                                    isGeneratingQRCode={isGeneratingQRCode}
                                                                    isLoadingContacts={isLoadingContacts}
                                                                    qrCodeUrl={qrCodeUrl}
                                                                    showQRCode={showQRCode}
                                                                    setShowQRCode={setShowQRCode}
                                                                    authService={authService}
                                                                    handleGetQR={handleGetWhatsQR}
                                                                    handleGetContacts={handleGetWaContacts}
                                                                    originalChannelStates={originalChannelStates}
                                                                />
                                                            )}
                                                            {channel.key === "avito" && (
                                                                <AvitoSection
                                                                    channel={channel}
                                                                    selectedChannels={selectedChannels}
                                                                    setSelectedChannels={setSelectedChannels}
                                                                />
                                                            )}

                                                            <div className="channel-actions-modern">
                                                                <div className="channel-actions-left-modern">
                                                                    <Button
                                                                        type="text"
                                                                        danger
                                                                        onClick={() => showRemoveConfirmation(channel.key)}
                                                                    >
                                                                        {t("channelDelete") || "Удалить канал"}
                                                                    </Button>
                                                                </div>
                                                                <div className="channel-actions-right-modern">
                                                                    <Button
                                                                        onClick={() => cancelChanges(channel.key)}
                                                                    >
                                                                        {t("channelsCancelButton") || "Отмена"}
                                                                    </Button>
                                                                    {/* Для Avito не показываем кнопку Сохранить - сохранение автоматическое */}
                                                                    {channel.key !== 'avito' && (
                                                                        <Button
                                                                            type="primary"
                                                                            onClick={() => saveData(channel.key)}
                                                                            disabled={!channel.data}
                                                                            style={{color: "black"}}
                                                                        >
                                                                            {t("save") || "Сохранить"}
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </Card>
                                                ) : (
                                                    // Свернутый вид для списка
                                                    <div
                                                        className="channel-list-item-content"
                                                        onClick={() => toggleExpand(channel.key)}
                                                    >
                                                        <div className="list-item-left-modern">
                                                            <div
                                                                className={`list-channel-icon ${channel.isEnabled ? 'enabled' : ''}`}>
                                                                {channel.icon}
                                                            </div>
                                                            <div className="list-item-info-modern">
                                                                <div className="list-item-header-modern">
                                                                    <Typography.Text
                                                                        strong>{channel.label}</Typography.Text>
                                                                </div>
                                                                <Typography.Text type="secondary">
                                                                    {channel.data ? t("channelConfigured") || "Настроен и готов к использованию" : t("channelRequiresSetup") || "Требует настройки"}
                                                                </Typography.Text>
                                                            </div>
                                                        </div>
                                                        <div className="list-item-right-modern">
                                                            <div className="list-item-status">
                                                                <Badge
                                                                    status={channel.isEnabled && !!channel.data ? "success" : "default"}
                                                                    text={
                                                                        channel.isEnabled && !!channel.data
                                                                            ? (t("channelEnabled") || "Включен")
                                                                            : (t("channelDisabled") || "Выключен")
                                                                    }
                                                                />
                                                            </div>
                                                            <Button
                                                                type="primary"
                                                                style={{color: "black"}}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleExpand(channel.key);
                                                                }}
                                                            >
                                                                {t("channelSettings") || "Настройки"}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="channels-empty-state">
                                        <Empty
                                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                                            description={
                                                <div>
                                                    <Typography.Text type="secondary">
                                                        {t("channelsNotCreated") || "Каналы не созданы"}
                                                    </Typography.Text>
                                                    <br/>
                                                    <Typography.Text type="secondary">
                                                        {t("channelsAddChannels") || "Добавьте каналы для взаимодействия с пользователями"}
                                                    </Typography.Text>
                                                </div>
                                            }
                                        />
                                    </div>
                                )}

                                <Modal
                                    title={t("channelsConfirmDelete") || "Подтвердите удаление"}
                                    open={isModalVisible}
                                    onCancel={handleCancelRemove}
                                    className="channels-modal"
                                    maskClassName="blur-modal-mask"
                                    mask={{closable: false}}
                                    zIndex={20000}
                                    footer={[
                                        <Button key="cancel" onClick={handleCancelRemove}>
                                            {t("channelsCancelButton") || "Отмена"}
                                        </Button>,
                                        <Button
                                            key="confirm"
                                            danger
                                            type="primary"
                                            onClick={handleConfirmRemove}
                                        >
                                            {t("delete") || "Удалить"}
                                        </Button>,
                                    ]}
                                >
                                    <Typography.Text>
                                        {t("channelsDeleteConfirm") || "Вы уверены, что хотите удалить этот канал? Все настройки будут потеряны."}
                                    </Typography.Text>
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
                                {t("channelsTourTitle") || "Интерактивный обзор"}
                            </h3>
                            <p className="tour-controls-subtitle">
                                {t("channelsTourSubtitle") || "Изучите настройку каналов связи пошагово"}
                            </p>
                        </div>

                        <div className="tour-start-button">
                            <Button
                                type="primary"
                                block
                                size="large"
                                onClick={startTour}
                            >
                                {t("channelsTourStart") || "🚀 Начать тур"}
                            </Button>
                        </div>

                        {tourVisible && (
                            <div className="tour-progress">
                                <div className="tour-progress-step">
                                    <span className="tour-progress-step-text">
                                        {t("channelsTourStep", {
                                            current: current + 1,
                                            total: steps.length
                                        }) || `Шаг ${current + 1} из ${steps.length}`}
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
                            <div className="tour-info-title">{t("channelsTourInfo") || "📋 Что вы изучите:"}</div>
                            <ul className="tour-info-list">
                                <li>{t("channelsTourItem1") || "Добавление каналов связи"}</li>
                                <li>{t("channelsTourItem2") || "Настройку Telegram и WhatsApp ботов"}</li>
                                <li>{t("channelsTourItem3") || "Интеграцию веб-виджетов"}</li>
                                <li>{t("channelsTourItem4") || "Управление статусами каналов"}</li>
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
                tooltip={t("channelsTourGuide") || "Начать обзор каналов связи"}
                onClick={showTourPanel}
                className="tour-float-button"
            />
        </div>
    );
};
