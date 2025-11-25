import {useEffect, useState, useRef, forwardRef, useImperativeHandle} from "react";
import {validateAndRefreshToken} from "../../../utils/easyUtils";
import {message, Spin, Button, Table, Badge, Switch, Modal, Form, Input, QRCode, Alert, Card, InputNumber, Tooltip} from "antd";
import {ApiOutlined, PlusOutlined, DeleteOutlined, ExclamationCircleOutlined, EditOutlined, QrcodeOutlined, SaveOutlined, SettingOutlined, InfoCircleOutlined} from "@ant-design/icons";
import {
    readServiceTgUserBotInfo,
    setServiceTgBotActive,
    serviceDeleteTgUserBot,
    serviceTgUserBotAuthData,
    saveServiceSetting
} from "./serviceUtils";
import {showErrorNotification, showNotification} from "../../hotification/showNotification";
import "../../steps.css";
import "../../../dashboard/steps/CreateModel.css";

const BOT_STATUSES = {
    auth_key: { label: 'Ошибка ключа авторизации', color: 'red' },
    session: { label: 'Ошибка сессии', color: 'orange' },
    phone: { label: 'Ошибка телефона', color: 'volcano' },
    password: { label: 'Ошибка авторизации', color: 'gold' },
    api: { label: 'Ошибка API', color: 'red' },
    proxy: { label: 'Прокси не доступен', color: 'red' },
    user_block: { label: 'Пользователь заблокирован', color: 'magenta' },
    chat_access: { label: 'Нет доступа к чату', color: 'purple' },
    content: { label: 'Ошибка контента', color: 'orange' },
    media: { label: 'Ошибка медиа', color: 'orange' },
    rate_limit: { label: 'Лимит новых контактов', color: 'volcano' },
    disabled: { label: 'Выключен', color: 'default' },
    other: { label: 'Другая ошибка', color: 'default' },
    active: { label: 'Активен', color: 'green' }
};

export const Bots = forwardRef((props, ref) => {
    const [bots, setBots] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedBot, setSelectedBot] = useState(null);
    const [pageSize, setPageSize] = useState(20);
    const [currentPage, setCurrentPage] = useState(1);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editForm] = Form.useForm();
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [isGeneratingQRCode, setIsGeneratingQRCode] = useState(false);
    const [password, setPassword] = useState('');
    const [isPasswordLoading, setIsPasswordLoading] = useState(false);
    const [authService, setAuthService] = useState(null);
    const [modalMode, setModalMode] = useState('edit'); // 'edit' | 'qrcode' | 'password'
    // Добавляем новые состояния для отображения прогресса
    const [authStep, setAuthStep] = useState('');
    const [authStepDescription, setAuthStepDescription] = useState('');

    // Новые состояния для настроек
    const [botSettings, setBotSettings] = useState({
        ProfileViewMin: 3,
        ProfileViewMax: 7,
        DelayEntreNewContactMin: 120,
        DelayEntreNewContactMax: 360,
        ActiveDialogWhiteTime: 300
    });
    const [settingsForm] = Form.useForm();

    // Флаги коалесцирования загрузок списка ботов
    const isBotsLoadingRef = useRef(false);
    const botsRefreshPendingRef = useRef(false);

    const fetchBotsInfo = async () => {
        if (isBotsLoadingRef.current) {
            // Если уже идёт загрузка — помечаем отложенное обновление и выходим
            botsRefreshPendingRef.current = true;
            return;
        }
        isBotsLoadingRef.current = true;
        try {
            const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
            if (!token) {
                message.error('Ошибка аутентификации');
                setBots(null);
                return;
            }
            const data = await readServiceTgUserBotInfo(token);
            if (data.bots && Array.isArray(data.bots) && data.bots.length > 0) {
                setBots(data.bots);
            } else {
                // Если пришло null или не массив — ставим пустой список, чтобы не падать
                setBots([]);
            }

            // Обновляем настройки, если они пришли с сервера
            if (data.set) {
                const newSettings = {
                    ProfileViewMin: data.set.ProfileViewMin ?? 3,
                    ProfileViewMax: data.set.ProfileViewMax ?? 6,
                    DelayEntreNewContactMin: data.set.DelayEntreNewContactMin ?? 120,
                    DelayEntreNewContactMax: data.set.DelayEntreNewContactMax ?? 360,
                    ActiveDialogWhiteTime: data.set.ActiveDialogWhiteTime ?? 300
                };
                setBotSettings(newSettings);
                settingsForm.setFieldsValue(newSettings);
            }
        } catch (e) {
            message.error('Ошибка загрузки информации о ботах');
            setBots([]);
        } finally {
            isBotsLoadingRef.current = false;
            setLoading(false);
            // Если во время загрузки была запросена ещё одна — выполним один повтор
            if (botsRefreshPendingRef.current) {
                botsRefreshPendingRef.current = false;
                // Небольшая задержка, чтобы не попасть под rate limit
                setTimeout(() => {
                    fetchBotsInfo();
                }, 300);
            }
        }
    };

    useEffect(() => {
        // Первая загрузка списка ботов
        setLoading(true);
        fetchBotsInfo();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Предоставляем метод обновления данных через ref
    useImperativeHandle(ref, () => ({
        refreshBots: () => {
            fetchBotsInfo();
        }
    }));

    const handleAddBot = () => {
        // Открываем модальное окно для добавления нового бота
        setSelectedBot({ BotId: 0 }); // Устанавливаем временный объект с BotId=0
        setModalMode('edit');
        setIsEditModalOpen(true);

        // Очищаем форму для ввода новых данных
        editForm.resetFields();
    };

    const handleToggleBot = async (bot, checked) => {
        const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
        if (!token) {
            message.error('Ошибка аутентификации');
            return;
        }

        try {
            // Вызываем функцию активации/деактивации бота
            await setServiceTgBotActive(token, bot.BotId, checked);

            // Обновляем состояние ботов
            setBots((prevBots) =>
                prevBots.map((b) => (b.BotId === bot.BotId ? { ...b, IsActive: checked ? 1 : 0 } : b))
            );

            showNotification(`Бот ${bot.BotAlias} успешно ${checked ? 'активирован' : 'деактивирован'}`);
        } catch (error) {
            showErrorNotification(`Ошибка при ${checked ? 'активации' : 'деактивации'} бота: ${error.message}`);
        }
    };

    const handleEditBot = async (bot) => {
        const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
        if (!token) {
            message.error('Ошибка аутентификации');
            return;
        }

        try {
            const data = await serviceTgUserBotAuthData(token, bot.BotId);
            if (!data || !(data?.AuthData?.token || data?.token)) {
                showErrorNotification('Ошибка', 'Данные бота не найдены');
                return;
            }

            // Источник токена может быть в data.AuthData.token (новый формат) или data.token (старый формат)
            const rawToken = (data && data.AuthData && data.AuthData.token) ?? data.token;

            // Извлекаем authData
            let authData;

            // Если токен уже является объектом, используем напрямую
            if (typeof rawToken === 'object' && rawToken !== null) {
                authData = {
                    phone: rawToken.phone || '',
                    appID: rawToken.appID || rawToken.appId || '',
                    appHash: rawToken.appHash || ''
                };
            } else if (typeof rawToken === 'string') {
                // Если это строка, пробуем распарсить как JSON
                let parsed = null;
                try {
                    parsed = JSON.parse(rawToken);
                } catch (e) {
                    // Фолбэк: извлечь значения регулярками без парсинга всего JSON
                    try {
                        // Изменяем регулярку для phone, чтобы учесть возможные пробелы и другие символы
                        const phoneMatch = rawToken.match(/"phone"\s*:\s*"([^"]+)"/);
                        const appIDMatch = rawToken.match(/"appID"\s*:\s*(\d+)/) || rawToken.match(/"appId"\s*:\s*(\d+)/);
                        const appHashMatch = rawToken.match(/"appHash"\s*:\s*"([a-f0-9]+)"/i);

                        if (phoneMatch && appIDMatch && appHashMatch) {
                            authData = {
                                phone: phoneMatch[1].replace(/\s+/g, ''), // Удаляем все пробелы из номера
                                appID: parseInt(appIDMatch[1], 10),
                                appHash: appHashMatch[1]
                            };
                        } else {
                            showErrorNotification('Ошибка', 'Не удалось извлечь данные авторизации из строки');
                            return;
                        }
                    } catch (extractError) {
                        console.error('Ошибка извлечения данных:', extractError);
                        showErrorNotification('Ошибка', 'Не удалось извлечь данные авторизации');
                        return;
                    }
                }

                if (!authData && parsed) {
                    authData = {
                        phone: (parsed.phone || '').replace(/\s+/g, ''), // Удаляем пробелы и из parsed версии
                        appID: parsed.appID || parsed.appId || '',
                        appHash: parsed.appHash || ''
                    };
                }
            } else {
                showErrorNotification('Ошибка', 'Неожиданный тип данных в поле token');
                return;
            }

            setSelectedBot(bot);
            setModalMode('edit'); // Устанавливаем режим редактирования
            setIsEditModalOpen(true);

            // Заполняем форму данными, включая имя бота
            editForm.setFieldsValue({
                botName: data.BotAlias || bot.BotAlias || '',
                phone: authData.phone || '',
                appID: authData.appID || '',
                appHash: authData.appHash || ''
            });
        } catch (error) {
            console.error('Ошибка при загрузке данных бота:', error);
            showErrorNotification(`Ошибка при загрузке данных бота: ${error.message}`);
        }
    };

    const handleGetQRCode = async () => {
        try {
            setIsGeneratingQRCode(true);
            setQrCodeUrl('');
            setAuthStep('');
            setAuthStepDescription('');

            // Получаем данные из формы
            const values = await editForm.validateFields();

            if (!values.phone || !values.appID || !values.appHash) {
                showErrorNotification("Ошибка", "Укажите все параметры для авторизации");
                setIsGeneratingQRCode(false);
                return;
            }

            // Создаем сервис авторизации
            const {ServiceTgAuthService} = await import('./serviceTgAuthService');
            const service = new ServiceTgAuthService();
            setAuthService(service);

            // Настраиваем обработчики событий
            service.setCallbacks({
                onStatus: (step) => {
                    setAuthStep(step);
                    setAuthStepDescription(getStepDescription(step));
                    console.log('Шаг авторизации:', step, getStepDescription(step));
                },
                onQrCode: (qrUrl) => {
                    setQrCodeUrl(qrUrl);
                    setModalMode('qrcode'); // Переключаем на режим QR-кода
                    setIsGeneratingQRCode(false);
                    setAuthStep('waiting_qr_scan');
                    setAuthStepDescription(getStepDescription('waiting_qr_scan'));
                },
                onPasswordRequest: () => {
                    setModalMode('password'); // Переключаем на режим ввода пароля
                    setPassword('');
                    setAuthStep('requesting_password');
                    setAuthStepDescription(getStepDescription('requesting_password'));
                },
                onSuccess: async () => {
                    setAuthStep('completed');
                    setAuthStepDescription(getStepDescription('completed'));
                    showNotification("Успех", "Авторизация успешно завершена");
                    setIsGeneratingQRCode(false);
                    setPassword('');

                    // Обновляем список ботов после успешной авторизации (коалесцировано, с небольшой задержкой)
                    setTimeout(() => {
                        fetchBotsInfo();
                    }, 500);

                    // Закрываем модальное окно редактирования
                    setIsEditModalOpen(false);
                    setSelectedBot(null);
                    setModalMode('edit');
                    setAuthStep('');
                    setAuthStepDescription('');
                    editForm.resetFields();
                },
                onUpdateToken: () => {
                    showErrorNotification("Ошибка авторизации", "Токен не обновлен, необходимо повторно авторизоваться!");
                    setIsGeneratingQRCode(false);
                    setAuthStep('');
                    setAuthStepDescription('');
                    // Закрываем модальное окно
                    setIsEditModalOpen(false);
                    setSelectedBot(null);
                    setModalMode('edit');
                    setPassword('');
                    setQrCodeUrl('');
                    editForm.resetFields();
                },
                onError: (error) => {
                    showErrorNotification("Ошибка авторизации", error);
                    setIsGeneratingQRCode(false);
                    setAuthStep('');
                    setAuthStepDescription('');
                    // Закрываем модальное окно при ошибке (включая таймаут)
                    setIsEditModalOpen(false);
                    setSelectedBot(null);
                    setModalMode('edit');
                    setPassword('');
                    setQrCodeUrl('');
                    editForm.resetFields();
                }
            });

            // Начинаем процесс авторизации
            await service.startAuthentication({
                alias: values.botName,
                appId: values.appID,
                appHash: values.appHash,
                phone: values.phone,
                botId: selectedBot.BotId
            });

        } catch (error) {
            console.error("Ошибка запуска авторизации:", error);
            if (error.errorFields) {
                showErrorNotification("Ошибка", "Заполните все обязательные поля");
            } else {
                showErrorNotification("Ошибка", "Не удалось начать процесс авторизации");
            }
            setIsGeneratingQRCode(false);
        }
    };

    const handleSubmitPassword = () => {
        if (authService && password) {
            setIsPasswordLoading(true);
            authService.submitPassword(password);
            // Не сбрасываем состояния сразу, ждем ответа от сервера
            setTimeout(() => {
                setIsPasswordLoading(false);
            }, 1000);
        } else {
            showErrorNotification("Ошибка", "Введите пароль");
        }
    };

    const handleDeleteBot = (bot) => {
        setSelectedBot(bot);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!selectedBot) {
            message.error('Не выбран бот для удаления');
            return;
        }

        const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
        if (!token) {
            message.error('Ошибка аутентификации');
            return;
        }

        try {
            // Вызываем функцию удаления бота
            await serviceDeleteTgUserBot(token, selectedBot.BotId);

            // Обновляем состояние ботов
            setBots((prevBots) => prevBots.filter((b) => b.BotId !== selectedBot.BotId));

            showNotification(`Бот ${selectedBot.BotAlias} успешно удален`);
        } catch (error) {
            showErrorNotification(`Ошибка при удалении бота: ${error.message}`);
        } finally {
            setIsDeleteModalOpen(false);
            setSelectedBot(null);
        }
    };

    const handleEditSubmit = async (values) => {
        const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
        if (!token) {
            message.error('Ошибка аутентификации');
            return;
        }

        if (!selectedBot) {
            showErrorNotification('Ошибка', 'Бот не выбран');
            return;
        }

        try {
            const alias = values?.botName?.trim();
            if (!alias) {
                showErrorNotification('Ошибка', 'Введите имя бота');
                return;
            }

            const { ServiceTgAuthService } = await import('./serviceTgAuthService');
            const service = authService ?? new ServiceTgAuthService();
            if (!authService) {
                setAuthService(service);
            }
            service.setCallbacks({
                onError: (err) => showErrorNotification('Ошибка изменения имени', err)
            });

            await service.updateBotAlias(selectedBot.BotId, alias);

            // Обновляем локальное состояние
            setBots((prev) => prev?.map(b => b.BotId === selectedBot.BotId ? { ...b, BotAlias: alias } : b));

            showNotification(`Имя бота обновлено: ${alias}`);
            setIsEditModalOpen(false);
            setSelectedBot(null);
            setModalMode('edit');
            editForm.resetFields();
        } catch (error) {
            showErrorNotification(`Ошибка при обновлении данных бота: ${error.message}`);
        }
    };

    const handleModalClose = () => {
        setIsEditModalOpen(false);
        setSelectedBot(null);
        setModalMode('edit');
        setPassword('');
        setQrCodeUrl('');
        editForm.resetFields();
        if (authService) {
            authService.closeConnection();
        }
    };

    const handleBackToEdit = () => {
        setModalMode('edit');
        setPassword('');
        setQrCodeUrl('');
        if (authService) {
            authService.closeConnection();
        }
    };

    const handleSaveSettings = async () => {
        try {
            const values = await settingsForm.validateFields();

            const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
            if (!token) {
                message.error('Ошибка аутентификации');
                return;
            }

            // Формируем объект настроек в нужном формате
            const settings = {
                ProfileViewMin: values.ProfileViewMin,
                ProfileViewMax: values.ProfileViewMax,
                DelayEntreNewContactMin: values.DelayEntreNewContactMin,
                DelayEntreNewContactMax: values.DelayEntreNewContactMax,
                ActiveDialogWhiteTime: values.ActiveDialogWhiteTime
            };

            // Вызываем API для сохранения настроек
            const success = await saveServiceSetting(token, settings);

            if (success) {
                setBotSettings(values);
                showNotification('Настройки успешно сохранены');
            } else {
                showErrorNotification('Ошибка при сохранении настроек');
            }
        } catch (error) {
            console.error('Ошибка при сохранении настроек:', error);
            showErrorNotification('Ошибка валидации настроек');
        }
    };

    const getStatusInfo = (bot) => {
        // Проверяем наличие ошибок по LastErrorGroup или LastErrorCode
        if (bot.LastErrorGroup || bot.LastErrorCode) {
            const errorGroup = bot.LastErrorGroup?.toLowerCase();
            const errorCode = bot.LastErrorCode?.toUpperCase();

            // Проверяем по LastErrorCode
            if (errorCode === 'AUTH_REQUIRED') {
                return BOT_STATUSES.password;
            }

            // Проверяем по LastErrorGroup
            if (errorGroup === 'auth_key') {
                return BOT_STATUSES.auth_key;
            }
            if (errorGroup === 'session') {
                return BOT_STATUSES.session;
            }
            if (errorGroup === 'phone') {
                return BOT_STATUSES.phone;
            }
            if (errorGroup === 'api') {
                return BOT_STATUSES.api;
            }
            if (errorGroup === 'user_block') {
                return BOT_STATUSES.user_block;
            }
            if (errorGroup === 'chat_access') {
                return BOT_STATUSES.chat_access;
            }
            if (errorGroup === 'content') {
                return BOT_STATUSES.content;
            }
            if (errorGroup === 'media') {
                return BOT_STATUSES.media;
            }
            if (errorGroup === 'rate_limit') {
                return BOT_STATUSES.rate_limit;
            }

            // Если есть ошибка, но не попали ни в одну категорию
            return BOT_STATUSES.other;
        }

        // Если нет ошибок и бот активен
        if (bot.IsActive === 1) {
            return BOT_STATUSES.active;
        }

        // Если бот неактивен, но может быть запущен
        if (bot.CanStart === 1) {
            return BOT_STATUSES.disabled;
        }

        // Если неактивен и не может быть запущен
        return BOT_STATUSES.other;
    };

    const columns = [
        {
            title: '#',
            key: 'index',
            width: 60,
            render: (text, record, index) => (currentPage - 1) * pageSize + index + 1,
        },
        {
            title: 'Алиас бота',
            dataIndex: 'BotAlias',
            key: 'BotAlias',
            render: (alias) => <strong>{alias}</strong>,
        },
        {
            title: 'Создан',
            dataIndex: 'CreatedAt',
            key: 'CreatedAt',
            render: (date) => new Date(date).toLocaleString('ru-RU'),
        },
        {
            title: 'Статус',
            key: 'status',
            render: (text, record) => {
                const statusInfo = getStatusInfo(record);
                return <Badge color={statusInfo.color} text={statusInfo.label} />;
            },
        },
        {
            title: 'Обновлен',
            dataIndex: 'UpdatedAt',
            key: 'UpdatedAt',
            render: (date) => new Date(date).toLocaleString('ru-RU'),
        },
        {
            title: 'Активность',
            key: 'isActive',
            width: 120,
            align: 'center',
            render: (text, record) => (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Switch
                        checked={record.IsActive === 1}
                        onChange={(checked) => handleToggleBot(record, checked)}
                        disabled={record.CanStart !== 1}
                        checkedChildren={<span style={{color: "black"}}>Вкл</span>}
                        unCheckedChildren={<span style={{color: "black"}}>Выкл</span>}
                    />
                </div>
            ),
        },
        {
            title: 'Действия',
            key: 'actions',
            width: 120,
            render: (text, record) => (
                <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                    {record.IsActive === 1 ? (
                        <DeleteOutlined
                            style={{
                                color: '#ff4d4f',
                                cursor: 'pointer',
                                fontSize: '16px'
                            }}
                            onClick={() => handleDeleteBot(record)}
                            title="Удалить бота"
                        />
                    ) : (
                        <>
                            <EditOutlined
                                style={{
                                    color: '#1890ff',
                                    cursor: 'pointer',
                                    fontSize: '16px'
                                }}
                                onClick={() => handleEditBot(record)}
                                title="Редактировать бота"
                            />
                            <DeleteOutlined
                                style={{
                                    color: '#ff4d4f',
                                    cursor: 'pointer',
                                    fontSize: '16px'
                                }}
                                onClick={() => handleDeleteBot(record)}
                                title="Удалить бота"
                            />
                        </>
                    )}
                </div>
            ),
        }
    ];

    const getStepDescription = (step) => {
        const steps = {
            'awaiting_credentials': 'Ожидание данных авторизации...',
            'validating_credentials': 'Проверка учетных данных...',
            'starting_auth': 'Запуск процесса авторизации...',
            'generating_qr': 'Генерация QR-кода...',
            'waiting_qr_scan': 'Ожидание сканирования QR-кода...',
            'qr_scanned': 'QR-код отсканирован!',
            'requesting_password': 'Требуется пароль...',
            'verifying_password': 'Проверка пароля...',
            'saving_session': 'Сохранение сессии...',
            'completed': 'Авторизация завершена!',
            'auth_failed': 'Ошибка авторизации',
            'validation_failed': 'Ошибка валидации данных',
            'save_failed': 'Ошибка сохранения сессии',
            'timeout': 'Превышено время ожидания',
        };
        return steps[step] || 'Обработка...';
    };

    if (loading) {
        return (
            <div className="create-model-container">
                <div className="loading-container">
                    <Spin size="large" />
                    <div className="loading-text">Загрузка данных...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="create-model-container">
            <div className="section-title create-model-header">
                <ApiOutlined />
                Управление ботами Telegram
                {bots && bots.length > 0 && (
                    <div className="status-indicator success">
                        <span>✓ Ботов: {bots.length}</span>
                    </div>
                )}
            </div>
            <div className="section-description">
                Просмотр и управление Telegram ботами для сервиса
            </div>

            {/* Кнопка добавления и настройки */}
            {/* Карточка настроек */}
            <Card
                title={
                    <span>
                        <SettingOutlined style={{ marginRight: 8 }} />
                        Настройки работы ботов
                    </span>
                }
                style={{ marginBottom: 16 }}
                size="small"
            >
                <Form
                    form={settingsForm}
                    layout="vertical"
                    initialValues={botSettings}
                    size="small"
                >
                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                            {/* Группа: Просмотр профиля */}
                            <div>
                                <div style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                                    Просмотр профиля (сек)
                                    <Tooltip title="На основе этих параметров, будет выбрано случайное число в этом диапазоне времени, для просмотра телеграмм профиля контакта перед отправкой первого сообщения (симуляция активности)">
                                        <InfoCircleOutlined style={{ fontSize: 12, color: '#1890ff' }} />
                                    </Tooltip>
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <Form.Item
                                        name="ProfileViewMin"
                                        style={{ marginBottom: 0, width: 70 }}
                                        rules={[
                                            { required: true, message: 'Обязательно' },
                                            {
                                                validator: (_, value) => {
                                                    if (!value || (Number.isInteger(value) && value > 0 && value <= 60)) {
                                                        return Promise.resolve();
                                                    }
                                                    return Promise.reject(new Error('Целое число от 1 до 60'));
                                                }
                                            }
                                        ]}
                                    >
                                        <InputNumber
                                            style={{ width: '100%' }}
                                            min={1}
                                            max={60}
                                            step={1}
                                            precision={0}
                                            placeholder="3"
                                            size="small"
                                        />
                                    </Form.Item>
                                    <span style={{ color: '#8c8c8c' }}>—</span>
                                    <Form.Item
                                        name="ProfileViewMax"
                                        style={{ marginBottom: 0, width: 70 }}
                                        rules={[
                                            { required: true, message: 'Обязательно' },
                                            {
                                                validator: (_, value) => {
                                                    if (!value || (Number.isInteger(value) && value > 0 && value <= 60)) {
                                                        return Promise.resolve();
                                                    }
                                                    return Promise.reject(new Error('Целое число от 1 до 60'));
                                                }
                                            }
                                        ]}
                                    >
                                        <InputNumber
                                            style={{ width: '100%' }}
                                            min={1}
                                            max={60}
                                            step={1}
                                            precision={0}
                                            placeholder="7"
                                            size="small"
                                        />
                                    </Form.Item>
                                </div>
                            </div>

                            {/* Группа: Пауза между контактами */}
                            <div>
                                <div style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                                    Пауза между контактами (сек)
                                    <Tooltip title="В этом диапазоне времени, будет выбранно случайное число - время паузы между отправкой нового сообщения следующему контакту (симуляция случайного поведения)">
                                        <InfoCircleOutlined style={{ fontSize: 12, color: '#1890ff' }} />
                                    </Tooltip>
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <Form.Item
                                        name="DelayEntreNewContactMin"
                                        style={{ marginBottom: 0, width: 70 }}
                                        rules={[
                                            { required: true, message: 'Обязательно' },
                                            {
                                                validator: (_, value) => {
                                                    if (!value || (Number.isInteger(value) && value > 0 && value <= 3600)) {
                                                        return Promise.resolve();
                                                    }
                                                    return Promise.reject(new Error('Целое число от 1 до 3600'));
                                                }
                                            }
                                        ]}
                                    >
                                        <InputNumber
                                            style={{ width: '100%' }}
                                            min={1}
                                            max={3600}
                                            step={1}
                                            precision={0}
                                            placeholder="120"
                                            size="small"
                                        />
                                    </Form.Item>
                                    <span style={{ color: '#8c8c8c' }}>—</span>
                                    <Form.Item
                                        name="DelayEntreNewContactMax"
                                        style={{ marginBottom: 0, width: 70 }}
                                        rules={[
                                            { required: true, message: 'Обязательно' },
                                            {
                                                validator: (_, value) => {
                                                    if (!value || (Number.isInteger(value) && value > 0 && value <= 3600)) {
                                                        return Promise.resolve();
                                                    }
                                                    return Promise.reject(new Error('Целое число от 1 до 3600'));
                                                }
                                            }
                                        ]}
                                    >
                                        <InputNumber
                                            style={{ width: '100%' }}
                                            min={1}
                                            max={3600}
                                            step={1}
                                            precision={0}
                                            placeholder="360"
                                            size="small"
                                        />
                                    </Form.Item>
                                </div>
                            </div>

                            {/* Поле: Время ожидания ответа */}
                            <div>
                                <div style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                                    Время ожидания ответа (сек)
                                    <Tooltip title="Время ожидания ответа пользователя до начала нового диалога ботом при активном диалоге. Если пользователь не отвечает в течении этого времени, бот переходит к следующему контакту на основании настроек `Пауза между контактами` (защита от бана бота при активном диалоге) при этом пользователь в любом случае может продолжить диалог с ботом в любой момент, до окончания работы сервиса.">
                                        <InfoCircleOutlined style={{ fontSize: 12, color: '#1890ff' }} />
                                    </Tooltip>
                                </div>
                                <Form.Item
                                    name="ActiveDialogWhiteTime"
                                    style={{ marginBottom: 0, width: 70 }}
                                    rules={[
                                        { required: true, message: 'Обязательное поле' },
                                        {
                                            validator: (_, value) => {
                                                if (!value || (Number.isInteger(value) && value > 0 && value <= 7200)) {
                                                    return Promise.resolve();
                                                }
                                                return Promise.reject(new Error('Целое число от 1 до 7200'));
                                            }
                                        }
                                    ]}
                                >
                                    <InputNumber
                                        style={{ width: '100%' }}
                                        min={1}
                                        max={7200}
                                        step={1}
                                        precision={0}
                                        placeholder="300"
                                        size="small"
                                    />
                                </Form.Item>
                            </div>
                        </div>

                        <Button
                            type="primary"
                            icon={<SaveOutlined />}
                            onClick={handleSaveSettings}
                            size="small"
                            style={{ alignSelf: 'flex-end' }}
                        >
                            Сохранить настройки
                        </Button>
                    </div>
                </Form>
            </Card>
            <div style={{ marginBottom: 16, display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    size="large"
                    onClick={handleAddBot}
                >
                    Добавить бота
                </Button>
            </div>

            {/* Таблица ботов */}
            {bots && bots.length > 0 ? (
                <Table
                    columns={columns}
                    dataSource={bots}
                    rowKey={(record) => record.BotId}
                    pagination={{
                        current: currentPage,
                        pageSize: pageSize,
                        showSizeChanger: true,
                        pageSizeOptions: ['10', '20', '50', '100'],
                        total: bots.length,
                        onChange: (page, pageSize) => {
                            setCurrentPage(page);
                            setPageSize(pageSize);
                        },
                    }}
                    bordered
                    size="small"
                    rowClassName="compact-row"
                />
            ) : (
                <div className="form-section model-name-section" style={{ textAlign: 'center', padding: '40px' }}>
                    <ApiOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
                    <div className="section-title">Ботов пока нет</div>
                    <div className="section-description">
                        Добавьте первого бота, нажав кнопку "Добавить бота"
                    </div>
                </div>
            )}

            {/* Модальное окно удаления бота */}
            <Modal
                title={
                    <span style={{ color: '#ff4d4f' }}>
                        <ExclamationCircleOutlined /> Подтверждение удаления
                    </span>
                }
                open={isDeleteModalOpen}
                onCancel={() => {
                    setIsDeleteModalOpen(false);
                    setSelectedBot(null);
                }}
                onOk={handleDeleteConfirm}
                okText="Удалить"
                cancelText="Отмена"
                okButtonProps={{ danger: true }}
            >
                <p>
                    Вы уверены, что хотите удалить бота{' '}
                    <strong>{selectedBot?.BotAlias}</strong>?
                </p>
                <p style={{ color: '#8c8c8c' }}>
                    Это действие нельзя будет отменить.
                </p>
            </Modal>

            {/* Единое модальное окно для редактирования, QR-кода и пароля */}
            <Modal
                title={
                    <span>
                        {modalMode === 'edit' && <><EditOutlined /> Редактирование параметров авторизации бота</>}
                        {modalMode === 'qrcode' && <>QR-код для авторизации в Telegram</>}
                        {modalMode === 'password' && <>Введите пароль для продолжения</>}
                    </span>
                }
                open={isEditModalOpen}
                onCancel={handleModalClose}
                footer={null}
                width={modalMode === 'edit' ? 600 : 400}
            >
                {/* Режим редактирования */}
                {modalMode === 'edit' && (
                    <Form
                        form={editForm}
                        layout="vertical"
                    >
                        <Form.Item
                            name="botName"
                            label="Имя бота"
                            rules={[
                                { required: true, message: 'Введите имя бота' },
                                { max: 128, message: 'Слишком длинное имя' }
                            ]}
                        >
                            <Input
                                placeholder="Имя бота"
                                size="large"
                            />
                        </Form.Item>

                        <Form.Item
                            name="phone"
                            label="Номер телефона"
                            rules={[
                                { required: true, message: 'Введите номер телефона' },
                                { pattern: /^\d+$/, message: 'Номер должен содержать только цифры' }
                            ]}
                        >
                            <Input
                                placeholder="79123456789"
                                size="large"
                                prefix="+"
                            />
                        </Form.Item>

                        <Form.Item
                            name="appID"
                            label="App ID"
                            rules={[
                                { required: true, message: 'Введите App ID' },
                                { pattern: /^\d+$/, message: 'App ID должен содержать только цифры' }
                            ]}
                        >
                            <Input
                                placeholder="1234567"
                                size="large"
                            />
                        </Form.Item>

                        <Form.Item
                            name="appHash"
                            label="App Hash"
                            rules={[
                                { required: true, message: 'Введите App Hash' },
                                { len: 32, message: 'App Hash должен содержать 32 символа' }
                            ]}
                        >
                            <Input
                                placeholder="123abc456def7890f5264d1421fbef3e"
                                size="large"
                            />
                        </Form.Item>

                        <Button
                            type="primary"
                            icon={<QrcodeOutlined />}
                            size="large"
                            onClick={handleGetQRCode}
                            loading={isGeneratingQRCode}
                            style={{ width: '100%', marginTop: '24px', color: 'black' }}
                        >
                            Получить QR код
                        </Button>
                    </Form>
                )}

                {/* Режим QR-кода */}
                {modalMode === 'qrcode' && (
                    <>
                        {authStepDescription && (
                            <Alert
                                description={authStepDescription}
                                type="info"
                                showIcon
                                style={{ marginBottom: 16 }}
                            />
                        )}
                        <Alert
                            className="channel-alert"
                            description="Отсканируйте QR-код через приложение Telegram для авторизации"
                            type="success"
                            style={{ marginBottom: 16 }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                            {isGeneratingQRCode ? (
                                <div style={{ textAlign: 'center' }}>
                                    <Spin size="large" />
                                    {authStepDescription && (
                                        <div style={{ marginTop: 16, color: '#1890ff' }}>
                                            {authStepDescription}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <QRCode
                                    type="svg"
                                    errorLevel="Q"
                                    value={qrCodeUrl || 'loading...'}
                                    color="#000000"
                                    bgColor="#ffffff"
                                    size={256}
                                />
                            )}
                        </div>
                        <Button
                            type="default"
                            size="large"
                            onClick={handleBackToEdit}
                            style={{ width: '100%' }}
                        >
                            Назад к редактированию
                        </Button>
                    </>
                )}

                {/* Режим ввода пароля */}
                {modalMode === 'password' && (
                    <>
                        {authStepDescription && (
                            <Alert
                                description={authStepDescription}
                                type="info"
                                showIcon
                                style={{ marginBottom: 16 }}
                            />
                        )}
                        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                            <QrcodeOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
                        </div>
                        <Form
                            layout="vertical"
                            onFinish={handleSubmitPassword}
                        >
                            <Form.Item
                                name="password"
                                label="Пароль"
                                rules={[
                                    { required: true, message: 'Введите пароль' }
                                ]}
                            >
                                <Input.Password
                                    placeholder="Ваш пароль"
                                    size="large"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </Form.Item>

                            <Form.Item>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <Button
                                        type="default"
                                        size="large"
                                        onClick={handleBackToEdit}
                                        style={{ flex: 1 }}
                                    >
                                        Назад
                                    </Button>
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        size="large"
                                        loading={isPasswordLoading}
                                        style={{ flex: 1, color: 'black' }}
                                    >
                                        Подтвердить
                                    </Button>
                                </div>
                            </Form.Item>
                        </Form>
                    </>
                )}
            </Modal>
        </div>
    );
});
