import React, {useCallback, useContext, useEffect, useState} from "react";
import {Card, Form, Input, Select, Descriptions, Spin, Button, Modal, Typography} from "antd";
import {useTranslation} from 'react-i18next';
import {showErrorNotification, showNotification} from "../../hotification/showNotification";
import "../../../dashboard/hotification/style.css";
import {useNavigate} from "react-router-dom";
import {useAuth} from "../../../AuthContext";
import {encryptPassword, getKey} from "../../../utils/easyUtils";
import {UserContext} from "../../../index";
import {ToolOutlined} from "@ant-design/icons";
import {
    changeModelGPT,
    getDevData, restartServices, setBotData,
    setDistribMailData,
    setProviderKeyGPT,
    setNewSessionKey,
    setUserKeyFn,
    updateUserData
} from "./gevUtils";


export const Dev = () => {
    const { t } = useTranslation();
    const [data, setData] = useState({}); // Всё что возвращает getDevData
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isModalServiceOpen, setIsModalServiceOpen] = useState(false);
    const [selectedProviderModels, setSelectedProviderModels] = useState({}); // {provider: defaultModel}
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const navigate = useNavigate();
    const token = localStorage.getItem("authToken");
    const userId = useContext(UserContext);
    const [isApiModalOpen, setIsApiModalOpen] = useState(false);
    const [isApiModalMistralOpen, setIsApiModalMistralOpen] = useState(false);
    const [isApiModalGoogleOpen, setIsApiModalGoogleOpen] = useState(false);
    const [apiKeys, setApiKeys] = useState('');
    const [apiKeysMistral, setApiKeysMistral] = useState('');
    const [apiKeysGoogle, setApiKeysGoogle] = useState('');
    const [userKey, setUserKey] = useState('');
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [isBotModalOpen, setIsBotModalOpen] = useState(false);
    const [isUserKeyModalOpen, setIsUserKeyModalOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [emailPass, setEmailPass] = useState('');
    const [emailHost, setEmailHost] = useState('');
    const [emailPort, setEmailPort] = useState('');
    const [botToken, setBotToken] = useState('');
    const [botName, setBotName] = useState('');


    const fetchData = useCallback(async () => {
        try {
            const result = await getDevData(token);
            console.log("Dev data fetched:", result);
            setData(result || {});
        } catch (e) {
            showErrorNotification(t("devDataFetchError") || "Ошибка получения данных", e);
        } finally {
            setLoading(false);
        }
    }, [token, t]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        // Используем available_providers - новый формат с ProviderInfo
        const providersData = data.available_providers;

        if (providersData && Array.isArray(providersData) && providersData.length > 0) {
            // Проверяем, является ли это новым форматом (с полем provider)
            const isNewFormat = providersData[0].provider !== undefined;

            if (isNewFormat) {
                // Инициализируем selectedProviderModels из данных провайдеров
                // Сохраняем ID модели по умолчанию для каждого провайдера
                const providerModels = {};
                providersData.forEach(provider => {
                    if (provider.default_model) {
                        providerModels[provider.provider] = provider.default_model.id;
                    }
                });
                setSelectedProviderModels(providerModels);
            }
        }
    }, [data]);

    const isPasswordsMatch = !data.newPassword || data.newPassword === data.repeatPassword;
    const isFormChanged = (
        (data.newName !== undefined && data.newName !== data.name) ||
        (data.newEmail !== undefined && data.newEmail !== data.email) ||
        (data.newPassword && data.newPassword.length > 0)
    ) && isPasswordsMatch;

    const {logout} = useAuth();

    const handleUpdateModelClick = async (provider) => {
        const selectedModelId = selectedProviderModels[provider];
        try {
            const result = await changeModelGPT(token, provider, selectedModelId);
            if (result) {
                showNotification(t("success") || "Успех", `${t("devModelUpdated") || "Модель по умолчанию для"} ${provider} ${t("devSuccessfullyUpdated") || "успешно обновлена"}!`);
            } else {
                showErrorNotification(t("error") || "Ошибка", t("devModelUpdateFailed") || "Не удалось обновить модель по умолчанию");
            }
        } catch (e) {
            showErrorNotification(t("devModelUpdateError") || "Ошибка обновления модели", e);
        } finally {
            setTimeout(() => {
            }, 1000);
            await fetchData()
        }
    };

    const handleNewSessionKey = async () => {
        try {
            await setNewSessionKey(token);
            showNotification(t("devSessionKeyCreated") || "SessionKey создан", t("devSessionEnding") || "Завершение сессии");
            localStorage.removeItem("authToken");
            // Удаление cookie MarusiaRefreshToken
            document.cookie = "MarusiaRefreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            logout();
            navigate("/");
        } catch (e) {
            showErrorNotification(t("devSessionKeyError") || "Ошибка создания SessionKey", e);
        }
    }

    const handleSaveUserData = async () => {
        try {
            const key = await getKey({userId});
            if (key.status !== "ok") {
                throw new Error(t("devEncryptionKeyError") || "Не удалось получить ключ шифрования");
            }

            const encryptedPassword = await encryptPassword(data.newPassword, key.key);

            const result = await updateUserData(token, userId, data.newName, data.newEmail, encryptedPassword);
            if (result) {
                showNotification(t("success") || "Успех", t("devUserDataUpdated") || "Пользовательские данные успешно обновлены!");
            } else {
                showErrorNotification(t("error") || "Ошибка", t("devUserDataUpdateFailed") || "Не удалось обновить пользовательские данные");
            }
        } catch (e) {
            showErrorNotification(t("error") || "Ошибка", e);
        } finally {
            setIsSaveModalOpen(false);
            // Жду секунду перед обновлением данных
            setTimeout(() => {
            }, 1000);
            await fetchData()
        }
    }

    const handleSaveOpenAIKeyGPT = async () => {
        try {
            const key = await getKey({userId});
            if (key.status !== "ok") {
                throw new Error(t("devEncryptionKeyError") || "Не удалось получить ключ шифрования");
            }

            const encryptedApiKeys = await encryptPassword(apiKeys, key.key);

            const result = await setProviderKeyGPT(token, userId, "openai", encryptedApiKeys);
            if (result) {
                showNotification(t("success") || "Успех", t("devApiKeysUpdated") || "API ключи успешно обновлены!");
            } else {
                showErrorNotification(t("error") || "Ошибка", t("devApiKeysUpdateFailed") || "Не удалось обновить API ключи");
            }
        } catch (e) {
            showErrorNotification(t("error") || "Ошибка", e);
        } finally {
            // Жду секунду перед обновлением данных
            setTimeout(() => {
                setApiKeys("")
            }, 1000);
            await fetchData()
        }
    }

    const handleSaveMistralKeyGPT = async () => {
        try {
            const key = await getKey({userId});
            if (key.status !== "ok") {
                throw new Error(t("devEncryptionKeyError") || "Не удалось получить ключ шифрования");
            }

            const encryptedApiKeys = await encryptPassword(apiKeysMistral, key.key);

            const result = await setProviderKeyGPT(token, userId, "mistral", encryptedApiKeys);
            if (result) {
                showNotification(t("success") || "Успех", t("devApiKeysUpdated") || "API ключи успешно обновлены!");
            } else {
                showErrorNotification(t("error") || "Ошибка", t("devApiKeysUpdateFailed") || "Не удалось обновить API ключи");
            }
        } catch (e) {
            showErrorNotification(t("error") || "Ошибка", e);
        } finally {
            setTimeout(() => {
                setApiKeysMistral("")
            }, 2000);
            await fetchData()
        }
    }

    const handleSaveGoogleKeyGPT = async () => {
        try {
            const key = await getKey({userId});
            if (key.status !== "ok") {
                throw new Error(t("devEncryptionKeyError") || "Не удалось получить ключ шифрования");
            }

            const encryptedApiKeys = await encryptPassword(apiKeysGoogle, key.key);

            const result = await setProviderKeyGPT(token, userId, "google", encryptedApiKeys);
            if (result) {
                showNotification(t("success") || "Успех", t("devApiKeysUpdated") || "API ключи успешно обновлены!");
            } else {
                showErrorNotification(t("error") || "Ошибка", t("devApiKeysUpdateFailed") || "Не удалось обновить API ключи");
            }
        } catch (e) {
            showErrorNotification(t("error") || "Ошибка", e);
        } finally {
            setTimeout(() => {
                setApiKeysGoogle("")
            }, 2000);
            await fetchData()
        }
    }

    const handleSaveUserKey = async () => {
        try {
            const key = await getKey({userId});
            if (key.status !== "ok") {
                throw new Error(t("devEncryptionKeyError") || "Не удалось получить ключ шифрования");
            }

            const encryptedUserKey = await encryptPassword(userKey, key.key);

            const result = await setUserKeyFn(token, userId, encryptedUserKey);
            if (result) {
                showNotification(t("success") || "Успех", t("devUserKeyUpdated") || "UserKey успешно обновлен!");
            } else {
                showErrorNotification(t("error") || "Ошибка", t("devUserKeyUpdateFailed") || "Не удалось обновить UserKey");
            }
        } catch (e) {
            showErrorNotification(t("error") || "Ошибка", e);
        } finally {
            setUserKey("");
            showNotification(
                t("devPageRefreshRequired") || "Требуется обновление страницы",
                t("devServerRestarting") || "Сервер перезапускается после обновления UserKey. Пожалуйста, обновите страницу через несколько секунд."
            );
        }
    }

    const handleSaveDistribData = async () => {
        try {
            const key = await getKey({userId});
            if (key.status !== "ok") {
                throw new Error(t("devEncryptionKeyError") || "Не удалось получить ключ шифрования");
            }
            const encryptedPass = await encryptPassword(emailPass, key.key);
            const result = await setDistribMailData(token, userId, email, encryptedPass, emailHost, emailPort);
            if (result) {
                showNotification(t("success") || "Успех", t("devEmailDataUpdated") || "Данные Email успешно обновлены!");
            } else {
                showErrorNotification(t("error") || "Ошибка", t("devEmailDataUpdateFailed") || "Не удалось обновить данные Email");
            }
        } catch (e) {
            showErrorNotification(t("error") || "Ошибка", e);
        } finally {
            setIsEmailModalOpen(false);
            // Жду секунду перед обновлением данных
            setTimeout(() => {
                setEmail("")
                setEmailPass("")
                setEmailHost("")
                setEmailPort("")
            }, 1000);
            await fetchData()
        }
    }

    const handleSaveBotData = async () => {
        try {
            const key = await getKey({userId});
            if (key.status !== "ok") {
                throw new Error(t("devEncryptionKeyError") || "Не удалось получить ключ шифрования");
            }
            const encryptedToken = await encryptPassword(botToken, key.key);
            const result = await setBotData(token, userId, botName, encryptedToken);
            if (result) {
                showNotification(t("success") || "Успех", t("devTelegramBotDataUpdated") || "Данные TelegramBot успешно обновлены!");
            } else {
                showErrorNotification(t("error") || "Ошибка", t("devTelegramBotDataUpdateFailed") || "Не удалось обновить данные TelegramBot");
            }
        } catch (e) {
            showErrorNotification(t("error") || "Ошибка", e);
        } finally {
            setIsBotModalOpen(false);
            // Жду секунду перед обновлением данных
            setTimeout(() => {
                setBotName("")
                setBotToken("")
            }, 1000);
            await fetchData()
        }
    }

    const handleRestartServices = async () => {
        try {
            showNotification(t("devServicesRestarting") || "Выполняется перезапуск сервисов...");
            let response;
            try {
                response = await restartServices(token);
            } catch (networkError) {
                showNotification(t("devServicesRestarted") || "Перезапуск сервисов выполнен!", t("devConnectionLost") || "Связь с сервером временно потеряна, сервисы перезапускаются.");
                return;
            }
            if (response && response.results) {
                const results = response.results;
                let details = Object.entries(results)
                    .map(([service, status]) => `${service}: ${status}`)
                    .join("\n");
                // Проверяем, есть ли ошибки среди сервисов
                const hasError = Object.values(results).some(status => status.toLowerCase().includes("ошибка"));
                if (hasError) {
                    showErrorNotification(t("devServicesRestartError") || "Ошибка при перезапуске сервисов", details);
                } else {
                    showNotification(t("devServicesRestarted") || "Сервисы перезапущены", details);
                }
            } else {
                showNotification(t("devServicesRestartInitiated") || "Перезапуск сервисов инициирован", t("devWaitConnection") || "Ожидайте восстановления связи. Возможно, соединение будет временно потеряно.");
            }
        } catch (e) {
            showErrorNotification(t("devServicesRestartError") || "Ошибка перезапуска сервисов", e?.message || e);
        }
    }

        const {Text} = Typography;
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
        if (!data || !data.name || !data.email) return null;

        return (
            <div className="create-model-container">
                <div className="section-title">
                    <ToolOutlined />
                    {t("devToolsTitle") || "Инструменты разработчика"}
                </div>
                <div className="section-description">
                    {t("devToolsDescription") || "Расширенные настройки системы, управление API ключами и конфигурация сервисов для разработки"}
                </div>

                {/*<div className="container">*/}
                <div className="dialog-list">
                    <Card title={t("devTools") || "Dev Tools"} className="dev-card">

                        <h3>{t("devSessionKey") || "Session Key"}</h3>
                        <div style={{display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16}}>
                            <Descriptions bordered column={1} size="small" style={{marginBottom: 0}}>
                                <Descriptions.Item label={t("devSessionKeyCreatedTime") || "Время создания текущего SessionKey"}>
                                    {data.mhct ? new Date(data.mhct).toLocaleString('ru-RU', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    }).replace(',', ' ') : ''}
                                </Descriptions.Item>
                            </Descriptions>
                            <Button
                                type="primary"
                                danger
                                ghost
                                style={{display: 'flex', alignItems: 'center'}}
                                onClick={() => setIsModalOpen(true)}
                            >
                                {t("devCreateNewSessionKey") || "Создать новый SessionKey"}
                            </Button>
                        </div>
                        <Modal
                            open={isModalOpen}
                            onCancel={() => setIsModalOpen(false)}
                            footer={[
                                <Button key="back" onClick={() => setIsModalOpen(false)}>
                                    {t("cancel") || "Отмена"}
                                </Button>,
                                <Button
                                    key="restart"
                                    type="primary"
                                    danger
                                    onClick={() => {
                                        handleNewSessionKey()
                                        setIsModalOpen(false);
                                    }}
                                >
                                    {t("devChangeSessionKey") || "Изменить sessionKey"}
                                </Button>
                            ]}
                        >
                            <p>{t("devSessionKeyWarning") || "Изменение SessionKey не обратимо, потребуется повторная авторизация пользователей!"}</p>
                        </Modal>
                            <>
                                <h3>{t("devAvailableServices") || "Доступные сервисы"}</h3>
                                {!data.apps || data.apps.length === 0 ? (
                                    <p>{t("devNoServices") || "Нет разрешённых сервисов, установите UserKey"}</p>
                                ) : <p>{t("devAllowedServices") || "Разрешённые сервисы"}: {[...data.apps].join(', ')}</p>}
                                <div style={{display: 'flex', alignItems: 'center', marginBottom: 16}}>
                                    <Button
                                        style={{marginLeft: 'auto', color: 'black', minWidth: 160}}
                                        type="primary"
                                        onClick={() => setIsUserKeyModalOpen(true)}
                                    >
                                        {t("devSetUserKey") || "Установить UserKey"}
                                    </Button>
                                    <Modal
                                        open={isUserKeyModalOpen}
                                        onCancel={() => setIsUserKeyModalOpen(false)}
                                        footer={[
                                            <Button key="cancel" onClick={() => setIsUserKeyModalOpen(false)}>
                                                {t("cancel") || "Отмена"}
                                            </Button>,
                                            <Button
                                                key="save"
                                                type="primary"
                                                style={{color: 'black'}}
                                                onClick={() => {
                                                    setIsUserKeyModalOpen(false);
                                                    handleSaveUserKey()
                                                }}
                                            >
                                                {t("save") || "Сохранить"}
                                            </Button>
                                        ]}
                                    >
                                        <p>{t("devConfirmUserKeySave") || "Подтвердите сохранение UserKey"}</p>
                                        <Form layout="vertical">
                                            <Form.Item label="UserKey">
                                                <Input.TextArea
                                                    value={userKey}
                                                    onChange={e => setUserKey(e.target.value)}
                                                    placeholder={t("devEnterUserKey") || "Введите UserKey"}
                                                    autoSize={{minRows: 3, maxRows: 6}}
                                                />
                                            </Form.Item>
                                        </Form>
                                    </Modal>
                                </div>

                                <h3>{t("devApiOpenAI") || "Ключ API Open AI"}</h3>
                                <div style={{display: 'flex', alignItems: 'center', marginBottom: 16}}>
                                    <div style={{fontWeight: 500, color: '#555'}}>
                                        {t("devApiKeysSaved") || "API ключи сохранены"}: {new Date(data.created_gpt).toLocaleString('ru-RU', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    }).replace(',', ' ')}
                                    </div>
                                    <Button
                                        style={{marginLeft: 'auto', color: 'black', minWidth: 160}}
                                        type="primary"
                                        onClick={() => setIsApiModalOpen(true)}
                                    >
                                        {t("devSetApiKey") || "Установить API KEY"}
                                    </Button>
                                    <Modal
                                        title={t("devApiOpenAI") || "Ключ API Open AI"}
                                        open={isApiModalOpen}
                                        onCancel={() => setIsApiModalOpen(false)}
                                        footer={[
                                            <Button key="cancel" onClick={() => setIsApiModalOpen(false)}>
                                                {t("cancel") || "Отмена"}
                                            </Button>,
                                            <Button
                                                key="save"
                                                type="primary"
                                                style={{color: 'black'}}
                                                onClick={() => {
                                                    setIsApiModalOpen(false);
                                                    handleSaveOpenAIKeyGPT()
                                                }}
                                            >
                                                {t("save") || "Сохранить"}
                                            </Button>
                                        ]}
                                    >
                                        <p>{t("devConfirmApiKeysSave") || "Подтвердите сохранение новых ключей доступа"}</p>
                                        <Form layout="vertical">
                                            <Form.Item label="API keys">
                                                <Input
                                                    value={apiKeys}
                                                    onChange={e => setApiKeys(e.target.value)}
                                                    placeholder={t("devEnterSecretKey") || "Введите Secret Key"}
                                                />
                                            </Form.Item>
                                        </Form>
                                    </Modal>
                                </div>

                                <h3>{t("devApiMistral") || "Ключ API Mistral"}</h3>
                                <div style={{display: 'flex', alignItems: 'center', marginBottom: 16}}>
                                    <div style={{fontWeight: 500, color: '#555'}}>
                                        {t("devApiKeysSaved") || "API ключи сохранены"}: {new Date(data.created_gpt).toLocaleString('ru-RU', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    }).replace(',', ' ')}
                                    </div>
                                    <Button
                                        style={{marginLeft: 'auto', color: 'black', minWidth: 160}}
                                        type="primary"
                                        onClick={() => setIsApiModalMistralOpen(true)}
                                    >
                                        {t("devSetApiKey") || "Установить API KEY"}
                                    </Button>
                                    <Modal
                                        title={t("devApiMistral") || "Ключ API Mistral"}
                                        open={isApiModalMistralOpen}
                                        onCancel={() => setIsApiModalMistralOpen(false)}
                                        footer={[
                                            <Button key="cancel" onClick={() => setIsApiModalMistralOpen(false)}>
                                                {t("cancel") || "Отмена"}
                                            </Button>,
                                            <Button
                                                key="save"
                                                type="primary"
                                                style={{color: 'black'}}
                                                onClick={() => {
                                                    setIsApiModalMistralOpen(false);
                                                    handleSaveMistralKeyGPT()
                                                }}
                                            >
                                                {t("save") || "Сохранить"}
                                            </Button>
                                        ]}
                                    >
                                        <p>{t("devConfirmApiKeysSave") || "Подтвердите сохранение новых ключей доступа"}</p>
                                        <Form layout="vertical">
                                            <Form.Item label="API keys">
                                                <Input
                                                    value={apiKeysMistral}
                                                    onChange={e => setApiKeysMistral(e.target.value)}
                                                    placeholder={t("devEnterSecretKey") || "Введите Secret Key"}
                                                />
                                            </Form.Item>
                                        </Form>
                                    </Modal>
                                </div>

                                <h3>{t("devApiGoogle") || "Ключ API Google"}</h3>
                                <div style={{display: 'flex', alignItems: 'center', marginBottom: 16}}>
                                    <div style={{fontWeight: 500, color: '#555'}}>
                                        {t("devApiKeysSaved") || "API ключи сохранены"}: {new Date(data.created_gpt).toLocaleString('ru-RU', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    }).replace(',', ' ')}
                                    </div>
                                    <Button
                                        style={{marginLeft: 'auto', color: 'black', minWidth: 160}}
                                        type="primary"
                                        onClick={() => setIsApiModalGoogleOpen(true)}
                                    >
                                        {t("devSetApiKey") || "Установить API KEY"}
                                    </Button>
                                    <Modal
                                        title={t("devApiGoogle") || "Ключ API Google"}
                                        open={isApiModalGoogleOpen}
                                        onCancel={() => setIsApiModalGoogleOpen(false)}
                                        footer={[
                                            <Button key="cancel" onClick={() => setIsApiModalGoogleOpen(false)}>
                                                {t("cancel") || "Отмена"}
                                            </Button>,
                                            <Button
                                                key="save"
                                                type="primary"
                                                style={{color: 'black'}}
                                                onClick={() => {
                                                    setIsApiModalGoogleOpen(false);
                                                    handleSaveGoogleKeyGPT()
                                                }}
                                            >
                                                {t("save") || "Сохранить"}
                                            </Button>
                                        ]}
                                    >
                                        <p>{t("devConfirmApiKeysSave") || "Подтвердите сохранение новых ключей доступа"}</p>
                                        <Form layout="vertical">
                                            <Form.Item label="API keys">
                                                <Input
                                                    value={apiKeysGoogle}
                                                    onChange={e => setApiKeysGoogle(e.target.value)}
                                                    placeholder={t("devEnterSecretKey") || "Введите Secret Key"}
                                                />
                                            </Form.Item>
                                        </Form>
                                    </Modal>
                                </div>
                            </>

                        <h3>{t("devEmailNotifications") || "Email рассылки уведомлений"}</h3>
                        <div style={{display: 'flex', alignItems: 'center', marginBottom: 16}}>
                            <Descriptions bordered column={1} size="small" style={{marginBottom: 0}}>
                                <Descriptions.Item label={t("devCurrentEmail") || "Текущий email"}>
                                    {data.Distribution}
                                </Descriptions.Item>
                            </Descriptions>
                            <Button
                                style={{marginLeft: 'auto', color: 'black', minWidth: 160}}
                                type="primary"
                                onClick={() => setIsEmailModalOpen(true)}
                            >
                                {t("devSetEmailData") || "Задать данные email"}
                            </Button>
                            <Modal
                                open={isEmailModalOpen}
                                onCancel={() => setIsEmailModalOpen(false)}
                                footer={[
                                    <Button key="cancel" onClick={() => setIsEmailModalOpen(false)}>
                                        {t("cancel") || "Отмена"}
                                    </Button>,
                                    <Button
                                        key="save"
                                        type="primary"
                                        style={{color: 'black'}}
                                        onClick={() => {
                                            handleSaveDistribData()
                                        }}
                                    >
                                        {t("save") || "Сохранить"}
                                    </Button>
                                ]}
                            >
                                <Form layout="vertical">
                                    <Form.Item label={t("devEmailAddress") || "Адрес email"}>
                                        <Input
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            placeholder={t("devEnterEmail") || "Введите email"}
                                        />
                                    </Form.Item>
                                    <Form.Item label={t("password") || "Пароль"}>
                                        <Input.Password
                                            value={emailPass}
                                            onChange={e => setEmailPass(e.target.value)}
                                            placeholder={t("devEnterPassword") || "Введите пароль"}
                                        />
                                    </Form.Item>
                                    <Form.Item label={t("devHost") || "Хост"}>
                                        <Input
                                            value={emailHost}
                                            onChange={e => setEmailHost(e.target.value)}
                                            placeholder={t("devEnterHost") || "Введите хост"}
                                        />
                                    </Form.Item>
                                    <Form.Item label={t("devPort") || "Порт"}>
                                        <Input
                                            value={emailPort}
                                            onChange={e => setEmailPort(e.target.value)}
                                            placeholder={t("devEnterPort") || "Введите порт"}
                                        />
                                    </Form.Item>
                                </Form>
                            </Modal>
                        </div>

                        <h3>{t("devTelegramBotNotifications") || "TelegramBot рассылки уведомлений"}</h3>
                        <div style={{display: 'flex', alignItems: 'center', marginBottom: 16}}>
                            <Descriptions bordered column={1} size="small" style={{marginBottom: 0}}>
                                <Descriptions.Item label={t("devCurrentBot") || "Текущий Bot"}>
                                    {data.Carpintero}
                                </Descriptions.Item>
                            </Descriptions>
                            <Button
                                style={{marginLeft: 'auto', color: 'black', minWidth: 160}}
                                type="primary"
                                onClick={() => setIsBotModalOpen(true)}
                            >
                                {t("devSetBotToken") || "Задать Bot Token"}
                            </Button>
                            <Modal
                                open={isBotModalOpen}
                                onCancel={() => setIsBotModalOpen(false)}
                                footer={[
                                    <Button key="cancel" onClick={() => setIsBotModalOpen(false)}>
                                        {t("cancel") || "Отмена"}
                                    </Button>,
                                    <Button
                                        key="save"
                                        type="primary"
                                        style={{color: 'black'}}
                                        onClick={() => {
                                            handleSaveBotData()
                                        }}
                                    >
                                        {t("save") || "Сохранить"}
                                    </Button>
                                ]}
                            >
                                <Form layout="vertical">
                                    <Form.Item label="Token">
                                        <Input
                                            value={botToken}
                                            onChange={e => setBotToken(e.target.value)}
                                            placeholder={t("devEnterToken") || "Введите Token"}
                                        />
                                    </Form.Item>
                                    <Form.Item label={t("devBotName") || "Имя бота"}>
                                        <Input
                                            value={botName}
                                            onChange={e => setBotName(e.target.value)}
                                            placeholder={t("devEnterBotName") || "Введите имя бота"}
                                        />
                                    </Form.Item>
                                </Form>
                            </Modal>
                        </div>

                        <h3>{t("devUserData") || "Пользовательские данные"}</h3>
                        <Form layout="vertical" style={{marginTop: 24}}>
                            <Form.Item label={t("name") || "Имя"}>
                                <Input
                                    value={data.newName !== undefined ? data.newName : data.name}
                                    onChange={e => setData({...data, newName: e.target.value})}
                                    placeholder={t("devEnterNewName") || "Введите новое имя"}
                                    disabled={loading}
                                />
                            </Form.Item>
                            <Form.Item label={t("devEmailLogin") || "Email (Логин)"}>
                                <Input
                                    value={data.newEmail !== undefined ? data.newEmail : data.email}
                                    onChange={e => setData({...data, newEmail: e.target.value})}
                                    placeholder={t("devEnterNewEmail") || "Введите новый email"}
                                    disabled={loading}
                                />
                            </Form.Item>
                            <Form.Item label={t("password") || "Пароль"}>
                                <Input.Password
                                    placeholder={t("devEnterNewPassword") || "Введите новый пароль"}
                                    disabled={loading}
                                    value={data.newPassword || ''}
                                    onChange={e => setData({...data, newPassword: e.target.value})}
                                    autoComplete="new-password"
                                />
                            </Form.Item>
                            <Form.Item label={t("devRepeatPassword") || "Повторите пароль"}
                                       validateStatus={data.newPassword && data.repeatPassword !== undefined && data.newPassword !== data.repeatPassword ? "error" : ""}
                                       help={data.newPassword && data.repeatPassword !== undefined && data.newPassword !== data.repeatPassword ? (t("devPasswordMismatch") || "Пароли не совпадают") : undefined}
                            >
                                <Input.Password
                                    placeholder={t("devRepeatNewPassword") || "Повторите новый пароль"}
                                    disabled={loading}
                                    value={data.repeatPassword || ''}
                                    onChange={e => setData({...data, repeatPassword: e.target.value})}
                                    autoComplete="new-password"
                                />
                            </Form.Item>
                            <Form.Item>
                                <div style={{display: "flex", justifyContent: "flex-end"}}>
                                    <Button
                                        type="primary"
                                        style={{color: "black"}}
                                        disabled={!isFormChanged}
                                        onClick={() => setIsSaveModalOpen(true)}
                                    >
                                        {t("devSaveChanges") || "Сохранить изменения"}
                                    </Button>
                                </div>
                            </Form.Item>
                        </Form>
                        <Modal
                            open={isSaveModalOpen}
                            onCancel={() => setIsSaveModalOpen(false)}
                            footer={[
                                <Button key="back" onClick={() => setIsSaveModalOpen(false)}>
                                    {t("cancel") || "Отмена"}
                                </Button>,
                                <Button
                                    style={{color: "black"}}
                                    key="submit"
                                    type="primary"
                                    onClick={() => {
                                        handleSaveUserData()
                                    }}
                                >
                                    {t("save") || "Сохранить"}
                                </Button>,
                            ]}
                        >
                            <p>{t("devConfirmSaveChanges") || "Вы уверены, что хотите сохранить изменения?"}</p>
                        </Modal>
                        <h3>{t("devLanguageModels") || "Языковые модели по провайдерам"}</h3>
                        {!data.available_providers || data.available_providers.length === 0 ? (
                            <p style={{color: '#888', fontStyle: 'italic'}}>
                                {t("devNoProviders") || "Нет доступных провайдеров. Установите API ключи и UserKey."}
                            </p>
                        ) : data.available_providers[0] && data.available_providers[0].provider === undefined ? (
                            <p style={{color: '#ff6b6b', fontStyle: 'italic'}}>
                                {t("devProviderFormatError") || "Ошибка: поле available_providers не содержит данные в формате ProviderInfo."}
                            </p>
                        ) : (
                            data.available_providers.map((providerInfo) => (
                                <div key={providerInfo.provider} style={{marginBottom: 16}}>
                                    <Descriptions bordered column={1} size="small"
                                                  style={{marginTop: 12, width: "100%"}}>
                                        <Descriptions.Item
                                            label={`${t("devProvider") || "Провайдер"}: ${providerInfo.provider}`}
                                        >
                                            <div style={{flex: 1, display: 'flex', alignItems: 'center', gap: 12, padding: 8}}>
                                                <Select
                                                    value={selectedProviderModels[providerInfo.provider] || providerInfo.default_model?.id}
                                                    onChange={value => setSelectedProviderModels({
                                                        ...selectedProviderModels,
                                                        [providerInfo.provider]: value
                                                    })}
                                                    style={{minWidth: 250, flex: 1}}
                                                    className="black-text-select"
                                                >
                                                    {providerInfo.models && providerInfo.models.map(model => (
                                                        <Select.Option key={model.id} value={model.id}>
                                                            {model.name}
                                                        </Select.Option>
                                                    ))}
                                                </Select>
                                                <Button
                                                    style={{color: "black"}}
                                                    type="primary"
                                                    onClick={() => handleUpdateModelClick(providerInfo.provider)}
                                                    disabled={selectedProviderModels[providerInfo.provider] === providerInfo.default_model?.id}
                                                >
                                                    {t("devSetAsDefault") || "Установить по умолчанию"}
                                                </Button>
                                            </div>
                                        </Descriptions.Item>
                                    </Descriptions>
                                </div>
                            ))
                        )}
                        <h3>{t("devServices") || "Сервисы"}</h3>
                        <div style={{display: 'flex', alignItems: 'center', marginBottom: 16}}>
                            <Descriptions bordered column={1} size="small" style={{marginBottom: 0}}>
                                <Descriptions.Item label={t("devRestartServicesLabel") || "Перезапуск сервисов после изменения глобальных настроек"} children={""}>
                                </Descriptions.Item>
                            </Descriptions>
                            <Button
                                type="primary"
                                danger
                                ghost
                                style={{display: 'flex', alignItems: 'center'}}
                                onClick={() => setIsModalServiceOpen(true)}
                            >
                                {t("devRestartServices") || "Перезапуск сервисов"}
                            </Button>
                            <Modal
                                open={isModalServiceOpen}
                                onCancel={() => setIsModalServiceOpen(false)}
                                footer={[
                                    <Button key="cancel" onClick={() => setIsModalServiceOpen(false)}>
                                        {t("cancel") || "Отмена"}
                                    </Button>,
                                    <Button
                                        key="restart"
                                        type="primary"
                                        danger
                                        onClick={() => {
                                            handleRestartServices()
                                            setIsModalServiceOpen(false);
                                        }}
                                    >
                                        {t("devRestartServices") || "Перезапустить сервисы"}
                                    </Button>
                                ]}
                            >
                                <p>{t("devConfirmRestartServices") || "Вы уверены, что хотите перезапустить сервисы?"}</p>
                            </Modal>
                        </div>
                    </Card>
                </div>
            {/*</div>*/}
        </div>
    );
}
