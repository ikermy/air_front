import React, {useCallback, useContext, useEffect, useState} from "react";
import {Card, Form, Input, Select, Descriptions, Spin, Button, Modal, Typography} from "antd";
import {getDevData} from "./getDevData";
import {showErrorNotification, showNotification} from "../../hotification/showNotification";
import {setNewSessionKey} from "./setNewSessionKey";
import "../../../dashboard/hotification/style.css";
import {useNavigate} from "react-router-dom";
import {useAuth} from "../../../AuthContext";
import {updateUserData} from "./updateUserData";
import {encryptPassword, getKey} from "../../../utils/easyUtils";
import {UserContext} from "../../../index";
import {changeModelGPT} from "./changeModelGPT";
import {setKeyGPT} from "./setKeyGPT";
import {setDistribMailData} from "./setDistribMailData";
import {restartServices} from "./restartServices";
import {setBotData} from "./setBotData";
import {setUserKeyFn} from "./setUserKeyFn";
import {ToolOutlined} from "@ant-design/icons";


export const Dev = () => {
    const [data, setData] = useState({}); // Всё что возвращает getDevData
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isModalServiceOpen, setIsModalServiceOpen] = useState(false);
    const [selectedModel, setSelectedModel] = useState(null);
    const [isModelModalOpen, setIsModelModalOpen] = useState(false);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const navigate = useNavigate();
    const token = localStorage.getItem("authToken");
    const userId = useContext(UserContext);
    const [isApiModalOpen, setIsApiModalOpen] = useState(false);
    const [project, setProject] = useState('');
    const [apiKeys, setApiKeys] = useState('');
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
            setData(result || {});
        } catch (e) {
            showErrorNotification("Ошибка получения данных", e);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (data) setSelectedModel(data.model);
    }, [data]);

    const isPasswordsMatch = !data.newPassword || data.newPassword === data.repeatPassword;
    const isFormChanged = (
        (data.newName !== undefined && data.newName !== data.name) ||
        (data.newEmail !== undefined && data.newEmail !== data.email) ||
        (data.newPassword && data.newPassword.length > 0)
    ) && isPasswordsMatch;

    const {logout} = useAuth();

    const handleUpdateModelClick = () => {
        const modelObj = data.gpt_models.find(model => model.Id === selectedModel);
        handleUpdateModel(selectedModel, modelObj?.Name);
    };

    const handleUpdateModel = async (modelId, modelName) => {
        try {
            const result = await changeModelGPT(token, modelId, modelName);
            if (result) {
                showNotification("Успех", "Пользовательские данные успешно обновлены!");
            } else {
                showErrorNotification("Ошибка", "Не удалось обновить пользовательские данные");
            }
        } catch (e) {
            showErrorNotification("Ошибка обновления модели", e);
        } finally {
            // Жду секунду перед обновлением данных
            setTimeout(() => {
            }, 1000);
            await fetchData()
        }
    }

    const handleNewSessionKey = async () => {
        try {
            await setNewSessionKey(token);
            showNotification("SessionKey создан", "Завершение сессии");
            localStorage.removeItem("authToken");
            // Удаление cookie MarusiaRefreshToken
            document.cookie = "MarusiaRefreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            logout();
            navigate("/");
        } catch (e) {
            showErrorNotification("Ошибка создания SessionKey", e);
        }
    }

    const handleSaveUserData = async () => {
        try {
            const key = await getKey({userId});
            if (key.status !== "ok") {
                throw new Error("Не удалось получить ключ шифрования");
            }

            const encryptedPassword = await encryptPassword(data.newPassword, key.key);

            const result = await updateUserData(token, userId, data.newName, data.newEmail, encryptedPassword);
            if (result) {
                showNotification("Успех", "Пользовательские данные успешно обновлены!");
            } else {
                showErrorNotification("Ошибка", "Не удалось обновить пользовательские данные");
            }
        } catch (e) {
            showErrorNotification("Ошибка", e);
        } finally {
            setIsSaveModalOpen(false);
            // Жду секунду перед обновлением данных
            setTimeout(() => {
            }, 1000);
            await fetchData()
        }
    }

    const handleSaveKeyGPT = async () => {
        try {
            const key = await getKey({userId});
            if (key.status !== "ok") {
                throw new Error("Не удалось получить ключ шифрования");
            }

            const encryptedApiKeys = await encryptPassword(apiKeys, key.key);

            const result = await setKeyGPT(token, userId, project, encryptedApiKeys);
            if (result) {
                showNotification("Успех", "API ключи успешно обновлены!");
            } else {
                showErrorNotification("Ошибка", "Не удалось обновить API ключи");
            }
        } catch (e) {
            showErrorNotification("Ошибка", e);
        } finally {
            // Жду секунду перед обновлением данных
            setTimeout(() => {
                setApiKeys("")
                setProject("")
            }, 2000);
            await fetchData()
        }
    }

    const handleSaveUserKey = async () => {
        try {
            const key = await getKey({userId});
            if (key.status !== "ok") {
                throw new Error("Не удалось получить ключ шифрования");
            }

            const encryptedUserKey = await encryptPassword(userKey, key.key);

            const result = await setUserKeyFn(token, userId, encryptedUserKey);
            if (result) {
                showNotification("Успех", "UserKey успешно обновлен!");
            } else {
                showErrorNotification("Ошибка", "Не удалось обновить UserKey");
            }
        } catch (e) {
            showErrorNotification("Ошибка", e);
        } finally {
            setUserKey("");
            showNotification(
                "Требуется обновление страницы",
                "Сервер перезапускается после обновления UserKey. Пожалуйста, обновите страницу через несколько секунд."
            );
        }
    }

    const handleSaveDistribData = async () => {
        try {
            const key = await getKey({userId});
            if (key.status !== "ok") {
                throw new Error("Не удалось получить ключ шифрования");
            }
            const encryptedPass = await encryptPassword(emailPass, key.key);
            const result = await setDistribMailData(token, userId, email, encryptedPass, emailHost, emailPort);
            if (result) {
                showNotification("Успех", "Данные Email успешно обновлены!");
            } else {
                showErrorNotification("Ошибка", "Не удалось обновить данные Email");
            }
        } catch (e) {
            showErrorNotification("Ошибка", e);
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
                throw new Error("Не удалось получить ключ шифрования");
            }
            const encryptedToken = await encryptPassword(botToken, key.key);
            const result = await setBotData(token, userId, botName, encryptedToken);
            if (result) {
                showNotification("Успех", "Данные TelegramBot успешно обновлены!");
            } else {
                showErrorNotification("Ошибка", "Не удалось обновить данные TelegramBot");
            }
        } catch (e) {
            showErrorNotification("Ошибка", e);
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
            showNotification("Выполняется перезапуск сервисов...");
            let response;
            try {
                response = await restartServices(token);
            } catch (networkError) {
                showNotification("Перезапуск сервисов выполнен!", "Связь с сервером временно потеряна, сервисы перезапускаются.");
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
                    showErrorNotification("Ошибка при перезапуске сервисов", details);
                } else {
                    showNotification("Сервисы перезапущены", details);
                }
            } else {
                showNotification("Перезапуск сервисов инициирован", "Ожидайте восстановления связи. Возможно, соединение будет временно потеряно.");
            }
        } catch (e) {
            showErrorNotification("Ошибка перезапуска сервисов", e?.message || e);
        }
    }

    const { Text} = Typography;
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
    if (!data || !data.name || !data.email) return null;

    return (
        <div className="create-model-container">
            <div className="section-title">
                <ToolOutlined />
                Инструменты разработчика
            </div>
            <div className="section-description">
                Расширенные настройки системы, управление API ключами и конфигурация сервисов для разработки
            </div>

            {/*<div className="container">*/}
                <div className="dialog-list">
                    <Card title="Dev Tools" className="dev-card">

                        <h3>Session Key</h3>
                        <div style={{display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16}}>
                            <Descriptions bordered column={1} size="small" style={{marginBottom: 0}}>
                                <Descriptions.Item label="Время создания текущего SessionKey">
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
                                Создать новый SessionKey
                            </Button>
                        </div>
                        <Modal
                            open={isModalOpen}
                            onCancel={() => setIsModalOpen(false)}
                            footer={[
                                <Button key="back" onClick={() => setIsModalOpen(false)}>
                                    Отмена
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
                                    Изменить sessionKey
                                </Button>
                            ]}
                        >
                            <p>Изменение SessionKey не обратимо, потребуется повторная авторизация пользователей!</p>
                        </Modal>
                        {data.created_gpt && (
                            <>
                                <h3>Доступные сервисы</h3>
                                {!data.apps || data.apps.length === 0 ? (
                                    <p>Нет разрешённых сервисов, установите UserKey</p>
                                ) : <p>Разрешённые сервисы: {[...data.apps].join(', ')}</p>}
                                <div style={{display: 'flex', alignItems: 'center', marginBottom: 16}}>
                                    <Button
                                        style={{marginLeft: 'auto', color: 'black', minWidth: 160}}
                                        type="primary"
                                        onClick={() => setIsUserKeyModalOpen(true)}
                                    >
                                        Установить UserKey
                                    </Button>
                                    <Modal
                                        open={isUserKeyModalOpen}
                                        onCancel={() => setIsUserKeyModalOpen(false)}
                                        footer={[
                                            <Button key="cancel" onClick={() => setIsUserKeyModalOpen(false)}>
                                                Отмена
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
                                                Сохранить
                                            </Button>
                                        ]}
                                    >
                                        <p>Подтвердите сохранение UserKey</p>
                                        <Form layout="vertical">
                                            <Form.Item label="UserKey">
                                                <Input.TextArea
                                                    value={userKey}
                                                    onChange={e => setUserKey(e.target.value)}
                                                    placeholder="Введите UserKey"
                                                    autoSize={{ minRows: 3, maxRows: 6 }}
                                                />
                                            </Form.Item>
                                        </Form>
                                    </Modal>
                                </div>

                                <h3>Данные API Open AI</h3>
                                <div style={{display: 'flex', alignItems: 'center', marginBottom: 16}}>
                                    <div style={{fontWeight: 500, color: '#555'}}>
                                        API ключи сохранены: {new Date(data.created_gpt).toLocaleString('ru-RU', {
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
                                        Установить API KEY
                                    </Button>
                                    <Modal
                                        open={isApiModalOpen}
                                        onCancel={() => setIsApiModalOpen(false)}
                                        footer={[
                                            <Button key="cancel" onClick={() => setIsApiModalOpen(false)}>
                                                Отмена
                                            </Button>,
                                            <Button
                                                key="save"
                                                type="primary"
                                                style={{color: 'black'}}
                                                onClick={() => {
                                                    setIsApiModalOpen(false);
                                                    handleSaveKeyGPT()
                                                }}
                                            >
                                                Сохранить
                                            </Button>
                                        ]}
                                    >
                                        <p>Подтвердите сохранение новых ключей доступа</p>
                                        <Form layout="vertical">
                                            <Form.Item label="Project">
                                                <Input
                                                    value={project}
                                                    onChange={e => setProject(e.target.value)}
                                                    placeholder="Введите Project ID"
                                                />
                                            </Form.Item>
                                            <Form.Item label="API keys">
                                                <Input
                                                    value={apiKeys}
                                                    onChange={e => setApiKeys(e.target.value)}
                                                    placeholder="Введите Secret Key"
                                                />
                                            </Form.Item>
                                        </Form>
                                    </Modal>
                                </div>
                            </>
                        )}
                        <h3>Email рассылки уведомлений</h3>
                        <div style={{display: 'flex', alignItems: 'center', marginBottom: 16}}>
                            <Descriptions bordered column={1} size="small" style={{marginBottom: 0}}>
                                <Descriptions.Item label="Текущий email">
                                    {data.Distribution}
                                </Descriptions.Item>
                            </Descriptions>
                            <Button
                                style={{marginLeft: 'auto', color: 'black', minWidth: 160}}
                                type="primary"
                                onClick={() => setIsEmailModalOpen(true)}
                            >
                                Задать данные email
                            </Button>
                            <Modal
                                open={isEmailModalOpen}
                                onCancel={() => setIsEmailModalOpen(false)}
                                footer={[
                                    <Button key="cancel" onClick={() => setIsEmailModalOpen(false)}>
                                        Отмена
                                    </Button>,
                                    <Button
                                        key="save"
                                        type="primary"
                                        style={{color: 'black'}}
                                        onClick={() => {
                                            handleSaveDistribData()
                                        }}
                                    >
                                        Сохранить
                                    </Button>
                                ]}
                            >
                                <Form layout="vertical">
                                    <Form.Item label="Адрес email">
                                        <Input
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            placeholder="Введите email"
                                        />
                                    </Form.Item>
                                    <Form.Item label="Пароль">
                                        <Input.Password
                                            value={emailPass}
                                            onChange={e => setEmailPass(e.target.value)}
                                            placeholder="Введите пароль"
                                        />
                                    </Form.Item>
                                    <Form.Item label="Хост">
                                        <Input
                                            value={emailHost}
                                            onChange={e => setEmailHost(e.target.value)}
                                            placeholder="Введите хост"
                                        />
                                    </Form.Item>
                                    <Form.Item label="Порт">
                                        <Input
                                            value={emailPort}
                                            onChange={e => setEmailPort(e.target.value)}
                                            placeholder="Введите порт"
                                        />
                                    </Form.Item>
                                </Form>
                            </Modal>
                        </div>

                        <h3>TelegramBot рассылки уведомлений</h3>
                        <div style={{display: 'flex', alignItems: 'center', marginBottom: 16}}>
                            <Descriptions bordered column={1} size="small" style={{marginBottom: 0}}>
                                <Descriptions.Item label="Текущий Bot">
                                    {data.Carpintero}
                                </Descriptions.Item>
                            </Descriptions>
                            <Button
                                style={{marginLeft: 'auto', color: 'black', minWidth: 160}}
                                type="primary"
                                onClick={() => setIsBotModalOpen(true)}
                            >
                                Задать Bot Token
                            </Button>
                            <Modal
                                open={isBotModalOpen}
                                onCancel={() => setIsBotModalOpen(false)}
                                footer={[
                                    <Button key="cancel" onClick={() => setIsBotModalOpen(false)}>
                                        Отмена
                                    </Button>,
                                    <Button
                                        key="save"
                                        type="primary"
                                        style={{color: 'black'}}
                                        onClick={() => {
                                            handleSaveBotData()
                                        }}
                                    >
                                        Сохранить
                                    </Button>
                                ]}
                            >
                                <Form layout="vertical">
                                    <Form.Item label="Token">
                                        <Input
                                            value={botToken}
                                            onChange={e => setBotToken(e.target.value)}
                                            placeholder="Введите Token"
                                        />
                                    </Form.Item>
                                    <Form.Item label="Имя бота">
                                        <Input
                                            value={botName}
                                            onChange={e => setBotName(e.target.value)}
                                            placeholder="Введите имя бота"
                                        />
                                    </Form.Item>
                                </Form>
                            </Modal>
                        </div>

                        <h3>Пользовательские данные</h3>
                        <Form layout="vertical" style={{marginTop: 24}}>
                            <Form.Item label="Имя">
                                <Input
                                    value={data.newName !== undefined ? data.newName : data.name}
                                    onChange={e => setData({...data, newName: e.target.value})}
                                    placeholder="Введите новое имя"
                                    disabled={loading}
                                />
                            </Form.Item>
                            <Form.Item label="Email (Логин)">
                                <Input
                                    value={data.newEmail !== undefined ? data.newEmail : data.email}
                                    onChange={e => setData({...data, newEmail: e.target.value})}
                                    placeholder="Введите новый email"
                                    disabled={loading}
                                />
                            </Form.Item>
                            <Form.Item label="Пароль">
                                <Input.Password
                                    placeholder="Введите новый пароль"
                                    disabled={loading}
                                    value={data.newPassword || ''}
                                    onChange={e => setData({...data, newPassword: e.target.value})}
                                    autoComplete="new-password"
                                />
                            </Form.Item>
                            <Form.Item label="Повторите пароль"
                                       validateStatus={data.newPassword && data.repeatPassword !== undefined && data.newPassword !== data.repeatPassword ? "error" : ""}
                                       help={data.newPassword && data.repeatPassword !== undefined && data.newPassword !== data.repeatPassword ? "Пароли не совпадают" : undefined}
                            >
                                <Input.Password
                                    placeholder="Повторите новый пароль"
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
                                        Сохранить изменения
                                    </Button>
                                </div>
                            </Form.Item>
                        </Form>
                        <Modal
                            open={isSaveModalOpen}
                            onCancel={() => setIsSaveModalOpen(false)}
                            footer={[
                                <Button key="back" onClick={() => setIsSaveModalOpen(false)}>
                                    Отмена
                                </Button>,
                                <Button
                                    style={{color: "black"}}
                                    key="submit"
                                    type="primary"
                                    onClick={() => {
                                        // setIsSaveModalOpen(false);
                                        handleSaveUserData()
                                    }}
                                >
                                    Сохранить
                                </Button>,
                            ]}
                        >
                            <p>Вы уверены, что хотите сохранить изменения?</p>
                        </Modal>
                        <h3>Тип языковой модели</h3>
                        <Descriptions bordered column={1} size="small" style={{marginTop: 24, width: "100%"}}>
                            <Descriptions.Item label="Тип языковой модели" contentStyle={{padding: 0}}>
                                <div style={{flex: 1, display: 'flex', alignItems: 'center', gap: 12}}>
                                    <Select
                                        value={selectedModel}
                                        onChange={value => setSelectedModel(value)}
                                        style={{minWidth: 200, flex: 1}}
                                    >
                                        {data.gpt_models.map(model => (
                                            <Select.Option key={model.Id} value={model.Id}>
                                                {model.Name}
                                            </Select.Option>
                                        ))}
                                    </Select>
                                    <Button
                                        style={{color: "black"}}
                                        type="primary"
                                        onClick={() => setIsModelModalOpen(true)}
                                        disabled={selectedModel === data.model}
                                    >
                                        Изменить модель
                                    </Button>
                                </div>
                                <Modal
                                    open={isModelModalOpen}
                                    onCancel={() => setIsModelModalOpen(false)}
                                    footer={[
                                        <Button key="back" onClick={() => setIsModelModalOpen(false)}>
                                            Отмена
                                        </Button>,
                                        <Button
                                            style={{color: "black"}}
                                            key="submit"
                                            type="primary"
                                            onClick={() => {
                                                setIsModelModalOpen(false);
                                                handleUpdateModelClick()
                                            }}
                                        >
                                            Сохранить
                                        </Button>,
                                    ]}
                                >
                                    <p>Вы уверены, что хотите изменить используемую модель?</p>
                                </Modal>
                            </Descriptions.Item>
                        </Descriptions>
                        <h3>Сервисы</h3>
                        <div style={{display: 'flex', alignItems: 'center', marginBottom: 16}}>
                            <Descriptions bordered column={1} size="small" style={{marginBottom: 0}}>
                                <Descriptions.Item label="Перезапуск сервисов после изменения глобальных настроек" children={""}>
                                </Descriptions.Item>
                            </Descriptions>
                            <Button
                                type="primary"
                                danger
                                ghost
                                style={{display: 'flex', alignItems: 'center'}}
                                onClick={() => setIsModalServiceOpen(true)}
                            >
                                Перезапуск сервисов
                            </Button>
                            <Modal
                                open={isModalServiceOpen}
                                onCancel={() => setIsModalServiceOpen(false)}
                                footer={[
                                    <Button key="cancel" onClick={() => setIsModalServiceOpen(false)}>
                                        Отмена
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
                                        Перезапустить сервисы
                                    </Button>
                                ]}
                            >
                                <p>Вы уверены, что хотите перезапустить сервисы?</p>
                            </Modal>
                        </div>
                    </Card>
                </div>
            {/*</div>*/}
        </div>
    );
}
