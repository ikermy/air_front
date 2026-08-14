import React, { useState, useEffect } from "react";
import { Alert, Button, Modal, Space, Spin, Form, Input } from "antd";
import { ApiOutlined, MessageOutlined, LoginOutlined, DisconnectOutlined } from "@ant-design/icons";
import { getAvitoStatus, disconnectAvito } from "../avitoUtils";
import { AvitoAuthService } from "../avitoAuthService";
import { AvitoChatsTest } from "./AvitoChatsTest";
import { showErrorNotification, showNotification } from "../../../hotification/showNotification";
import { useTranslation } from "react-i18next";
import AvitoIcon from "../AvitoIcon";

interface AvitoSectionProps {
    channel: any;
    selectedChannels: any[];
    setSelectedChannels: (channels: any[]) => void;
}

interface ConnectionStatus {
    connected: boolean;
    status?: string;
    error?: string;
}

export const AvitoSection: React.FC<AvitoSectionProps> = ({
    channel,
    selectedChannels,
    setSelectedChannels,
}) => {
    const { t } = useTranslation();
    const [authService] = useState<AvitoAuthService>(() => new AvitoAuthService());
    const [isConnecting, setIsConnecting] = useState<boolean>(false);
    const [isDisconnecting, setIsDisconnecting] = useState<boolean>(false);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
    const [isStatusLoading, setIsStatusLoading] = useState<boolean>(false);
    const [showChatsTest, setShowChatsTest] = useState<boolean>(false);

    // OAuth параметры
    const [clientId, setClientId] = useState<string>("");
    const [clientSecret, setClientSecret] = useState<string>("");
    const [redirectDomain, setRedirectDomain] = useState<string>("");

    // Определяем режим авторизации (true = использовать фиксированный redirect URL)
    const showSimpleAuth = true;

    // Фиксированный redirect URL для упрощенного режима
    const fixedRedirectUrl = "https://kermy.org/open/avito/auth/callback";

    // Формируем redirect_url в зависимости от режима
    const redirectUrl = showSimpleAuth
        ? fixedRedirectUrl
        : redirectDomain ? `https://${redirectDomain}/open/avito/auth/callback` : "";

    // Проверка заполненности всех полей
    const isFormValid = clientId.trim() !== "" &&
                        clientSecret.trim() !== "" &&
                        (showSimpleAuth || redirectDomain.trim() !== "");

    /**
     * Проверка статуса подключения Avito
     */
    const checkStatus = async (): Promise<void> => {
        setIsStatusLoading(true);
        try {
            const result = await getAvitoStatus();
            setConnectionStatus(result);

            // Обновляем данные канала
            if (result.connected) {
                // Устанавливаем data для активации Switch и автоматически включаем канал
                const connectionData = `connected_at_${Date.now()}`;
                updateChannelData({
                    isConnected: true,
                    status: result.status,
                    data: connectionData,
                    isEnabled: true  // ✅ Автоматически включаем канал
                });
            } else {
                updateChannelData({
                    isConnected: false,
                    status: result.error,
                    data: '',
                    isEnabled: false  // ✅ Выключаем при отключении
                });
            }
        } catch (error) {
            console.error("Ошибка проверки статуса Avito:", error);
            showErrorNotification(t("error") || "Ошибка", "Не удалось проверить статус подключения");
        } finally {
            setIsStatusLoading(false);
        }
    };

    /**
     * Обновление данных канала
     */
    const updateChannelData = (updates: Partial<any>): void => {
        setSelectedChannels(
            selectedChannels.map((ch) =>
                ch.key === channel.key
                    ? { ...ch, ...updates }
                    : ch
            )
        );
    };

    /**
     * Запуск процесса авторизации
     */
    const handleConnect = async (): Promise<void> => {
        if (!isFormValid) {
            showErrorNotification(t("error") || "Ошибка", "Заполните все обязательные поля");
            return;
        }

        setIsConnecting(true);
        try {
            authService.setCallbacks({
                onSuccess: async () => {
                    showNotification("Успех", "Avito успешно подключен!");
                    // Даем серверу время сохранить данные
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    await checkStatus();
                    setIsConnecting(false);
                },
                onError: (error: string) => {
                    showErrorNotification(t("error") || "Ошибка", `Ошибка подключения: ${error}`);
                    setIsConnecting(false);
                },
            });

            // Передаем OAuth параметры в сервис (используем готовый redirectUrl)
            await authService.startAuthentication(redirectUrl, clientId, clientSecret);
        } catch (error) {
            console.error("Ошибка запуска авторизации:", error);
            showErrorNotification(t("error") || "Ошибка", String(error));
            setIsConnecting(false);
        }
    };

    /**
     * Отключение Avito
     */
    const handleDisconnect = async (): Promise<void> => {
        setIsDisconnecting(true);
        try {
            const result = await disconnectAvito();
            if (result.success) {
                showNotification("Успех", "Avito успешно отключен");
                setConnectionStatus({ connected: false });
                updateChannelData({
                    isConnected: false,
                    status: null,
                    data: '',
                    isEnabled: false  // ✅ Выключаем канал
                });
            } else {
                showErrorNotification(t("error") || "Ошибка", `Ошибка отключения: ${result.error}`);
            }
        } catch (error) {
            console.error("Ошибка отключения Avito:", error);
            showErrorNotification(t("error") || "Ошибка", String(error));
        } finally {
            setIsDisconnecting(false);
        }
    };

    /**
     * Открытие модального окна с тестом чатов
     */
    const handleOpenChatsTest = (): void => {
        setShowChatsTest(true);
    };

    /**
     * Обработка URL параметров после OAuth callback
     */
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);

        if (urlParams.get('avito_oauth') === 'success') {
            showNotification(
                t("success") || "Успех",
                t("avitoOAuthSuccess") || "Avito успешно подключен!"
            );

            // Обновляем статус после успешной авторизации
            checkStatus().catch(error => {
                console.error('Error checking Avito status after OAuth success:', error);
            });

            // Очищаем URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        if (urlParams.get('avito_oauth') === 'error') {
            const reason = urlParams.get('reason') || t("avitoOAuthErrorUnknown") || "Неизвестная ошибка";
            showErrorNotification(
                t("error") || "Ошибка",
                `${t("avitoOAuthError") || "Ошибка подключения Avito:"} ${reason}`
            );

            // Очищаем URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [t]);

    /**
     * Проверка статуса при монтировании
     */
    useEffect(() => {
        checkStatus();

        return () => {
            authService.destroy();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Определяем, подключен ли Avito
    const isConnected = connectionStatus?.connected || false;
    return (
        <div className="padding">
            {isStatusLoading ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                    <Spin description="Проверка статуса подключения..." />
                </div>
            ) : (
                <>
                    {/* Статус подключения */}
                    <Alert
                        className="channel-alert"
                        message={isConnected ? "Avito подключен" : "Avito не подключен"}
                        description={
                            isConnected
                                ? `Канал Avito успешно подключен и готов к использованию. ${connectionStatus?.status || ''}`
                                : "Для использования канала Avito необходимо пройти авторизацию через OAuth."
                        }
                        type={isConnected ? "success" : "warning"}
                        showIcon
                        icon={isConnected ? <AvitoIcon size={20} color="#52c41a" /> : <LoginOutlined />}
                        style={{ marginBottom: 16 }}
                    />

                    {/* Форма OAuth параметров (только если не подключено) */}
                    {!isConnected && (
                        <Form
                            layout="vertical"
                            style={{ marginBottom: 16, maxWidth: 600 }}
                        >
                            {showSimpleAuth ? (
                                <Form.Item
                                    label="Redirect URL"
                                    tooltip="Фиксированный URL для callback"
                                >
                                    <Alert
                                        message={redirectUrl}
                                        type="info"
                                        showIcon
                                        description="Этот URL используется для обработки OAuth callback"
                                    />
                                </Form.Item>
                            ) : (
                                <Form.Item
                                    label="Redirect Domain"
                                    required
                                    tooltip="Ваш домен для формирования URL callback (например: your-domain.ngrok-free.app)"
                                >
                                    <Input
                                        addonBefore="https://"
                                        addonAfter="/open/avito/auth/callback"
                                        placeholder="your-domain"
                                        value={redirectDomain}
                                        onChange={(e) => setRedirectDomain(e.target.value)}
                                        size="large"
                                    />
                                </Form.Item>
                            )}

                            <Form.Item
                                label="Client ID"
                                required
                                tooltip="Идентификатор клиента OAuth от Avito"
                            >
                                <Input
                                    placeholder="Введите Client ID"
                                    value={clientId}
                                    onChange={(e) => setClientId(e.target.value)}
                                    size="large"
                                />
                            </Form.Item>

                            <Form.Item
                                label="Client Secret"
                                required
                                tooltip="Секретный ключ OAuth от Avito"
                            >
                                <Input.Password
                                    placeholder="Введите Client Secret"
                                    value={clientSecret}
                                    onChange={(e) => setClientSecret(e.target.value)}
                                    size="large"
                                    style={{ display: 'flex', alignItems: 'center' }}
                                />
                            </Form.Item>
                        </Form>
                    )}

                    {/* Кнопки управления */}
                    <Space orientation="horizontal" style={{ width: '100%', flexWrap: 'wrap' }}>
                        {!isConnected ? (
                            <Button
                                type="primary"
                                icon={<LoginOutlined />}
                                loading={isConnecting}
                                onClick={handleConnect}
                                disabled={!isFormValid}
                                size="large"
                            >
                                Подключить Avito
                            </Button>
                        ) : (
                            <>
                                <Button
                                    icon={<MessageOutlined />}
                                    onClick={handleOpenChatsTest}
                                    size="large"
                                    type="primary"
                                    disabled={!isConnected}
                                >
                                    Управление чатами
                                </Button>

                                <Button
                                    icon={<ApiOutlined />}
                                    onClick={checkStatus}
                                    loading={isStatusLoading}
                                >
                                    Обновить статус
                                </Button>

                                <Button
                                    danger
                                    icon={<DisconnectOutlined />}
                                    loading={isDisconnecting}
                                    onClick={handleDisconnect}
                                >
                                    Отключить Avito
                                </Button>
                            </>
                        )}
                    </Space>

                    {/* Информация */}
                    {!isConnected && (
                        <Alert
                            message="Как подключить Avito?"
                            description={
                                <div>
                                    <ol>
                                        <li>Нажмите кнопку "Подключить Avito"</li>
                                        <li>Войдите в свой аккаунт Avito в открывшемся окне</li>
                                        <li>Разрешите доступ к вашим чатам</li>
                                        <li>После успешной авторизации окно закроется автоматически</li>
                                    </ol>
                                </div>
                            }
                            type="info"
                            style={{ marginTop: 16 }}
                        />
                    )}
                </>
            )}

            {/* Модальное окно тестирования чатов */}
            <Modal
                title="Тестирование API чатов Avito"
                open={showChatsTest}
                onCancel={() => setShowChatsTest(false)}
                footer={null}
                width={800}
            >
                <AvitoChatsTest />
            </Modal>
        </div>
    );
};
