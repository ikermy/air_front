import React, {useCallback, useContext, useEffect, useState} from "react";
import {Card, Form, Input, Descriptions, Spin, Button, Modal, Typography} from "antd";
import {useTranslation} from 'react-i18next';
import {showErrorNotification, showNotification} from "../../hotification/showNotification";
import {useNavigate} from "react-router-dom";
import {goToLanding} from "../../../utils/goToLanding";
import {useAuth} from "../../../AuthContext";
import {encryptPassword, getKey} from "../../../utils/easyUtils";
import {UserContext} from "../../../UserContext";
import {ToolOutlined} from "@ant-design/icons";
import {
    getDevData, setDistribMailData, setNewSessionKey, setGAuthData, setCarpinteroData, getSvcKey, generateSvcKey,
    setOperBotData, generateWidgKey
} from "./gevUtils";


export const Dev = () => {
    const {t} = useTranslation();
    const [data, setData] = useState({}); // Всё что возвращает getDevData
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const navigate = useNavigate();
    const userId = useContext(UserContext);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [emailPass, setEmailPass] = useState('');
    const [emailHost, setEmailHost] = useState('');
    const [emailPort, setEmailPort] = useState('');

    const [isGAuthModalOpen, setIsGAuthModalOpen] = useState(false);
    const [gauthUrl, setGauthUrl] = useState('');
    const [gauthId, setGauthId] = useState('');
    const [gauthSec, setGauthSec] = useState('');

    const [isCarpinteroModalOpen, setIsCarpinteroModalOpen] = useState(false);
    const [carpinteroBotToken, setCarpinteroBotToken] = useState('');
    const [carpinteroBotName, setCarpinteroBotName] = useState('');

    const [isOperBotModalOpen, setIsOperBotModalOpen] = useState(false);
    const [operBotToken, setOperBotToken] = useState('');
    const [operBotName, setOperBotName] = useState('');

    const [svcKey, setSvcKey] = useState('');
    const [svcKeyLoading, setSvcKeyLoading] = useState(false);
    const [isGenerateSvcKeyModalOpen, setIsGenerateSvcKeyModalOpen] = useState(false);
    const [isGenerateWidgetKeyModalOpen, setIsGenerateWidgetKeyModalOpen] = useState(false);


    const fetchData = useCallback(async () => {
        try {
            const result = await getDevData();
            setData(result || {});
        } catch (e) {
            showErrorNotification(t("devDataFetchError") || "Ошибка получения данных", e);
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const {logout} = useAuth();

    const handleNewSessionKey = async () => {
        try {
            await setNewSessionKey();
            showNotification(t("devSessionKeyCreated") || "SessionKey создан", t("devSessionEnding") || "Завершение сессии");
            localStorage.removeItem("authToken");
            // Удаление cookie MarusiaRefreshToken
            document.cookie = "MarusiaRefreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            logout();
            // Выход на лендинг: он в App Router, клиентская навигация туда не доведёт.
            goToLanding();
        } catch (e) {
            showErrorNotification(t("devSessionKeyError") || "Ошибка создания SessionKey", e);
        }
    }

    const handleSaveDistribData = async () => {
        try {
            const key = await getKey({userId});
            if (key.status !== "ok") {
                throw new Error(t("devEncryptionKeyError") || "Не удалось получить ключ шифрования");
            }
            const encryptedPass = await encryptPassword(emailPass, key.key);
            const result = await setDistribMailData(userId, email, encryptedPass, emailHost, emailPort);
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
    const handleSaveGAuthData = async () => {
        try {
            const key = await getKey({userId});
            if (key.status !== "ok") {
                throw new Error(t("devEncryptionKeyError") || "Не удалось получить ключ шифрования");
            }
            const encryptedGauthSec = await encryptPassword(gauthSec, key.key);

            await setGAuthData(userId, gauthUrl, gauthId, encryptedGauthSec);
            showNotification(t("success") || "Успех", t("devGAuthDataUpdated") || "Данные Google OAuth успешно обновлены!");
        } catch (e) {
            showErrorNotification(t("error") || "Ошибка", e);
        } finally {
            setIsGAuthModalOpen(false);
            setTimeout(() => {
                setGauthUrl('');
                setGauthId('');
                setGauthSec('');
            }, 1000);
            await fetchData();
        }
    };

    const handleSaveCarpinteroData = async () => {
        try {
            const key = await getKey({userId});
            if (key.status !== "ok") {
                throw new Error(t("devEncryptionKeyError") || "Не удалось получить ключ шифрования");
            }
            const encryptedToken = await encryptPassword(carpinteroBotToken, key.key);

            await setCarpinteroData(userId, encryptedToken, carpinteroBotName);
            showNotification(t("success") || "Успех", t("devCarpinteroDataUpdated") || "Данные Carpintero успешно обновлены!");
        } catch (e) {
            showErrorNotification(t("error") || "Ошибка", e);
        } finally {
            setIsCarpinteroModalOpen(false);
            setTimeout(() => {
                setCarpinteroBotToken('');
                setCarpinteroBotName('');
            }, 1000);
            await fetchData();
        }
    };

    const handleSaveOperBotData = async () => {
        try {
            const key = await getKey({userId});
            if (key.status !== "ok") {
                throw new Error(t("devEncryptionKeyError") || "Не удалось получить ключ шифрования");
            }
            const encryptedToken = await encryptPassword(operBotToken, key.key);

            await setOperBotData(userId, encryptedToken, operBotName);
            showNotification(t("success") || "Успех", t("devOperBotDataUpdated") || "Данные OperBot успешно обновлены!");
        } catch (e) {
            showErrorNotification(t("error") || "Ошибка", e);
        } finally {
            setIsOperBotModalOpen(false);
            setTimeout(() => {
                setOperBotToken('');
                setOperBotName('');
            }, 1000);
            await fetchData();
        }
    };

    const handleGetSvcKey = async () => {
        setSvcKeyLoading(true);
        try {
            const result = await getSvcKey();
            setSvcKey(result.service_key || '');
        } catch (e) {
            showErrorNotification(t("error") || "Ошибка", e);
        } finally {
            setSvcKeyLoading(false);
        }
    };

    const handleGenerateSvcKey = async () => {
        setSvcKeyLoading(true);
        try {
            const result = await generateSvcKey();
            setSvcKey(result.service_key || '');
            setIsGenerateSvcKeyModalOpen(false);
            showNotification(t("devSvcKeyGenerated") || "Ключ сгенерирован", t("devSvcKeySaveWarning") || "Сохраните ключ — повторно он не будет показан в явном виде!");
        } catch (e) {
            showErrorNotification(t("error") || "Ошибка", e);
        } finally {
            setSvcKeyLoading(false);
        }
    };

    const handleGenerateWidgetKey = async () => {
        setSvcKeyLoading(true);
        try {
            await generateWidgKey(); // возвращает true при успехе
            setIsGenerateWidgetKeyModalOpen(false);
            await fetchData();
            showNotification(
                t("devWidgKeyGenerated") || "Widget ключи сгенерированы",
                t("devWidgKeySaveWarning") || "Ключи сохранены в конфиге, повторно получить plaintext нельзя."
            );
        } catch (e) {
            showErrorNotification(t("error") || "Ошибка", e);
        } finally {
            setSvcKeyLoading(false);
        }
    };

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
    if (!data || data.email === undefined) return null;

    return (
        <div className="create-model-container">
            <div className="section-title">
                <ToolOutlined/>
                {t("devToolsTitle") || "Инструменты разработчика"}
            </div>
            <div className="section-description">
                {t("devToolsDescription") || "Расширенные настройки системы, управление API ключами и конфигурация сервисов для разработки"}
            </div>

            {/*<div className="container">*/}
            <div className="dialog-list">
                <Card>

                    <h3>{t("devSessionKey") || "Session Key"}</h3>
                    <div style={{display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16}}>
                        <Descriptions bordered column={1} size="small" style={{marginBottom: 0}}>
                            <Descriptions.Item
                                label={t("devSessionKeyCreatedTime") || "Время создания текущего SessionKey"}>
                                {data.session_created ? new Date(data.session_created).toLocaleString('ru-RU', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                }).replace(',', ' ') : '—'}
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

                    <h3>{t("devEmailNotifications") || "Email рассылки уведомлений"}</h3>
                    <div style={{display: 'flex', alignItems: 'center', marginBottom: 16}}>
                        <Descriptions bordered column={1} size="small" style={{marginBottom: 0}}>
                            <Descriptions.Item label={t("devCurrentEmail") || "Текущий email"}>
                                {data.email}
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

                    <h3>{t("devGoogleOAuth") || "Google OAuth"}</h3>
                    <div style={{display: 'flex', alignItems: 'center', marginBottom: 16}}>
                        <Descriptions bordered column={1} size="small" style={{marginBottom: 0}}>
                            <Descriptions.Item label={t("devGAuthClientID") || "Client ID"}>
                                {data.google_id || '—'}
                            </Descriptions.Item>
                        </Descriptions>
                        <Button
                            style={{marginLeft: 'auto', color: 'black', minWidth: 160}}
                            type="primary"
                            onClick={() => setIsGAuthModalOpen(true)}
                        >
                            {t("devSetGAuthData") || "Задать данные OAuth"}
                        </Button>
                        <Modal
                            open={isGAuthModalOpen}
                            onCancel={() => setIsGAuthModalOpen(false)}
                            title={t("devGoogleOAuth") || "Google OAuth"}
                            footer={[
                                <Button key="cancel" onClick={() => setIsGAuthModalOpen(false)}>
                                    {t("cancel") || "Отмена"}
                                </Button>,
                                <Button
                                    key="save"
                                    type="primary"
                                    style={{color: 'black'}}
                                    onClick={handleSaveGAuthData}
                                >
                                    {t("save") || "Сохранить"}
                                </Button>
                            ]}
                        >
                            <Form layout="vertical">
                                <Form.Item label={t("devGAuthRedirectUrl") || "Redirect URL"}>
                                    <Input
                                        value={gauthUrl}
                                        onChange={e => setGauthUrl(e.target.value)}
                                        placeholder="https://example.com/auth/callback"
                                    />
                                </Form.Item>
                                <Form.Item label={t("devGAuthClientID") || "Client ID"}>
                                    <Input
                                        value={gauthId}
                                        onChange={e => setGauthId(e.target.value)}
                                        placeholder={t("devEnterClientID") || "Введите Client ID"}
                                    />
                                </Form.Item>
                                <Form.Item label={t("devGAuthClientSecret") || "Client Secret"}>
                                    <Input.Password
                                        value={gauthSec}
                                        onChange={e => setGauthSec(e.target.value)}
                                        placeholder={t("devEnterClientSecret") || "Введите Client Secret"}
                                    />
                                </Form.Item>
                            </Form>
                        </Modal>
                    </div>

                    <h3>{t("devCarpintero") || "Carpintero (Telegram Bot)"}</h3>
                    <div style={{display: 'flex', alignItems: 'center', marginBottom: 16}}>
                        <Descriptions bordered column={1} size="small" style={{marginBottom: 0}}>
                            <Descriptions.Item label={t("devCarpinteroBotName") || "Имя бота"}>
                                {data.bot_name || '—'}
                            </Descriptions.Item>
                        </Descriptions>
                        <Button
                            style={{marginLeft: 'auto', color: 'black', minWidth: 160}}
                            type="primary"
                            onClick={() => setIsCarpinteroModalOpen(true)}
                        >
                            {t("devSetCarpinteroData") || "Задать данные бота"}
                        </Button>

                        <Modal
                            open={isCarpinteroModalOpen}
                            onCancel={() => setIsCarpinteroModalOpen(false)}
                            title={t("devCarpintero") || "Carpintero"}
                            footer={[
                                <Button key="cancel" onClick={() => setIsCarpinteroModalOpen(false)}>
                                    {t("cancel") || "Отмена"}
                                </Button>,
                                <Button
                                    key="save"
                                    type="primary"
                                    style={{color: 'black'}}
                                    onClick={handleSaveCarpinteroData}
                                >
                                    {t("save") || "Сохранить"}
                                </Button>
                            ]}
                        >
                            <Form layout="vertical">
                                <Form.Item label={t("devCarpinteroBotName") || "Имя бота"}>
                                    <Input
                                        value={carpinteroBotName}
                                        onChange={e => setCarpinteroBotName(e.target.value)}
                                        placeholder={t("devEnterBotName") || "Введите имя бота"}
                                    />
                                </Form.Item>
                                <Form.Item label={t("devCarpinteroBotToken") || "Bot Token"}>
                                    <Input.Password
                                        value={carpinteroBotToken}
                                        onChange={e => setCarpinteroBotToken(e.target.value)}
                                        placeholder={t("devEnterBotToken") || "Введите токен бота"}
                                    />
                                </Form.Item>
                            </Form>
                        </Modal>
                    </div>

                    <h3>{t("devOperatorsBot") || "Telegram Bot бля операторского режима"}</h3>
                    <div style={{display: 'flex', alignItems: 'center', marginBottom: 16}}>
                        <Descriptions bordered column={1} size="small" style={{marginBottom: 0}}>
                            <Descriptions.Item label={t("devCarpinteroBotName") || "Имя бота"}>
                                {data.operbot_name || '—'}
                            </Descriptions.Item>
                        </Descriptions>
                        <Button
                            style={{marginLeft: 'auto', color: 'black', minWidth: 160}}
                            type="primary"
                            onClick={() => setIsOperBotModalOpen(true)}
                        >
                            {t("devSetCarpinteroData") || "Задать данные бота"}
                        </Button>
                        <Modal
                            open={isOperBotModalOpen}
                            onCancel={() => setIsOperBotModalOpen(false)}
                            title={t("devOperatorsBot") || "Telegram Bot бля операторского режима"}
                            footer={[
                                <Button key="cancel" onClick={() => setIsOperBotModalOpen(false)}>
                                    {t("cancel") || "Отмена"}
                                </Button>,
                                <Button
                                    key="save"
                                    type="primary"
                                    style={{color: 'black'}}
                                    onClick={handleSaveOperBotData}
                                >
                                    {t("save") || "Сохранить"}
                                </Button>
                            ]}
                        >
                            <Form layout="vertical">
                                <Form.Item label={t("devCarpinteroBotName") || "Имя бота"}>
                                    <Input
                                        value={operBotName}
                                        onChange={e => setOperBotName(e.target.value)}
                                        placeholder={t("devEnterBotName") || "Введите имя бота"}
                                    />
                                </Form.Item>
                                <Form.Item label={t("devCarpinteroBotToken") || "Bot Token"}>
                                    <Input.Password
                                        value={operBotToken}
                                        onChange={e => setOperBotToken(e.target.value)}
                                        placeholder={t("devEnterBotToken") || "Введите токен бота"}
                                    />
                                </Form.Item>
                            </Form>
                        </Modal>
                    </div>

                    <h3>{t("devSvcKey") || "gRPC Service Key"}</h3>
                    <div style={{display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16}}>
                        {svcKey && (
                            <Descriptions bordered column={1} size="small">
                                <Descriptions.Item label={t("devSvcKeyValue") || "Service Key"}>
                                    <Typography.Text copyable code
                                                     style={{wordBreak: 'break-all'}}>{svcKey}</Typography.Text>
                                </Descriptions.Item>
                            </Descriptions>
                        )}
                        <div style={{display: 'flex', gap: 8}}>
                            <Button
                                loading={svcKeyLoading}
                                onClick={handleGetSvcKey}
                            >
                                {t("devGetSvcKey") || "Получить текущий ключ"}
                            </Button>
                            <Button
                                type="primary"
                                danger
                                ghost
                                loading={svcKeyLoading}
                                onClick={() => setIsGenerateSvcKeyModalOpen(true)}
                            >
                                {t("devGenerateSvcKey") || "Сгенерировать новый ключ"}
                            </Button>
                        </div>
                    </div>
                    <Modal
                        open={isGenerateSvcKeyModalOpen}
                        onCancel={() => setIsGenerateSvcKeyModalOpen(false)}
                        footer={[
                            <Button key="cancel" onClick={() => setIsGenerateSvcKeyModalOpen(false)}>
                                {t("cancel") || "Отмена"}
                            </Button>,
                            <Button
                                key="generate"
                                type="primary"
                                danger
                                loading={svcKeyLoading}
                                onClick={handleGenerateSvcKey}
                            >
                                {t("devGenerateSvcKey") || "Сгенерировать"}
                            </Button>
                        ]}
                    >
                        <p>{t("devSvcKeyGenerateWarning") || "Генерация нового ключа требует перезапуска всех микросервисов. Новый ключ будет показан один раз — сохраните его в файл secrets/service_key.txt каждого микросервиса."}</p>
                    </Modal>

                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 16}}>
                        <h3 style={{margin: 0}}>{t("devWidgKey") || "Widget Ed25519 Keys"}</h3>
                        <Button
                            type="primary"
                            danger={Boolean(data.widg_keys)}
                            loading={svcKeyLoading}
                            onClick={() => data.widg_keys
                                ? setIsGenerateWidgetKeyModalOpen(true)
                                : handleGenerateWidgetKey()}
                        >
                            {data.widg_keys
                                ? (t("devGenerateSvcKey") || "Сгенерировать новый ключ")
                                : (t("devGenerateWidgKey") || "Generate Widget keys")}
                        </Button>
                    </div>
                    <Modal
                        open={isGenerateWidgetKeyModalOpen}
                        onCancel={() => setIsGenerateWidgetKeyModalOpen(false)}
                        footer={[
                            <Button key="cancel" onClick={() => setIsGenerateWidgetKeyModalOpen(false)}>
                                {t("cancel") || "Отмена"}
                            </Button>,
                            <Button key="generate" type="primary" danger loading={svcKeyLoading} onClick={handleGenerateWidgetKey}>
                                {t("devGenerateSvcKey") || "Сгенерировать новый ключ"}
                            </Button>
                        ]}
                    >
                        <p>{t("devWidgKeyRegenerateWarning") || "Генерация новых ключей потребует пересоздания кода всех виджетов!"}</p>
                    </Modal>

                </Card>
            </div>
            {/*</div>*/
            }
        </div>
    )
        ;
}
