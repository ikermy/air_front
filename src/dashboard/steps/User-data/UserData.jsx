import React, {useState, useEffect, useRef} from 'react';
import {
    Card,
    Row,
    Col,
    Typography,
    Progress,
    Space,
    Divider,
    Spin,
    Alert,
    Button,
    Modal,
    Input,
    Select,
    message,
    Tour,
    FloatButton,
    Tooltip
} from 'antd';
import {
    UserOutlined,
    WalletOutlined,
    CalendarOutlined,
    MessageOutlined,
    DatabaseOutlined,
    MailOutlined,
    BellOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    AndroidOutlined,
    WhatsAppOutlined,
    InstagramOutlined,
    EditOutlined,
    DeleteOutlined,
    ExclamationCircleOutlined,
    QuestionCircleOutlined,
    PlayCircleOutlined, ThunderboltOutlined
} from '@ant-design/icons';
import {FaTelegramPlane} from 'react-icons/fa';
import {getUserData} from './getUserData';
import './UserData.css';
import '../Tour.css';
import {getTourPanelState, setTourPanelState} from "../../../utils/cookieUtils";
import {GrLanguage} from "react-icons/gr";
import {TbTimezone} from "react-icons/tb";
import {setUserTimeZone} from "./setUserTimeZone";
import {validateAndRefreshToken} from "../../../utils/easyUtils";
import {showErrorNotification, showNotification} from "../../hotification/showNotification";
import {useTranslation} from "react-i18next";

const {Title, Text, Paragraph} = Typography;

export const UserData = () => {
    const {t} = useTranslation();
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Состояния для редактирования
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingField, setEditingField] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [saveLoading, setSaveLoading] = useState(false);

    // Состояния для удаления
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState('');
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteProgressVisible, setDeleteProgressVisible] = useState(false);
    const [deleteMessages, setDeleteMessages] = useState([]);
    const [deleteComplete, setDeleteComplete] = useState(false);

    // Состояния для Tour
    const [tourVisible, setTourVisible] = useState(false);
    const [current, setCurrent] = useState(0);
    const [tourPanelVisible, setTourPanelVisible] = useState(getTourPanelState('userdata'));

    // Refs для Tour targets
    const userHeaderRef = useRef(null);
    const profileCardRef = useRef(null);
    const balanceCardRef = useRef(null);
    const resourcesCardRef = useRef(null);
    const notificationsCardRef = useRef(null);
    const channelsCardRef = useRef(null);
    const dangerZoneRef = useRef(null);
    const wsRef = useRef(null); // Добавляем ref для WebSocket

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('authToken');
                if (!token) {
                    throw new Error(t("authTokenNotFound") || 'Токен авторизации не найден');
                }

                const data = await getUserData(token);
                setUserData(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [t]);

    // Очистка WebSocket соединения при размонтировании компонента
    useEffect(() => {
        return () => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.close();
            }
        };
    }, []);

    if (loading) {
        return (
            <div className="user-data-loading">
                <Spin size="large"/>
                <Text style={{marginTop: 16}}>{t("userLoadingData") || "Загрузка данных пользователя..."}</Text>
            </div>
        );
    }

    if (error) {
        return (
            <div className="user-data-error">
                <Alert message={t("userLoadingError") || "Ошибка загрузки"} description={error} type="error" showIcon/>
            </div>
        );
    }

    if (!userData) return null;

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getCurrencySymbol = (currency) => {
        const currencies = {0: 'USDT', 1: '₽', 2: '$', 3: 'ars', 4: 'brl'};
        return currencies[currency] || 'USDT';
    };

    const getLanguageName = (langId) => {
        const languages = {1: 'Русский', 2: 'English', 3: 'Español'};
        return languages[langId] || 'Русский';
    };

    const messagesUsagePercent = userData.Subscription ?
        (userData.Subscription.MessagesUsed / userData.Subscription.MessageLimit) * 100 : 0;

    const storageUsagePercent = userData.Subscription ?
        (userData.Subscription.StorageUsed / userData.Subscription.StorageLimit) * 100 : 0;

    // Обработчики для редактирования данных
    const handleEdit = (field, currentValue) => {
        setEditingField(field);
        setEditValue(currentValue);
        setEditModalVisible(true);
    };

    const handleSaveEdit = async () => {
        try {
            setSaveLoading(true);
            // const token = localStorage.getItem('authToken');

            // Здесь будет вызов API для обновления данных
            // TODO: Реализовать API вызов
            console.log(`Updating ${editingField} to:`, editValue);

            // Обновляем локальные данные
            const updatedUserData = {...userData};
            if (editingField === 'name') {
                updatedUserData.Name = editValue;
            } else if (editingField === 'language') {
                updatedUserData.Lang = editValue;
            } else if (editingField === 'currency') {
                updatedUserData.Currency = editValue;
            }

            setUserData(updatedUserData);
            setEditModalVisible(false);
            message.success(t("userDataUpdated") || 'Данные успешно обновлены');
        } catch (error) {
            message.error(t("userDataUpdateError") || 'Ошибка при обновлении данных');
            console.error('Error updating user data:', error);
        } finally {
            setSaveLoading(false);
        }
    };

    const handleCancelEdit = () => {
        setEditModalVisible(false);
        setEditingField(null);
        setEditValue('');
    };

    // Обработчики для удаления данных
    const handleDeleteUser = () => {
        setDeleteModalVisible(true);
        setDeleteConfirmation('');
    };

    const handleConfirmDelete = async () => {
        if (deleteConfirmation !== 'yes') {
            return;
        }

        try {
            setDeleteLoading(true);
            setDeleteModalVisible(false); // Закрываем модальное окно подтверждения
            setDeleteProgressVisible(true); // Показываем окно прогресса
            setDeleteMessages([]);
            setDeleteComplete(false);
            console.warn('Deleting all user data...');

            const token = localStorage.getItem('authToken');
            const LAND_WSS = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND_WSS) || process.env.REACT_APP_LAND_WSS;
            const wsUrl = `${LAND_WSS}/ws/deleteall`;
            const wsUrlWithToken = `${wsUrl}?token=${encodeURIComponent(token)}`;
            wsRef.current = new WebSocket(wsUrlWithToken);

            // Обработчик открытия соединения
            wsRef.current.onopen = () => {
                console.log('WebSocket connection opened for user deletion');
                setDeleteMessages(prev => [...prev, t("userDeleteConnectionEstablished") || '🔌 Соединение с сервером установлено']);
            };

            // Обработчик сообщений от сервера
            wsRef.current.onmessage = (event) => {
                console.log('Received message:', event.data);

                // Добавляем любое сообщение от сервера в список
                setDeleteMessages(prev => [...prev, event.data]);

                try {
                    const data = JSON.parse(event.data);
                    if (data.status === 'success') {
                        setDeleteComplete(true);
                    } else if (data.error) {
                        message.error(t("userDeleteError", {error: data.error}) || `Ошибка удаления: ${data.error}`);
                    }
                } catch (e) {
                    // Сообщение уже добавлено в список на строке 248, дополнительная обработка не требуется
                }
            };

            // Обработчик закрытия соединения
            wsRef.current.onclose = (event) => {
                console.log('WebSocket connection closed:', event.code, event.reason);

                // Если соединение закрылось нормально (код 1000), значит операция завершена
                if (event.code === 1000) {
                    setDeleteMessages(prev => [...prev, t("userDeleteCompleted") || '✅ Операция удаления завершена успешно']);
                    setDeleteComplete(true);

                    setTimeout(() => {
                        message.success(t("userAllDataDeleted") || 'Все данные пользователя удалены');
                        setDeleteProgressVisible(false);

                        // Очищаем localStorage и перенаправляем на страницу входа
                        localStorage.removeItem('authToken');
                        window.location.href = '/';
                    }, 5000);
                } else {
                    setDeleteMessages(prev => [...prev, t("userDeleteFailed") || '❌ Произошла ошибка при удалении данных']);
                    message.error(t("userDeleteFailed") || 'Произошла ошибка при удалении данных');
                }

                setDeleteLoading(false);
            };

            // Обработчик ошибок
            wsRef.current.onerror = (error) => {
                console.error('WebSocket error:', error);
                setDeleteMessages(prev => [...prev, t("userDeleteConnectionError") || '❌ Ошибка соединения с сервером']);
                message.error(t("userDeleteConnectionErrorMsg") || 'Ошибка соединения при удалении данных');
                setDeleteLoading(false);
            };

        } catch (error) {
            message.error(t("userDeleteDataError") || 'Ошибка при удалении данных');
            console.error('Error deleting user data:', error);
            setDeleteLoading(false);
            setDeleteProgressVisible(false);
        }
    };

    const handleCancelDelete = () => {
        setDeleteModalVisible(false);
        setDeleteConfirmation('');
    };

    // Функция для получения названия поля для редактирования
    const getEditFieldTitle = () => {
        switch (editingField) {
            case 'name':
                return t("userEditNameTitle") || 'Редактирование имени пользователя';
            case 'language':
                return t("userEditLanguageTitle") || 'Изменение языка интерфейса';
            case 'currency':
                return t("userEditCurrencyTitle") || 'Изменение валюты';
            default:
                return t("userEditing") || 'Редактирование';
        }
    };

    // Функция для рендера поля ввода в модальном окне
    const renderEditInput = () => {
        if (editingField === 'currency') {
            return (
                <Select
                    value={editValue}
                    onChange={setEditValue}
                    style={{width: '100%'}}
                    placeholder={t("userSelectCurrency") || "Выберите валюту"}
                    getPopupContainer={(trigger) => trigger.parentNode}
                >
                    {userData.AvailibleCurrency?.map(currency => (
                        <Select.Option key={currency.id} value={currency.id}>
                            {currency.name}
                        </Select.Option>
                    ))}
                </Select>
            );
        }

        if (editingField === 'language') {
            return (
                <Select
                    value={editValue}
                    onChange={setEditValue}
                    style={{width: '100%'}}
                    placeholder={t("userSelectLanguage") || "Выберите язык"}
                    getPopupContainer={(trigger) => trigger.parentNode}
                >
                    {userData.AvailibleLang?.map(language => (
                        <Select.Option key={language.id} value={language.id}>
                            {language.name === 'ru' ? 'Русский' :
                                language.name === 'en' ? 'English' :
                                    language.name === 'es' ? 'Español' : language.name}
                        </Select.Option>
                    ))}
                </Select>
            );
        }

        return (
            <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder={editingField === 'name' ? (t("userEnterNewName") || 'Введите новое имя') : (t("userEnterValue") || 'Введите значение')}
                type="text"
            />
        );
    };

    // Получаем все поддерживаемые временные зоны
    const getAllTimezones = () => {
        try {
            return Intl.supportedValuesOf('timeZone').map(tz => ({
                value: tz,
                label: `${tz} (${new Intl.DateTimeFormat('ru', {
                    timeZone: tz,
                    timeZoneName: 'short'
                }).formatToParts(new Date()).find(part => part.type === 'timeZoneName')?.value || ''})`
            }));
        } catch (error) {
            // Fallback для старых браузеров
            return timezoneOptions;
        }
    };

    const timezoneOptions = getAllTimezones();

    const handleTimezoneChange = async (newTimezone) => {
        const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
        if (token !== null) {
            try {
                const result = await setUserTimeZone(token, newTimezone);
                // Сервер возвращает пустой объект {} при успехе
                if (Object.keys(result).length === 0 || result.status === 'ok') {
                    // Обновляем локальные данные
                    setUserData(prev => ({
                        ...prev,
                        TimeZone: newTimezone
                    }));

                    showNotification(t("userTimezoneUpdated") || 'Часовой пояс обновлен');
                } else {
                    message.error(t("userTimezoneUpdateError") || 'Ошибка при обновлении часового пояса');
                    showErrorNotification(t("userTimezoneUpdateError") || 'Ошибка при обновлении часового пояса');
                }

            } catch (error) {
                console.error('Error updating timezone:', error);
                message.error(t("userTimezoneUpdateError") || 'Ошибка при обновлении часового пояса');
                showErrorNotification(t("userTimezoneUpdateError") || 'Ошибка при обновлении часового пояса');
            }
        } else {
            showErrorNotification(t("userTimezoneUpdateError") || 'Ошибка при обновлении часового пояса');
            message.error(t("userTimezoneUpdateErrorToken") || 'Ошибка при обновлении часового пояса: токен не обновлен');
        }
    };

    // Функция для запуска тура
    const startTour = () => {
        setTourVisible(true);
        setCurrent(0);
        setTourPanelState('userdata', false);
    };

    // Функция для показа панели Tour при клике на FloatButton
    const showTourPanel = () => {
        setTourPanelVisible(true);
        setTourPanelState('userdata', true);
    };

    // Функция для скрытия панели Tour
    const hideTourPanel = () => {
        setTourPanelVisible(false);
        setTourPanelState('userdata', false);
    };

    // Шаги Tour для UserData
    const steps = [
        {
            title: t("userTourWelcomeTitle") || '👤 Добро пожаловать в профиль пользователя',
            description: t("userTourWelcomeDesc") || 'Здесь вы можете просматривать и редактировать всю информацию о вашем профиле, балансе, подписке и настройках системы.',
            target: () => userHeaderRef.current,
        },
        {
            title: t("userTourProfileTitle") || '📝 Информация профиля',
            description: t("userTourProfileDesc") || 'В этой карточке отображается основная информация: имя, email, язык интерфейса и GPT модель. Нажмите на иконку редактирования для изменения данных.',
            target: () => profileCardRef.current,
        },
        {
            title: t("userTourBalanceTitle") || '💰 Баланс и подписка',
            description: t("userTourBalanceDesc") || 'Отслеживайте ваш текущий баланс, информацию о подписке, сроках действия и стоимости. Здесь же можно изменить валюту отображения.',
            target: () => balanceCardRef.current,
        },
        {
            title: t("userTourResourcesTitle") || '📊 Использование ресурсов',
            description: t("userTourResourcesDesc") || 'Мониторьте использование лимитов сообщений и дискового пространства. Прогресс-бары показывают текущее использование относительно лимитов.',
            target: () => resourcesCardRef.current,
        },
        {
            title: t("userTourNotificationsTitle") || '🔔 Настройки уведомлений',
            description: t("userTourNotificationsDesc") || 'Управляйте настройками уведомлений через Telegram, Email или мгновенные Instant уведомления в интерфейсе . Здесь отображается статус подключения различных способов связи.',
            target: () => notificationsCardRef.current,
        },
        {
            title: t("userTourChannelsTitle") || '📡 Доступные каналы',
            description: t("userTourChannelsDesc") || 'Просматривайте статус всех доступных каналов связи: Telegram бот, виджет, WhatsApp и Instagram. Каждый канал может быть включен или отключен.',
            target: () => channelsCardRef.current,
        },
        {
            title: t("userTourDangerZoneTitle") || '⚠️ Опасная зона',
            description: t("userTourDangerZoneDesc") || 'Область для критических операций, таких как полное удаление данных пользователя. Используйте с особой осторожностью!',
            target: () => dangerZoneRef.current,
        },
        {
            title: t("userTourCompleteTitle") || '✅ Готово к использованию!',
            description: t("userTourCompleteDesc") || 'Теперь вы знаете все возможности управления профилем. Редактируйте данные, отслеживайте использование ресурсов и настраивайте систему под себя!',
            target: () => profileCardRef.current,
        },
    ];

    return (
        <div className="create-model-container">
            <div className="section-title">
                <UserOutlined/>
                {t("userDataTitle") || "Данные пользователя"}
            </div>
            <div className="section-description">
                {t("userDataDesc") || "Подробная информация о вашем профиле и использовании сервиса"}
            </div>

            <div className="tour-layout">
                <div className="tour-content">
                    <div className="user-data-container" ref={userHeaderRef}>
                        <div className="user-data-header">
                            <Title level={3} className="user-data-title">
                                {t("userProfileTitle") || "Профиль пользователя"}
                            </Title>
                            <Paragraph className="user-data-subtitle">
                                {t("userProfileSubtitle") || "Управляйте настройками профиля и отслеживайте использование сервиса"}
                            </Paragraph>
                        </div>

                        <Row gutter={[24, 24]}>
                            {/* Основная информация */}
                            <Col xs={24} lg={12}>
                                <Card title={t("userProfile") || "Профиль"} className="user-data-card" ref={profileCardRef}>
                                    <Space direction="vertical" size="large" style={{width: '100%'}}>
                                        <div className="user-info-item">
                                            <UserOutlined className="info-icon"/>
                                            <div style={{flex: 1}}>
                                                <Text strong>{t("userUsername") || "Имя пользователя"}</Text>
                                                <br/>
                                                <Text>{userData?.Name}</Text>
                                            </div>
                                            <Button
                                                icon={<EditOutlined/>}
                                                size="small"
                                                onClick={() => handleEdit('name', userData?.Name)}
                                                title={t("userEditUsername") || "Изменить имя пользователя"}
                                                disabled={true}
                                            />
                                        </div>

                                        <div className="user-info-item">
                                            <MailOutlined className="info-icon"/>
                                            <div>
                                                <Text strong>{t("userEmail") || "Email"}</Text>
                                                <br/>
                                                <Text>{userData?.Email}</Text>
                                            </div>
                                        </div>

                                        <div className="user-info-item">
                                            <GrLanguage className="info-icon"/>
                                            <div style={{flex: 1}}>
                                                <Text strong>{t("userInterfaceLanguage") || "Язык интерфейса"}</Text>
                                                <br/>
                                                <Text>{getLanguageName(userData?.Lang)}</Text>
                                            </div>
                                            <Button
                                                icon={<EditOutlined/>}
                                                size="small"
                                                onClick={() => handleEdit('language', userData?.Lang)}
                                                title={t("userEditLanguage") || "Изменить язык"}
                                                disabled={true}
                                            />
                                        </div>

                                        <div className="user-info-item">
                                            <AndroidOutlined className="info-icon"/>
                                            <div>
                                                <Text strong>{t("userGPTModel") || "GPT Модель"}</Text>
                                                <br/>
                                                <Text>{userData?.GPTName}</Text>
                                            </div>
                                        </div>

                                        <div className="user-info-item">
                                            <CalendarOutlined className="info-icon"/>
                                            <div>
                                                <Text strong>{t("userRegistrationDate") || "Дата регистрации"}</Text>
                                                <br/>
                                                <Text>{formatDate(userData?.Date)}</Text>
                                            </div>
                                        </div>

                                        <div className="user-info-item">
                                            <TbTimezone className="info-icon"/>
                                            <div style={{flex: 1}} className="timezone-select-wrapper">
                                                <Text strong>{t("userTimezone") || "Часовой пояс"}</Text>
                                                <br/>
                                                <Select
                                                    value={userData?.TimeZone}
                                                    onChange={handleTimezoneChange}
                                                    className="timezone-select"
                                                    style={{width: '90%', maxWidth: '400px'}}
                                                    placeholder={t("userSelectTimezone") || "Выберите часовой пояс"}
                                                    showSearch
                                                    virtual
                                                    listHeight={256}
                                                    popupMatchSelectWidth={300}
                                                    filterOption={(input, option) =>
                                                        (option?.label || '').toLowerCase().includes(input.toLowerCase())
                                                    }
                                                    options={timezoneOptions.map(tz => ({
                                                        value: tz.value,
                                                        label: tz.label
                                                    }))}
                                                />
                                            </div>
                                        </div>

                                    </Space>
                                </Card>
                            </Col>

                            {/* Баланс */}
                            <Col xs={24} lg={12}>
                                <Card title={t("userBalanceSubscription") || "Баланс и подписка"} className="user-data-card" ref={balanceCardRef}>
                                    <Space direction="vertical" size="large" style={{width: '100%'}}>
                                        <div className="balance-item" style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between'
                                        }}>
                                            <div style={{display: 'flex', alignItems: 'center'}}>
                                                <WalletOutlined className="user-balance-icon"/>
                                                <div className="user-balance-info">
                                                    <Text strong style={{fontSize: '18px'}}>
                                                        {userData?.Balance} {getCurrencySymbol(userData?.Currency)}
                                                    </Text>
                                                    <br/>
                                                    <Text type="secondary">{t("userCurrentBalance") || "Текущий баланс"}</Text>
                                                </div>
                                            </div>
                                            <Button
                                                icon={<EditOutlined/>}
                                                size="small"
                                                onClick={() => handleEdit('currency', userData?.Currency)}
                                                title={t("userEditCurrency") || "Изменить валюту"}
                                                disabled={true}
                                            />
                                        </div>

                                        {userData?.Subscription && (
                                            <>
                                                <Divider/>
                                                <div className="user-subscription-info">
                                                    <Text strong>{t("userSubscription") || "Подписка"}</Text>
                                                    <br/>
                                                    <Text>
                                                        {t("userSubscriptionPeriod", {
                                                            start: formatDate(userData.Subscription.StartDate),
                                                            end: formatDate(userData.Subscription.EndDate)
                                                        }) || `С ${formatDate(userData.Subscription.StartDate)} по ${formatDate(userData.Subscription.EndDate)}`}
                                                    </Text>
                                                    <br/>
                                                    <Text type="secondary">
                                                        {t("userMonthsPaid") || "Оплачено месяцев:"} {userData.Subscription.MonthsPaid}
                                                    </Text>
                                                    <br/>
                                                    <Text type="secondary">
                                                        {t("userCost") || "Стоимость:"} {userData.Subscription.TotalCost} {getCurrencySymbol(userData.Currency)}
                                                        {userData.Subscription.Discount > 0 &&
                                                            ` (${t("userDiscount") || "скидка"}: ${userData.Subscription.Discount} ${getCurrencySymbol(userData.Currency)})`
                                                        }
                                                    </Text>
                                                </div>
                                            </>
                                        )}
                                    </Space>
                                </Card>
                            </Col>

                            {/* Использование ресурсов */}
                            {userData?.Subscription && (
                                <Col xs={24}>
                                    <Card title={t("userResourceUsage") || "Использование ресурсов"} className="user-data-card"
                                          ref={resourcesCardRef}>
                                        <Row gutter={[24, 24]}>
                                            <Col xs={24} md={12}>
                                                <div className="usage-item">
                                                    <div className="usage-header">
                                                        <MessageOutlined className="usage-icon"/>
                                                        <Text strong>{t("userMessages") || "Сообщения"}</Text>
                                                    </div>
                                                    <Progress
                                                        percent={messagesUsagePercent}
                                                        status={messagesUsagePercent > 80 ? 'exception' : 'active'}
                                                        format={() => `${userData.Subscription.MessagesUsed} / ${userData.Subscription.MessageLimit}`}
                                                    />

                                                    {userData.Subscription.MessageLimit > 0 ? (
                                                        <Text type="secondary">
                                                            {t("userMessagesUsed", {percent: messagesUsagePercent.toFixed(1)}) || `Использовано ${messagesUsagePercent.toFixed(1)}% лимита сообщений`}
                                                        </Text>
                                                    ) : null}

                                                </div>
                                            </Col>

                                            <Col xs={24} md={12}>
                                                <div className="usage-item">
                                                    <div className="usage-header">
                                                        <DatabaseOutlined className="usage-icon"/>
                                                        <Text strong>{t("userStorage") || "Хранилище"}</Text>
                                                    </div>
                                                    <Progress
                                                        percent={storageUsagePercent}
                                                        status={storageUsagePercent > 80 ? 'exception' : 'active'}
                                                        format={() => `${formatBytes(userData.Subscription.StorageUsed)} / ${formatBytes(userData.Subscription.StorageLimit)}`}
                                                    />
                                                    <Text type="secondary">
                                                        {t("userStorageUsed", {percent: storageUsagePercent.toFixed(1)}) || `Использовано ${storageUsagePercent.toFixed(1)}% дискового пространства`}
                                                    </Text>
                                                </div>
                                            </Col>
                                        </Row>
                                    </Card>
                                </Col>
                            )}

                            {/* Уведомления */}
                            {userData?.Notifications && (
                                <Col xs={24} md={12}>
                                    <Card title={t("userNotificationsSettings") || "Настройки уведомлений"} className="user-data-card"
                                          ref={notificationsCardRef}>
                                        <Space direction="vertical" size="middle" style={{width: '100%'}}>
                                            <div className="notification-item">
                                                <FaTelegramPlane className="notification-icon"/>
                                                <Text>{t("userTelegramBotConfigured") || "Telegram бот настроен"}</Text>
                                                {userData.Notifications.TgBotIsSet ?
                                                    <CheckCircleOutlined className="status-enabled"/> :
                                                    <CloseCircleOutlined className="status-disabled"/>
                                                }
                                            </div>

                                            <div className="notification-item">
                                                <BellOutlined className="notification-icon"/>
                                                <Text>{t("userTelegramNotifications") || "Telegram уведомления"}</Text>
                                                {userData.Notifications.TelegramEnabled ?
                                                    <CheckCircleOutlined className="status-enabled"/> :
                                                    <CloseCircleOutlined className="status-disabled"/>
                                                }
                                            </div>

                                            <div className="notification-item">
                                                <ThunderboltOutlined className="notification-icon"/>
                                                <Text>{t("userInstantNotifications") || "Instant уведомления"}</Text>
                                                {userData.Notifications.Instant ?
                                                    <CheckCircleOutlined className="status-enabled"/> :
                                                    <CloseCircleOutlined className="status-disabled"/>
                                                }
                                            </div>

                                            <div className="notification-item">
                                                <MailOutlined className="notification-icon"/>
                                                <Text>{t("userEmailNotifications") || "Email уведомления"}</Text>
                                                {userData.Notifications.Email ?
                                                    <CheckCircleOutlined className="status-enabled"/> :
                                                    <CloseCircleOutlined className="status-disabled"/>
                                                }
                                            </div>
                                        </Space>
                                    </Card>
                                </Col>
                            )}

                            {/* Доступные каналы */}
                            {userData?.ChannelsAvailable && (
                                <Col xs={24} md={12}>
                                    <Card title={t("userAvailableChannels") || "Доступные каналы"} className="user-data-card" ref={channelsCardRef}>
                                        <Row gutter={[12, 12]}>
                                            <Col xs={12} sm={6}>

                                                <div className="channel-item-compact">
                                                    <FaTelegramPlane
                                                        className={`channel-icon-small ${userData.ChannelsAvailable.TgBotEnabled ? '' : 'channel-icon-disabled'}`}
                                                    />
                                                    <div className="user-channel-info">
                                                        <Text size="small">{"TelegramBot"}</Text>
                                                    </div>
                                                </div>
                                            </Col>

                                            <Col xs={12} sm={6}>

                                                <div className="channel-item-compact">
                                                    <FaTelegramPlane
                                                        className={`channel-icon-small ${userData.ChannelsAvailable.TgUserBotEnabled ? '' : 'channel-icon-disabled'}`}
                                                    />
                                                    <div className="user-channel-info">
                                                        <Text size="small">{"TelegramUser"}</Text>
                                                    </div>
                                                </div>
                                            </Col>

                                            <Col xs={12} sm={6}>
                                                <div className="channel-item-compact">
                                                    <AndroidOutlined
                                                        className={`channel-icon-small ${userData.ChannelsAvailable.WidgetEnabled ? '' : 'channel-icon-disabled'}`}
                                                    />
                                                    <div className="channel-info">
                                                        <Text size="small">{t("userWidget") || "Виджет"}</Text>
                                                    </div>
                                                </div>
                                            </Col>

                                            <Col xs={12} sm={6}>
                                                <div className="channel-item-compact">
                                                    <WhatsAppOutlined
                                                        className={`channel-icon-small ${userData.ChannelsAvailable.WhatsEnabled ? '' : 'channel-icon-disabled'}`}
                                                    />
                                                    <div className="channel-info">
                                                        <Text size="small">{t("userWhatsApp") || "WhatsApp"}</Text>
                                                    </div>
                                                </div>
                                            </Col>

                                            <Col xs={12} sm={6}>
                                                <div className="channel-item-compact">
                                                    <InstagramOutlined
                                                        className={`channel-icon-small ${userData.ChannelsAvailable.InstaEnabled ? '' : 'channel-icon-disabled'}`}
                                                    />
                                                    <div className="channel-info">
                                                        <Text size="small">{t("userInstagram") || "Instagram"}</Text>
                                                    </div>
                                                </div>
                                            </Col>
                                        </Row>
                                    </Card>
                                </Col>
                            )}

                            {/* Опасная зона - удаление данных */}
                            <Col xs={24}>
                                <Card
                                    title={
                                        <span style={{color: '#ff4d4f'}}>
                                            <ExclamationCircleOutlined/> {t("userIrreversibleActions") || "Необратимые действия"}
                                        </span>
                                    }
                                    className="user-data-card danger-zone-card"
                                    style={{borderColor: '#ff4d4f'}}
                                    ref={dangerZoneRef}
                                >
                                    <Space direction="vertical" size="middle" style={{width: '100%'}}>
                                        <div>
                                            <Text strong style={{color: '#ff4d4f'}}>{t("userDeleteAllData") || "Удаление всех данных пользователя"}</Text>
                                            <br/>
                                            <Text type="secondary">
                                                {t("userDeleteAllDataDesc") || "Все данные пользователя будут удалены безвозвратно без возможности восстановления, включая данные о модели, каналах, диалогах, подписках и платежах."}
                                            </Text>
                                        </div>
                                        <Tooltip
                                            title={
                                                userData.Role === 1
                                                    ? (t("userDeleteDemoNotAllowed") || "Невозможно удалить данные пользователя со статусом demo.")
                                                    : (t("userDeleteWarning") || "Нельзя отменить! Все данные будут удалены без возможности восстановления.")
                                            }
                                        >
                                            <Button
                                                danger
                                                icon={<DeleteOutlined/>}
                                                onClick={handleDeleteUser}
                                                size="large"
                                                disabled={userData.Role === 1}
                                            >
                                                {t("userDeleteAllDataButton") || "Удалить все данные пользователя"}
                                            </Button>
                                        </Tooltip>
                                    </Space>
                                </Card>
                            </Col>
                        </Row>

                        {/* Модальное окно редактирования */}
                        <Modal
                            title={getEditFieldTitle()}
                            open={editModalVisible}
                            onOk={handleSaveEdit}
                            onCancel={handleCancelEdit}
                            confirmLoading={saveLoading}
                            okText={t("save") || "Сохранить"}
                            cancelText={t("cancel") || "Отмена"}
                            okButtonProps={{style: {color: 'black'}}}
                        >
                            {renderEditInput()}
                        </Modal>

                        {/* Модальное окно удаления */}
                        <Modal
                            title={
                                <span style={{color: '#ff4d4f'}}>
                                    <ExclamationCircleOutlined/> {t("userDeleteConfirmationTitle") || "Подтверждение удаления всех данных"}
                                </span>
                            }
                            open={deleteModalVisible}
                            onOk={handleConfirmDelete}
                            onCancel={handleCancelDelete}
                            confirmLoading={deleteLoading}
                            okText={t("userDeleteAllDataButton") || "Удалить все данные"}
                            cancelText={t("cancel") || "Отмена"}
                            okButtonProps={{danger: true}}
                            width={600}
                        >
                            <Space direction="vertical" size="middle" style={{width: '100%'}}>
                                <Alert
                                    message={t("userDeleteIrreversibleWarning") || "Внимание! Это действие необратимо!"}
                                    type="error"
                                    showIcon
                                    style={{marginBottom: 16}}
                                />

                                <div>
                                    <Text strong style={{color: '#ff4d4f'}}>
                                        {t("userDeleteAllDataWarningText") || "Все данные пользователя будут удалены безвозвратно без возможности восстановления, в том числе:"}
                                    </Text>
                                    <ul style={{marginTop: 8, paddingLeft: 20}}>
                                        <li>{t("userDeleteModelData") || "Данные о модели GPT и настройки"}</li>
                                        <li>{t("userDeleteChannels") || "Все каналы связи"}</li>
                                        <li>{t("userDeleteDialogs") || "Все диалоги и история сообщений"}</li>
                                        <li>{t("userDeleteSubscriptions") || "Данные о подписках и платежах"}</li>
                                        <li>{t("userDeleteNotifications") || "Настройки уведомлений"}</li>
                                        <li>{t("userDeletePersonalInfo") || "Личная информация (имя, email)"}</li>
                                        <li>{t("userDeleteBalance") || "Баланс и валютные настройки"}</li>
                                    </ul>
                                </div>

                                <div>
                                    <Text strong>
                                        {t("userDeleteConfirmationText") || "Для окончательного подтверждения удаления всех данных введите"}{' '}
                                        <Text code
                                              style={{backgroundColor: '#ff4d4f', color: 'white', padding: '2px 4px'}}>
                                            yes
                                        </Text>
                                    </Text>
                                    <Input
                                        value={deleteConfirmation}
                                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                                        placeholder={t("userDeleteConfirmationPlaceholder") || "Введите 'yes' для окончательного подтверждения"}
                                        style={{marginTop: 8}}
                                        size="large"
                                    />
                                </div>
                            </Space>
                        </Modal>

                        {/* Модальное окно прогресса удаления */}
                        <Modal
                            title={
                                <span style={{color: '#ff4d4f'}}>
                                    <DeleteOutlined/> {t("userDeletingData") || "Удаление данных пользователя"}
                                </span>
                            }
                            open={deleteProgressVisible}
                            footer={null}
                            closable={false}
                            centered
                            width={700}
                            maskClosable={false}
                            className="delete-progress-modal"
                        >
                            <div className="delete-progress-container">
                                {!deleteComplete && (
                                    <div className="delete-progress-header">
                                        <Spin size="large"/>
                                        <Title level={4} style={{margin: '16px 0', color: '#ff4d4f'}}>
                                            {t("userDeletingDataProgress") || "Выполняется удаление данных..."}
                                        </Title>
                                        <Text type="secondary">
                                            {t("userDeletingDataWait") || "Пожалуйста, дождитесь завершения операции. Не закрывайте это окно."}
                                        </Text>
                                    </div>
                                )}

                                {deleteComplete && (
                                    <div className="delete-complete-header">
                                        <CheckCircleOutlined style={{fontSize: '48px', color: '#52c41a'}}/>
                                        <Title level={4} style={{margin: '16px 0', color: '#52c41a'}}>
                                            {t("userDeletingDataComplete") || "Удаление завершено успешно!"}
                                        </Title>
                                        <Text type="secondary">
                                            {t("userDeletingDataRedirect") || "Все данные пользователя удалены. Перенаправление на главную страницу..."}
                                        </Text>
                                    </div>
                                )}

                                <Divider/>

                                <div className="delete-messages-container">
                                    <Text strong style={{marginBottom: '12px', display: 'block'}}>
                                        {t("userOperationLog") || "Журнал операций:"}
                                    </Text>

                                    <div className="delete-messages-list">
                                        {deleteMessages.map((msg, index) => (
                                            <div key={index} className="delete-message-item">
                                                <span className="delete-message-time">
                                                    {new Date().toLocaleTimeString()}
                                                </span>
                                                <Text className="delete-message-text">{msg}</Text>
                                            </div>
                                        ))}

                                        {deleteMessages.length === 0 && !deleteComplete && (
                                            <div className="delete-message-item">
                                                <Text type="secondary">{t("userWaitingServerMessages") || "Ожидание сообщений от сервера..."}</Text>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {deleteLoading && (
                                    <div className="delete-progress-bar-container">
                                        <Progress
                                            percent={Math.min((deleteMessages.length / 12) * 100, 100)}
                                            status="active"
                                            strokeColor="#ff4d4f"
                                            showInfo={true}
                                            format={(percent) => `${Math.round(percent)}%`}
                                        />
                                    </div>
                                )}
                            </div>
                        </Modal>
                    </div>
                </div>

                {/* Панель управления Tour справа */}
                {tourPanelVisible && (
                    <div className="tour-controls tour-primary">
                        <div className="tour-controls-header">
                            <PlayCircleOutlined className="tour-controls-icon"/>
                            <h3 className="tour-controls-title">
                                {t("interactiveTourTitle") || "Интерактивный обзор"}
                            </h3>
                            <p className="tour-controls-subtitle">
                                {t("userTourSubtitle") || "Изучите интерфейс профиля пользователя пошагово"}
                            </p>
                        </div>

                        <div className="tour-start-button">
                            <Button
                                type="primary"
                                block
                                size="large"
                                onClick={startTour}
                            >
                                {t("startTour") || "🚀 Начать тур"}
                            </Button>
                        </div>

                        {tourVisible && (
                            <div className="tour-progress">
                                <div className="tour-progress-step">
                                    <span className="tour-progress-step-text">
                                        {t("tourStep", {current: current + 1, total: steps.length}) || `Шаг ${current + 1} из ${steps.length}`}
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
                            <div className="tour-info-title">{t("tourWhatYouLearn") || "📋 Что вы изучите:"}</div>
                            <ul className="tour-info-list">
                                <li>{t("userTourProfileEdit") || "Редактирование профиля"}</li>
                                <li>{t("userTourBalanceManagement") || "Управление балансом и подпиской"}</li>
                                <li>{t("userTourResourceMonitoring") || "Мониторинг ресурсов"}</li>
                                <li>{t("userTourNotificationSettings") || "Настройка уведомлений"}</li>
                                <li>{t("userTourChannelManagement") || "Управление каналами связи"}</li>
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
                tooltip={t("tourFloatButtonTooltip") || "Начать обзор интерфейса"}
                onClick={showTourPanel}
                className="tour-float-button"
            />
        </div>
    );
};
