import React, {useState, useEffect, useRef, useContext} from 'react';
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
    Tooltip,
    QRCode,
    Popconfirm,
    Steps,
} from 'antd';
import {
    UserOutlined,
    WalletOutlined,
    CalendarOutlined,
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
    PlayCircleOutlined,
    ThunderboltOutlined,
    SafetyOutlined,
    UnlockOutlined,
    KeyOutlined,
    LockOutlined,
} from '@ant-design/icons';
import {FaTelegramPlane} from 'react-icons/fa';
import {getTourPanelState, setTourPanelState} from "../../../utils/cookieUtils";
import {GrLanguage} from "react-icons/gr";
import {TbTimezone} from "react-icons/tb";
import {totpSetup, totpConfirm, totpDisable} from "./totpUtils";
import {createMasterKey, rewrapMasterKey} from "./masterKeyUtils";
import {getAuthToken, apiLogout, authFetch} from "../../../utils/easyUtils";
import {UserContext} from "../../../UserContext";
import {showErrorNotification, showNotification} from "../../hotification/showNotification";
import {useTranslation} from "react-i18next";
import {fetchProvidersAvailability, setProviderKey, revokeProviderKey} from '../CreateModelFormElements/providersUtils';
import {restartActiveChannels} from '../Channals/chUtils';
import {AI_PROVIDERS} from '../CreateModelFormElements/providersConfig';
import {BsFiletypeKey} from "react-icons/bs";
import {GiThreeKeys} from "react-icons/gi";

const {Title, Text, Paragraph} = Typography;

export const UserData = () => {
    const {t} = useTranslation();
    const userId = useContext(UserContext);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [languageLoading, setLanguageLoading] = useState(false);

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

    // Состояния для 2FA (TOTP)
    const [totpSetupVisible, setTotpSetupVisible] = useState(false);
    const [totpDisableVisible, setTotpDisableVisible] = useState(false);
    const [totpUri, setTotpUri] = useState('');
    const [totpCode, setTotpCode] = useState('');
    const [totpLoading, setTotpLoading] = useState(false);
    const [totpStep, setTotpStep] = useState(0);
    const [totpEnabled, setTotpEnabled] = useState(false);
    const [masterKey, setMasterKey] = useState(false);

    // Состояния для Master Key прогресса
    const [mkProgressVisible, setMkProgressVisible] = useState(false);
    const [mkMessages, setMkMessages] = useState([]);
    const [mkComplete, setMkComplete] = useState(false);

    // Состояния для Master Key
    const [mkModalVisible, setMkModalVisible] = useState(false);
    const [mkPassword, setMkPassword] = useState('');
    const [mkLoading, setMkLoading] = useState(false);
    const [mkRawKey, setMkRawKey] = useState(''); // raw_master_key — показывается один раз
    const [mkDoneVisible, setMkDoneVisible] = useState(false); // экран с результатом

    // Состояния для смены пароля
    const [chPassModalVisible, setChPassModalVisible] = useState(false);

    // Состояния для API Key провайдеров
    const [apiKeyModalVisible, setApiKeyModalVisible] = useState(false);
    const [apiKeyProviders, setApiKeyProviders] = useState({ available: [], unavailable: [] });
    const [apiKeyProvidersLoading, setApiKeyProvidersLoading] = useState(false);
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [apiKeySelectedProvider, setApiKeySelectedProvider] = useState(null);
    const [apiKeySaveLoading, setApiKeySaveLoading] = useState(false);
    const [apiKeyRevokeLoading, setApiKeyRevokeLoading] = useState(null);
    const [apiKeyRestartLoading, setApiKeyRestartLoading] = useState(false);

    const API_KEY_PROVIDERS = AI_PROVIDERS;

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const loadApiKeyProviders = async () => {
        setApiKeyProvidersLoading(true);
        const result = await fetchProvidersAvailability();
        if (result.success && result.data) {
            setApiKeyProviders(result.data);
        }
        setApiKeyProvidersLoading(false);
    };

    const handleApiKeyModalOpen = () => {
        setApiKeySelectedProvider(null);
        setApiKeyInput('');
        setApiKeyModalVisible(true);
        loadApiKeyProviders().then(r => {});
    };

    const triggerRestartIfNeeded = async (restart) => {
        if (!restart) return;
        setApiKeyRestartLoading(true);
        try {
            await restartActiveChannels(() => {});
            showNotification(t("apiKeyRestartDone") || "Модель перезапущена");
        } catch (e) {
            showErrorNotification(t("apiKeyRestartError") || "Ошибка перезапуска модели", e?.message);
        } finally {
            setApiKeyRestartLoading(false);
        }
    };

    const handleApiKeySave = async () => {
        if (!apiKeySelectedProvider || !apiKeyInput.trim()) return;
        setApiKeySaveLoading(true);
        try {
            const result = await setProviderKey(apiKeySelectedProvider, apiKeyInput.trim());
            if (result.success) {
                showNotification(t("apiKeySetSuccess") || "API Key сохранён", apiKeySelectedProvider);
                // Оптимистичное обновление — сразу переносим провайдера в available
                setApiKeyProviders(prev => ({
                    available: prev.available.includes(apiKeySelectedProvider)
                        ? prev.available
                        : [...prev.available, apiKeySelectedProvider],
                    unavailable: (prev.unavailable || []).filter(p => p !== apiKeySelectedProvider),
                }));
                setApiKeyInput('');
                setApiKeySelectedProvider(null);
                // Подтверждаем с сервера в фоне
                loadApiKeyProviders();
                await triggerRestartIfNeeded(result.restart);
            } else {
                showErrorNotification(t("apiKeySetError") || "Ошибка сохранения API Key", result.error);
            }
        } finally {
            setApiKeySaveLoading(false);
        }
    };

    const handleApiKeyRevoke = async (providerKey) => {
        setApiKeyRevokeLoading(providerKey);
        try {
            const result = await revokeProviderKey(providerKey);
            if (result.success) {
                showNotification(t("apiKeyRevokeSuccess") || "API Key удалён", providerKey);
                // Оптимистичное обновление — сразу убираем из available
                setApiKeyProviders(prev => ({
                    available: prev.available.filter(p => p !== providerKey),
                    unavailable: (prev.unavailable || []).includes(providerKey)
                        ? prev.unavailable
                        : [...(prev.unavailable || []), providerKey],
                }));
                // Подтверждаем с сервера в фоне
                loadApiKeyProviders();
                await triggerRestartIfNeeded(result.restart);
            } else {
                showErrorNotification(t("apiKeyRevokeError") || "Ошибка удаления API Key", result.error);
            }
        } finally {
            setApiKeyRevokeLoading(null);
        }
    };

    const [chPassOld, setChPassOld] = useState('');
    const [chPassNew, setChPassNew] = useState('');
    const [chPassConfirm, setChPassConfirm] = useState('');
    const [chPassRawKey, setChPassRawKey] = useState('');
    const [chPassLoading, setChPassLoading] = useState(false);
    const [chPassWarnModalVisible, setChPassWarnModalVisible] = useState(false);

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
    const totpCodeInputRef = useRef(null);

    const getUserData = async () => {
        return authFetch(`/v1/user/data`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            },
        });
    };

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                setLoading(true);
                const response = await getUserData();
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                const data = await response.json();
                setUserData(data);
                setTotpEnabled(!!data?.TotpEnabled);
                setMasterKey(!!data?.MasterKey);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [t]);

    // Автофокус на поле ввода кода TOTP при переходе на шаг 1
    useEffect(() => {
        if (totpStep === 1 && totpSetupVisible) {
            setTimeout(() => totpCodeInputRef.current?.focus(), 100);
        }
    }, [totpStep, totpSetupVisible]);

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
                <Alert title={t("userLoadingError") || "Ошибка загрузки"} description={error} type="error" showIcon/>
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

    const getLanguageCode = (langId) => ({1: 'ru', 2: 'en', 3: 'es'}[langId] || 'ru');

    const handleLanguageChange = async (newLanguage) => {
        const languageIds = {ru: 1, en: 2, es: 3};
        if (!languageIds[newLanguage] || newLanguage === getLanguageCode(userData?.Lang)) return;

        try {
            setLanguageLoading(true);
            const response = await authFetch(`/v1/user/language`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({language: newLanguage})
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            setUserData(prev => ({...prev, Lang: languageIds[newLanguage]}));
            message.success(t("userDataUpdated") || 'Данные успешно обновлены');
        } catch (error) {
            message.error(t("userDataUpdateError") || 'Ошибка при обновлении данных');
            console.error('Error updating language:', error);
        } finally {
            setLanguageLoading(false);
        }
    };

    // const messagesUsagePercent = userData.Subscription ?
    //     (userData.Subscription.MessagesUsed / userData.Subscription.MessageLimit) * 100 : 0;

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

            const token = getAuthToken();
            const wsUrl = `/v1/ws/delete-all`;
            const wsUrlWithToken = `${wsUrl}`;
            wsRef.current = new WebSocket(wsUrlWithToken, [token]);

            // Обработчик открытия соединения
            wsRef.current.onopen = () => {
                setDeleteMessages(prev => [...prev, t("userDeleteConnectionEstablished") || '🔌 Соединение с сервером установлено']);
            };

            // Обработчик сообщений от сервера
            wsRef.current.onmessage = (event) => {

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
            wsRef.current.onclose = async (event) => {
                console.log('WebSocket connection closed:', event.code, event.reason);

                // Если соединение закрылось нормально (код 1000), значит операция завершена
                if (event.code === 1000) {
                    setDeleteMessages(prev => [...prev, t("userDeleteCompleted") || '✅ Операция удаления завершена успешно']);
                    setDeleteComplete(true);

                    setTimeout(async () => {
                        message.success(t("userAllDataDeleted") || 'Все данные пользователя удалены');
                        setDeleteProgressVisible(false);

                        // Очищаем куки/localStorage и перенаправляем на главную
                        await apiLogout();
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

    // Обработчики для 2FA (TOTP)
    const handleTotpSetup = async () => {
        try {
            setTotpLoading(true);
            const response = await totpSetup();
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || `Ошибка сервера: ${response.status}`);
            }
            const result = await response.json();

            if (result.uri) {
                setTotpUri(result.uri);
                setTotpCode('');
                setTotpStep(0);
                setTotpSetupVisible(true);
            } else {
                message.error(t("totpSetupError") || 'Ошибка настройки 2FA: некорректный ответ сервера');
            }
        } catch (err) {
            console.error('TOTP Setup error:', err);
            message.error(typeof err === 'string' ? err : (err.message || (t("totpSetupError") || 'Ошибка настройки 2FA')));
        } finally {
            setTotpLoading(false);
        }
    };

    const handleTotpConfirm = async (codeArg) => {
        const code = codeArg ?? totpCode;
        if (!code || code.length !== 6) {
            message.warning(t("totpCodeRequired") || 'Введите 6-значный код из приложения');
            return;
        }
        try {
            setTotpLoading(true);
            const response = await totpConfirm(code);
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || `Ошибка сервера: ${response.status}`);
            }
            const result = await response.json();
            setTotpEnabled(!!result.enabled);
            setUserData(prev => ({...prev, TotpEnabled: result.enabled}));
            setTotpSetupVisible(false);
            setTotpCode('');
            message.success(t("totpEnabled") || '2FA успешно подключена');
        } catch (err) {
            message.error(typeof err === 'string' ? err : (err.message || (t("totpConfirmError") || 'Неверный код. Попробуйте снова')));
            setTotpCode('');
            setTimeout(() => totpCodeInputRef.current?.focus(), 50);
        } finally {
            setTotpLoading(false);
        }
    };

    const handleTotpDisable = async () => {
        if (!totpCode || totpCode.length !== 6) {
            message.warning(t("totpCodeRequired") || 'Введите 6-значный код из приложения');
            return;
        }
        try {
            setTotpLoading(true);
            const response = await totpDisable(totpCode);
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || `Ошибка сервера: ${response.status}`);
            }
            const result = await response.json();
            // Сервер возвращает пустой объект {} при успехе
            if (response.ok && (Object.keys(result).length === 0 || result.status === 'ok')) {
                setTotpEnabled(!!result.enabled);
                setUserData(prev => ({...prev, TotpEnabled: result.enabled}));
                setTotpDisableVisible(false);
                setTotpCode('');
                message.success(t("totpDisabled") || '2FA отключена');
            } else {
                message.error(t("userTimezoneUpdateError") || 'Ошибка при обновлении часового пояса');
                showErrorNotification(t("userTimezoneUpdateError") || 'Ошибка при обновлении часового пояса');
            }

        } catch (err) {
            message.error(typeof err === 'string' ? err : (err.message || (t("totpDisableError") || 'Неверный код. Попробуйте снова')));
        } finally {
            setTotpLoading(false);
        }
    };

    // Обработчик смены пароля
    const handleChangePassword = async () => {
        if (!chPassOld) { message.warning(t("chPassOldRequired") || 'Введите текущий пароль'); return; }
        if (!chPassNew) { message.warning(t("chPassNewRequired") || 'Введите новый пароль'); return; }
        if (chPassNew !== chPassConfirm) { message.warning(t("chPassMismatch") || 'Пароли не совпадают'); return; }

        // Если MasterKey существует, но raw-ключ не указан — предупреждаем об удалении зашифрованных данных
        if (masterKey && !chPassRawKey.trim()) {
            setChPassWarnModalVisible(true);
            return;
        }

        await doChangePassword();
    };

    const doChangePassword = async () => {
        try {
            setChPassLoading(true);
            await rewrapMasterKey(userId, chPassOld, masterKey ? chPassRawKey : null, chPassNew);
            showNotification(t("chPassSuccess") || 'Пароль успешно изменён');
            // Если MasterKey не был передан — сервер сбросил его, обновляем состояние
            if (masterKey && !chPassRawKey.trim()) {
                setMasterKey(false);
                setUserData(prev => ({...prev, MasterKey: 0}));
            }
            setChPassModalVisible(false);
            setChPassWarnModalVisible(false);
            setChPassOld(''); setChPassNew(''); setChPassConfirm(''); setChPassRawKey('');
        } catch (err) {
            const errMsg = typeof err === 'string' ? err : err.message;
            const localizedMsg = errMsg === 'mkWrongOldPassword'
                ? (t("chPassWrongOld") || 'Неверный текущий пароль')
                : (errMsg || t("chPassError") || 'Ошибка смены пароля');
            showErrorNotification(t("chPassError") || 'Ошибка смены пароля', localizedMsg);
        } finally {
            setChPassLoading(false);
        }
    };

    // Обработчик создания Master Key
    const handleCreateMasterKey = async () => {
        if (!mkPassword) {
            message.warning(t("mkPasswordRequired") || 'Введите пароль');
            return;
        }
        try {
            setMkLoading(true);
            setMkProgressVisible(true);
            setMkMessages([]);
            setMkComplete(false);

            const result = await createMasterKey(userId, mkPassword, (msg) => {
                setMkMessages(prev => [...prev, msg.message]);
                if (msg.type === 'success') {
                    setMkComplete(true);
                }
            });

            setMkRawKey(result.raw_master_key);
            setMkDoneVisible(true);
            setMasterKey(true);
            setUserData(prev => ({...prev, MasterKey: 1}));
            // Задержка в что бы увидеть данные
            await sleep(1500);
            setMkProgressVisible(false); // Закрываем прогресс после успеха, основной модал покажет результат
        } catch (err) {
            const errMsg = typeof err === 'string' ? err : err.message;
            setMkMessages(prev => [...prev, `❌ ${errMsg}`]);
            // Не закрываем модал прогресса сразу, чтобы пользователь видел ошибку
        } finally {
            await sleep(1500);
            setMkLoading(false);
        }
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
        try {
            const response = await authFetch(`/v1/user/timezone`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ timezone: newTimezone })
            });

            const result = await response.json();

            if (response.ok && (Object.keys(result).length === 0 || result.status === 'ok')) {
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
                                    <Space orientation="vertical" size="large" style={{width: '100%'}}>
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

                                        {/* Пароль авторизации */}
                                        <div className="user-info-item">
                                            <LockOutlined className="info-icon"/>
                                            <div style={{flex: 1}}>
                                                <Text strong>{t("userPassword") || "Пароль авторизации"}</Text>
                                                <br/>
                                                <Input.Password
                                                    value="••••••••"
                                                    disabled
                                                    visibilityToggle={false}
                                                    style={{width: '60%', background: 'transparent', border: 'none', padding: 0, cursor: 'default'}}
                                                />
                                            </div>
                                            <Tooltip title={t("userChangePassword") || "Сменить пароль"}>
                                                <Button
                                                    icon={<EditOutlined/>}
                                                    size="small"
                                                    onClick={() => { setChPassOld(''); setChPassNew(''); setChPassConfirm(''); setChPassRawKey(''); setChPassModalVisible(true); }}
                                                />
                                            </Tooltip>
                                        </div>

                                        {/* 2FA / TOTP */}
                                        <div className="user-info-item">
                                            <SafetyOutlined className="info-icon" style={{color: totpEnabled ? 'var(--icon-bg)' : '#bfbfbf', opacity: totpEnabled ? 1 : 0.7}}/>
                                            <div style={{flex: 1}}>
                                                <Text strong>{t("user2FA") || "Двухфакторная аутентификация"}</Text>
                                            </div>
                                            {totpEnabled ? (
                                                <Space>
                                                    <Tooltip title={t("user2FADisableBtn") || "Отключить 2FA"}>
                                                        <Button
                                                            icon={<UnlockOutlined/>}
                                                            size="small"
                                                            danger
                                                            onClick={() => {setTotpCode(''); setTotpDisableVisible(true);}}
                                                        />
                                                    </Tooltip>
                                                </Space>
                                            ) : (
                                                <Space>
                                                    <Tooltip title={t("user2FASetupBtn") || "Подключить 2FA"}>
                                                        <Button
                                                            icon={<SafetyOutlined/>}
                                                            size="small"
                                                            type="primary"
                                                            loading={totpLoading}
                                                            onClick={handleTotpSetup}
                                                        />
                                                    </Tooltip>
                                                </Space>
                                            )}
                                        </div>

                                        {/* Ключ шифрования / Master Key */}
                                        <div className="user-info-item">
                                            <KeyOutlined className="info-icon" style={{color: masterKey ? 'var(--icon-bg)' : '#bfbfbf', opacity: masterKey ? 1 : 0.7}}/>
                                            <div style={{flex: 1}}>
                                                <Text strong>{t("userMasterKey") || "Ключ шифрования"}</Text>
                                            </div>
                                            {!masterKey && (
                                                <Tooltip title={t("userMasterKeySetupBtn") || "Создать ключ шифрования"}>
                                                    <Button
                                                        icon={<KeyOutlined/>}
                                                        size="small"
                                                        type="primary"
                                                        onClick={() => { setMkPassword(''); setMkDoneVisible(false); setMkRawKey(''); setMkModalVisible(true); }}
                                                    />
                                                </Tooltip>
                                            )}
                                        </div>

                                        {/* API Key AI провайдеров */}
                                        <div className="user-info-item">
                                            <BsFiletypeKey className="info-icon" style={{color: apiKeyProviders.available?.length > 0 ? 'var(--icon-bg)' : '#bfbfbf', opacity: apiKeyProviders.available?.length > 0 ? 1 : 0.7}}/>
                                            <div style={{flex: 1}}>
                                                <Text strong>{t("apiKeyProvidersSectionTitle") || "API Key AI провайдеров"}</Text>
                                                <br/>
                                                <Text type="secondary" style={{fontSize: 12}}>
                                                    {t("apiKeyProvidersSectionDesc") || "Управление API-ключами для провайдеров ИИ"}
                                                </Text>
                                            </div>
                                            <Tooltip title={t("apiKeyProvidersManageBtn") || "Управление API Key"}>
                                                <Button
                                                    icon={<GiThreeKeys/>}
                                                    size="small"
                                                    type="primary"
                                                    onClick={handleApiKeyModalOpen}
                                                />
                                            </Tooltip>
                                        </div>

                                        <div className="user-info-item">
                                            <GrLanguage className="info-icon"/>
                                            <div style={{flex: 1}}>
                                                <Text strong>{t("userInterfaceLanguage") || "Язык интерфейса"}</Text>
                                                <br/>
                                                <Text>{getLanguageName(userData?.Lang)}</Text>
                                            </div>
                                            <Select
                                                style={{ maxWidth: 60 }}
                                                size="small"
                                                value={getLanguageCode(userData?.Lang)}
                                                onChange={handleLanguageChange}
                                                loading={languageLoading}
                                                title={t("userEditLanguage") || "Изменить язык"}
                                                options={[
                                                    {value: 'ru', label: 'RU'},
                                                    {value: 'en', label: 'EN'},
                                                    {value: 'es', label: 'ES'},
                                                ]}
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
                                    <Space orientation="vertical" size="large" style={{width: '100%'}}>
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
                                            {/*<Col xs={24} md={12}>*/}
                                                {/*<div className="usage-item">*/}
                                                    {/*<div className="usage-header">*/}
                                                    {/*    <MessageOutlined className="usage-icon"/>*/}
                                                    {/*    <Text strong>{t("userMessages") || "Сообщения"}</Text>*/}
                                                    {/*</div>*/}
                                                    {/*<Progress*/}
                                                    {/*    percent={messagesUsagePercent}*/}
                                                    {/*    status={messagesUsagePercent > 80 ? 'exception' : 'active'}*/}
                                                    {/*    format={() => `${userData.Subscription.MessagesUsed} / ${userData.Subscription.MessageLimit}`}*/}
                                                    {/*/>*/}

                                                    {/*{userData.Subscription.MessageLimit > 0 ? (*/}
                                                    {/*    <Text type="secondary">*/}
                                                    {/*        {t("userMessagesUsed", {percent: messagesUsagePercent.toFixed(1)}) || `Использовано ${messagesUsagePercent.toFixed(1)}% лимита сообщений`}*/}
                                                    {/*    </Text>*/}
                                                    {/*) : null}*/}

                                                {/*</div>*/}
                                            {/*</Col>*/}

                                            {/*<Col xs={24} md={12}>*/}
                                            <Col xs={24} md={24}>
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
                                        <Space orientation="vertical" size="middle" style={{width: '100%'}}>
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
                                    <Space orientation="vertical" size="middle" style={{width: '100%'}}>
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
                            <Space orientation="vertical" size="middle" style={{width: '100%'}}>
                                <Alert
                                    title={t("userDeleteIrreversibleWarning") || "Внимание! Это действие необратимо!"}
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
                            mask={{ closable: false }}
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

                        {/* Модальное окно смены пароля */}
                        <Modal
                            title={<span><LockOutlined/> {t("chPassModalTitle") || "Смена пароля"}</span>}
                            open={chPassModalVisible}
                            onCancel={() => { if (!chPassLoading) setChPassModalVisible(false); }}
                            footer={null}
                            width={460}
                            centered
                            mask={{ closable: !chPassLoading }}
                            closable={!chPassLoading}
                        >
                            <Space orientation="vertical" size="middle" style={{width: '100%'}}>
                                <Input.Password
                                    size="large"
                                    value={chPassOld}
                                    onChange={e => setChPassOld(e.target.value)}
                                    placeholder={t("chPassOldPlaceholder") || "Текущий пароль"}
                                    disabled={chPassLoading}
                                />
                                <Input.Password
                                    size="large"
                                    value={chPassNew}
                                    onChange={e => setChPassNew(e.target.value)}
                                    placeholder={t("chPassNewPlaceholder") || "Новый пароль"}
                                    disabled={chPassLoading}
                                />
                                <Input.Password
                                    size="large"
                                    value={chPassConfirm}
                                    onChange={e => setChPassConfirm(e.target.value)}
                                    placeholder={t("chPassConfirmPlaceholder") || "Подтвердите новый пароль"}
                                    disabled={chPassLoading}
                                    status={chPassConfirm && chPassNew !== chPassConfirm ? 'error' : ''}
                                />
                                {masterKey && (
                                    <>
                                        <Alert
                                            type="warning"
                                            showIcon
                                            style={{background: 'transparent', border: '1px solid var(--warning-color, #faad14)', fontSize: 12}}
                                            title={t("chPassMasterKeyHint") || "У вас создан ключ шифрования. Для смены пароля необходимо указать raw MasterKey, иначе зашифрованные данные будут удалены."}
                                        />
                                        <Input
                                            size="large"
                                            value={chPassRawKey}
                                            onChange={e => setChPassRawKey(e.target.value)}
                                            placeholder={t("chPassRawKeyPlaceholder") || "Raw MasterKey (base64)"}
                                            style={{fontFamily: 'monospace'}}
                                            prefix={<KeyOutlined/>}
                                            disabled={chPassLoading}
                                        />
                                    </>
                                )}
                                <Button
                                    type="primary"
                                    block
                                    size="large"
                                    loading={chPassLoading}
                                    onClick={handleChangePassword}
                                    style={{color: 'black'}}
                                    disabled={!chPassOld || !chPassNew || chPassNew !== chPassConfirm}
                                >
                                    {t("chPassSubmit") || "Сменить пароль"}
                                </Button>
                            </Space>
                        </Modal>

                        {/* Модальное окно подтверждения смены пароля без MasterKey */}
                        <Modal
                            title={
                                <span style={{color: '#ff4d4f'}}>
                                    <ExclamationCircleOutlined/> {t("chPassWarnTitle") || "Внимание! Зашифрованные данные будут удалены"}
                                </span>
                            }
                            open={chPassWarnModalVisible}
                            onOk={async () => {
                                setChPassWarnModalVisible(false);
                                await doChangePassword();
                            }}
                            onCancel={() => setChPassWarnModalVisible(false)}
                            okText={t("chPassWarnConfirm") || "Всё равно сменить пароль"}
                            cancelText={t("cancel") || "Отмена"}
                            okButtonProps={{danger: true}}
                            width={520}
                            centered
                        >
                            <Space orientation="vertical" size="middle" style={{width: '100%'}}>
                                <Alert
                                    title={t("chPassWarnIrreversible") || "Внимание! Это действие необратимо!"}
                                    type="error"
                                    showIcon
                                />
                                <div>
                                    <Text strong style={{color: '#ff4d4f'}}>
                                        {t("chPassWarnText") || "Вы не указали raw MasterKey. При смене пароля все зашифрованные данные (ключи каналов, токены, секреты) будут безвозвратно удалены:"}
                                    </Text>
                                    <ul style={{marginTop: 8, paddingLeft: 20}}>
                                        <li>{t("chPassWarnItem1") || "Ключи и токены интеграций (Telegram, WhatsApp и др.)"}</li>
                                        <li>{t("chPassWarnItem2") || "Зашифрованные настройки каналов"}</li>
                                        <li>{t("chPassWarnItem3") || "Прочие данные, защищённые MasterKey"}</li>
                                    </ul>
                                </div>
                                <Alert
                                    title={t("chPassWarnAdvice") || "Если у вас есть raw MasterKey — закройте это окно и введите его в соответствующее поле."}
                                    type="warning"
                                    showIcon
                                />
                            </Space>
                        </Modal>

                        {/* Модальное окно создания Master Key */}
                        <Modal
                            title={<span><KeyOutlined/> {t("userMasterKeyModalTitle") || "Создание ключа шифрования"}</span>}
                            open={mkModalVisible}
                            onCancel={() => { if (!mkLoading) { setMkModalVisible(false); setMkPassword(''); } }}
                            footer={null}
                            width={480}
                            centered
                            mask={{ closable: !mkLoading }}
                            closable={!mkLoading}
                        >
                            {!mkDoneVisible ? (
                                <Space orientation="vertical" size="middle" style={{width: '100%'}}>
                                    <Alert
                                        title={t("userMasterKeyDesc") || "MasterKey генерируется один раз и оборачивается вашим паролем. После создания raw-ключ будет показан ОДИН РАЗ — обязательно сохраните его в надёжном месте."}
                                        type="warning"
                                        showIcon
                                    />
                                    <Input.Password
                                        size="large"
                                        value={mkPassword}
                                        onChange={e => setMkPassword(e.target.value)}
                                        placeholder={t("userMasterKeyPasswordPlaceholder") || "Введите ваш текущий пароль"}
                                        onPressEnter={handleCreateMasterKey}
                                        disabled={mkLoading}
                                    />
                                    <Button
                                        type="primary"
                                        block
                                        size="large"
                                        loading={mkLoading}
                                        onClick={handleCreateMasterKey}
                                        style={{color: 'black'}}
                                        disabled={!mkPassword}
                                    >
                                        {t("userMasterKeyCreate") || "Создать ключ шифрования"}
                                    </Button>
                                </Space>
                            ) : (
                                <Space orientation="vertical" size="middle" style={{width: '100%'}}>
                                    <Alert
                                        title={t("userMasterKeySaveWarning") || "Сохраните этот ключ прямо сейчас! Он больше никогда не будет показан."}
                                        type="error"
                                        showIcon
                                    />
                                    <Input
                                        value={mkRawKey}
                                        readOnly
                                        size="large"
                                        style={{fontFamily: 'monospace', fontSize: 13}}
                                        addonAfter={
                                            <Button
                                                type="link"
                                                size="small"
                                                style={{padding: 0}}
                                                onClick={() => {
                                                    navigator.clipboard.writeText(mkRawKey);
                                                    message.success(t("userMasterKeyCopied") || 'Ключ скопирован');
                                                }}
                                            >
                                                {t("copy") || "Копировать"}
                                            </Button>
                                        }
                                    />
                                    <Button
                                        type="primary"
                                        block
                                        size="large"
                                        onClick={() => { setMkModalVisible(false); setMkRawKey(''); setMkPassword(''); }}
                                        style={{color: 'black'}}
                                    >
                                        {t("userMasterKeySaved") || "Я сохранил ключ"}
                                    </Button>
                                </Space>
                            )}
                        </Modal>

                        {/* Модальное окно прогресса создания Master Key */}
                        <Modal
                            title={
                                <span>
                                    <KeyOutlined/> {t("userMasterKeyProgressTitle") || "Создание ключа шифрования"}
                                </span>
                            }
                            open={mkProgressVisible}
                            footer={mkComplete || !mkLoading ? [
                                <Button key="close" onClick={() => setMkProgressVisible(false)}>
                                    {t("close") || "Закрыть"}
                                </Button>
                            ] : null}
                            closable={mkComplete || !mkLoading}
                            centered
                            width={600}
                            mask={{ closable: false }}
                        >
                            <div className="delete-progress-container">
                                {!mkComplete && mkLoading && (
                                    <div className="delete-progress-header">
                                        <Spin size="large"/>
                                        <Title level={4} style={{margin: '16px 0'}}>
                                            {t("userMasterKeyProcessing") || "Выполняется генерация и шифрование..."}
                                        </Title>
                                    </div>
                                )}

                                <div className="delete-messages-container">
                                    <div className="delete-messages-list">
                                        {mkMessages.map((msg, index) => (
                                            <div key={index} className="delete-message-item">
                                                <span className="delete-message-time">
                                                    {new Date().toLocaleTimeString()}
                                                </span>
                                                <Text className="delete-message-text">{msg}</Text>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </Modal>

                        {/* Модальное окно настройки 2FA */}
                        <Modal
                            title={<span><SafetyOutlined/> {t("user2FASetupTitle") || "Подключение двухфакторной аутентификации"}</span>}
                            open={totpSetupVisible}
                            onCancel={() => {setTotpSetupVisible(false); setTotpCode(''); setTotpStep(0);}}
                            footer={null}
                            width={480}
                            centered
                        >
                            <Steps
                                current={totpStep}
                                size="small"
                                style={{marginBottom: 24}}
                                items={[
                                    {title: t("user2FAStepScan") || "Сканирование"},
                                    {title: t("user2FAStepConfirm") || "Подтверждение"},
                                ]}
                            />
                            {totpStep === 0 && (
                                <Space orientation="vertical" size="middle" style={{width: '100%', alignItems: 'center'}}>
                                    <Alert
                                        title={t("user2FAScanDesc") || "Отсканируйте QR-код в приложении-аутентификаторе (Google Authenticator, Yandex Key и др.)"}
                                        type="info"
                                        showIcon
                                        style={{width: '100%'}}
                                    />
                                    {totpUri && (
                                        <QRCode
                                            type="svg"
                                            errorLevel="Q"
                                            value={totpUri}
                                            color="#000000"
                                            bgColor="#ffffff"
                                            size={220}
                                        />
                                    )}
                                    <Button
                                        type="primary"
                                        block
                                        style={{color: 'black'}}
                                        onClick={() => setTotpStep(1)}
                                    >
                                        {t("user2FANextStep") || "Далее — ввести код"}
                                    </Button>
                                </Space>
                            )}
                            {totpStep === 1 && (
                                <Space orientation="vertical" size="middle" style={{width: '100%'}}>
                                    <Alert
                                        title={t("user2FAEnterCodeDesc") || "Введите 6-значный код из приложения-аутентификатора для активации 2FA"}
                                        type="info"
                                        showIcon
                                    />
                                    <Input
                                        ref={totpCodeInputRef}
                                        size="large"
                                        maxLength={6}
                                        value={totpCode}
                                        onChange={e => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            setTotpCode(val);
                                            if (val.length === 6) handleTotpConfirm(val);
                                        }}
                                        placeholder={t("user2FACodePlaceholder") || "000000"}
                                        style={{textAlign: 'center', letterSpacing: 8, fontSize: 24}}
                                        disabled={totpLoading}
                                    />
                                    {totpLoading && <Spin style={{alignSelf: 'center'}}/>}
                                </Space>
                            )}
                        </Modal>

                        {/* Модальное окно отключения 2FA по коду */}
                        <Modal
                            title={<span style={{color: '#ff4d4f'}}><UnlockOutlined/> {t("user2FADisableTitle") || "Отключение двухфакторной аутентификации"}</span>}
                            open={totpDisableVisible}
                            onCancel={() => {setTotpDisableVisible(false); setTotpCode('');}}
                            onOk={handleTotpDisable}
                            confirmLoading={totpLoading}
                            okText={t("user2FADisableConfirm") || "Отключить"}
                            cancelText={t("cancel") || "Отмена"}
                            okButtonProps={{danger: true}}
                            centered
                        >
                            <Space orientation="vertical" size="middle" style={{width: '100%'}}>
                                <Alert
                                    title={t("user2FADisableWarning") || "Введите 6-значный код из приложения-аутентификатора для отключения 2FA"}
                                    type="warning"
                                    showIcon
                                />
                                <Input
                                    size="large"
                                    maxLength={6}
                                    value={totpCode}
                                    onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                                    placeholder={t("user2FACodePlaceholder") || "000000"}
                                    style={{textAlign: 'center', letterSpacing: 8, fontSize: 24}}
                                    onPressEnter={handleTotpDisable}
                                />
                            </Space>
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

            {/* Модальное окно управления API Key провайдеров */}
            <Modal
                title={<span><GiThreeKeys/> {t("apiKeyModalTitle") || "API Key AI провайдеров"}</span>}
                open={apiKeyModalVisible}
                onCancel={() => { if (!apiKeySaveLoading && !apiKeyRevokeLoading && !apiKeyRestartLoading) setApiKeyModalVisible(false); }}
                footer={null}
                width={520}
                centered
                mask={{ closable: !apiKeySaveLoading && !apiKeyRevokeLoading && !apiKeyRestartLoading }}
            >
                <Spin spinning={apiKeyRestartLoading} description={t("apiKeyRestartLoading") || "Перезапуск модели..."}>
                    <Space orientation="vertical" size="middle" style={{width: '100%'}}>
                        <Alert
                            type="info"
                            showIcon
                            title={t("apiKeyModalDesc") || "Установите личные API-ключи для каждого провайдера. После изменения ключа активная модель будет автоматически перезапущена."}
                        />

                        <Spin spinning={apiKeyProvidersLoading}>
                            <Space orientation="vertical" size="small" style={{width: '100%'}}>
                                {API_KEY_PROVIDERS.map(provider => {
                                    const hasKey = apiKeyProviders.available?.includes(provider.key);
                                    const isRevoking = apiKeyRevokeLoading === provider.key;
                                    return (
                                        <div key={provider.key} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 10,
                                            padding: '10px 14px',
                                            borderRadius: 8,
                                            border: `1px solid ${hasKey ? provider.color : 'var(--midle-color)'}`,
                                            background: hasKey ? `${provider.color}10` : 'var(--bg-color)',
                                        }}>
                                            <img src={provider.logo} alt={provider.name} style={{width: 28, height: 28, objectFit: 'contain', flexShrink: 0}}/>
                                            <div style={{flex: 1, minWidth: 0}}>
                                                <Text strong style={{color: provider.color}}>{provider.name}</Text>
                                                <br/>
                                                <Text type="secondary" style={{fontSize: 12}}>
                                                    {hasKey
                                                        ? (t("apiKeyProviderHasKey") || "API Key установлен ✓")
                                                        : (t("apiKeyProviderNoKey") || "API Key не установлен")}
                                                </Text>
                                            </div>
                                            {hasKey && (
                                                <Popconfirm
                                                    title={t("apiKeyRevokeConfirmTitle") || "Удалить API Key?"}
                                                    description={t("apiKeyRevokeConfirmDesc") || `API Key для ${provider.name} будет удалён. Продолжить?`}
                                                    onConfirm={() => handleApiKeyRevoke(provider.key)}
                                                    okText={t("apiKeyRevokeConfirmOk") || "Удалить"}
                                                    cancelText={t("cancel") || "Отмена"}
                                                    okButtonProps={{ danger: true }}
                                                    disabled={!!apiKeyRevokeLoading && !isRevoking}
                                                >
                                                    <Tooltip title={t("apiKeyRevokeBtn") || "Удалить API Key"}>
                                                        <Button
                                                            icon={<DeleteOutlined/>}
                                                            size="small"
                                                            danger
                                                            loading={isRevoking}
                                                            disabled={!!apiKeyRevokeLoading && !isRevoking}
                                                        />
                                                    </Tooltip>
                                                </Popconfirm>
                                            )}
                                            <Tooltip title={hasKey ? (t("apiKeyUpdateBtn") || "Обновить API Key") : (t("apiKeySetBtn") || "Установить API Key")}>
                                                <Button
                                                    icon={<GiThreeKeys/>}
                                                    size="small"
                                                    type={'primary'}
                                                    style={{ color : 'black'}}
                                                    onClick={() => { setApiKeySelectedProvider(provider.key); setApiKeyInput(''); }}
                                                    disabled={apiKeySelectedProvider === provider.key}
                                                />
                                            </Tooltip>
                                        </div>
                                    );
                                })}
                            </Space>
                        </Spin>

                        {apiKeySelectedProvider && (
                            <div style={{
                                padding: '14px',
                                borderRadius: 8,
                                border: `1px solid ${API_KEY_PROVIDERS.find(p => p.key === apiKeySelectedProvider)?.color || '#d9d9d9'}`,
                                background: 'var(--bg-color)',
                            }}>
                                <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10}}>
                                    <img
                                        src={API_KEY_PROVIDERS.find(p => p.key === apiKeySelectedProvider)?.logo}
                                        alt={apiKeySelectedProvider}
                                        style={{width: 22, height: 22, objectFit: 'contain'}}
                                    />
                                    <Text strong style={{color: API_KEY_PROVIDERS.find(p => p.key === apiKeySelectedProvider)?.color}}>
                                        {API_KEY_PROVIDERS.find(p => p.key === apiKeySelectedProvider)?.name}
                                    </Text>
                                </div>
                                <Input.Password
                                    placeholder={t("apiKeyInputPlaceholder") || "Введите API Key..."}
                                    value={apiKeyInput}
                                    onChange={e => setApiKeyInput(e.target.value)}
                                    onPressEnter={handleApiKeySave}
                                    autoFocus
                                    style={{marginBottom: 10}}
                                />
                                <Space>
                                    <Button
                                        type="primary"
                                        icon={<CheckCircleOutlined/>}
                                        loading={apiKeySaveLoading}
                                        disabled={!apiKeyInput.trim()}
                                        onClick={handleApiKeySave}
                                        style={{ color : 'black'}}
                                    >
                                        {t("apiKeySaveBtn") || "Сохранить"}
                                    </Button>
                                    <Button onClick={() => { setApiKeySelectedProvider(null); setApiKeyInput(''); }}>
                                        {t("cancel") || "Отмена"}
                                    </Button>
                                </Space>
                            </div>
                        )}
                    </Space>
                </Spin>
            </Modal>
        </div>
    );
};
