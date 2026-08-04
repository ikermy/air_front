import React, { useState, useEffect } from "react";
import {
    Alert,
    Button,
    Card,
    List,
    Space,
    Tag,
    Typography,
    Spin,
    Tooltip,
    Popconfirm
} from "antd";
import {
    ReloadOutlined,
    CheckCircleOutlined,
    LinkOutlined,
    PlusOutlined,
    DeleteOutlined,
    InfoCircleOutlined
} from "@ant-design/icons";
import { getAvitoSubscriptions, subscribeToAvitoWebhooks, unsubscribeFromAvitoWebhook } from "../avitoUtils";
import { showErrorNotification, showNotification } from "../../../hotification/showNotification";
import type { Subscription } from "../avitoTypes";

const { Text, Paragraph } = Typography;

export const AvitoWebhooksManager: React.FC = () => {
    const [loading, setLoading] = useState<boolean>(false);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [subscribing, setSubscribing] = useState<boolean>(false);
    const [unsubscribing, setUnsubscribing] = useState<string | null>(null);

    /**
     * Загрузка списка подписок
     */
    const loadSubscriptions = async (): Promise<void> => {
        setLoading(true);
        try {
            const result = await getAvitoSubscriptions();

            if (result.success && result.data) {
                setSubscriptions(result.data.subscriptions);
            } else {
                if (result.status === 401) {
                    showErrorNotification("Ошибка", "Avito не подключен");
                } else {
                    showErrorNotification("Ошибка", result.error || "Не удалось загрузить подписки");
                }
                setSubscriptions([]);
            }
        } catch (err) {
            console.error("Ошибка при загрузке подписок:", err);
            showErrorNotification("Ошибка", String(err));
        } finally {
            setLoading(false);
        }
    };

    /**
     * Подписка на webhooks
     */
    const handleSubscribe = async (): Promise<void> => {
        setSubscribing(true);
        try {
            const result = await subscribeToAvitoWebhooks();

            if (result.success && result.data) {
                showNotification("Успех", `Подписка успешна: ${result.data.url}`);
                await loadSubscriptions();
            } else {
                showErrorNotification("Ошибка", result.error || "Не удалось подписаться на webhooks");
            }
        } catch (err) {
            console.error("Ошибка при подписке:", err);
            showErrorNotification("Ошибка", String(err));
        } finally {
            setSubscribing(false);
        }
    };

    /**
     * Отписка от webhook
     */
    const handleUnsubscribe = async (url: string): Promise<void> => {
        setUnsubscribing(url);
        try {
            const result = await unsubscribeFromAvitoWebhook(url);

            if (result.success && result.data) {
                showNotification("Успех", `Отписка успешна: ${result.data.url}`);
                await loadSubscriptions();
            } else {
                if (result.status === 400) {
                    showErrorNotification("Ошибка", "URL webhook обязателен");
                } else {
                    showErrorNotification("Ошибка", result.error || "Не удалось отписаться от webhook");
                }
            }
        } catch (err) {
            console.error("Ошибка при отписке:", err);
            showErrorNotification("Ошибка", String(err));
        } finally {
            setUnsubscribing(null);
        }
    };

    /**
     * Загрузка подписок при монтировании
     */
    useEffect(() => {
        loadSubscriptions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="padding" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <Card
                title={
                    <Space>
                        <LinkOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
                        <span>Управление Webhook подписками Avito</span>
                    </Space>
                }
                extra={
                    <Space>
                        <Tag color={subscriptions.length > 0 ? 'success' : 'default'}
                             style={{ background: 'transparent' }}
                        >
                            {subscriptions.length} {subscriptions.length === 1 ? 'подписка' : 'подписок'}
                        </Tag>
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={loadSubscriptions}
                            loading={loading}
                        >
                            Обновить
                        </Button>
                    </Space>
                }
            >
                {/* Информация */}
                <Alert
                    message="ℹ️ Автоматическая подписка"
                    description={
                        <div>
                            <Paragraph>
                                <strong>Важно:</strong> Webhook подписки настраиваются автоматически при:
                            </Paragraph>
                            <ul style={{ marginBottom: 0 }}>
                                <li>Успешной OAuth авторизации</li>
                                <li>Включении Avito бота</li>
                            </ul>
                            <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                                Используйте ручное управление только для диагностики или переподписки.
                            </Paragraph>
                        </div>
                    }
                    type="info"
                    icon={<InfoCircleOutlined />}
                    style={{ marginBottom: 24 }}
                    closable
                />

                {/* Кнопка добавления подписки */}
                <div style={{ marginBottom: 16 }}>
                    <Button
                        style={{color : 'black'}}
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleSubscribe}
                        loading={subscribing}
                        size="large"
                    >
                        Подписаться на webhooks
                    </Button>
                </div>

                {/* Список подписок */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <Spin description="Загрузка подписок..." />
                    </div>
                ) : subscriptions.length === 0 ? (
                    <Alert
                        message="Нет активных подписок"
                        description="Подпишитесь на webhooks чтобы получать сообщения от Avito в реальном времени."
                        type="warning"
                        showIcon
                    />
                ) : (
                    <Card
                        title={
                            <Space>
                                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                                <span>Активные подписки</span>
                            </Space>
                        }
                        size="small"
                    >
                        <List
                            dataSource={subscriptions}
                            renderItem={(subscription) => (
                                <List.Item
                                    actions={[
                                        <Tooltip title="Отписаться от webhook" key="unsubscribe">
                                            <Popconfirm
                                                title="Отписаться от webhook?"
                                                description={`Вы уверены, что хотите отписаться от ${subscription.url}?`}
                                                onConfirm={() => handleUnsubscribe(subscription.url)}
                                                okText="Да"
                                                cancelText="Нет"
                                            >
                                                <Button
                                                    danger
                                                    size="small"
                                                    icon={<DeleteOutlined />}
                                                    loading={unsubscribing === subscription.url}
                                                >
                                                    Отписаться
                                                </Button>
                                            </Popconfirm>
                                        </Tooltip>
                                    ]}
                                >
                                    <List.Item.Meta
                                        avatar={<LinkOutlined style={{ fontSize: '20px', color: '#1890ff' }} />}
                                        title={
                                            <Space>
                                                <Text strong copyable>{subscription.url}</Text>
                                                <Tag color="success" style={{ background: 'transparent' }}>Активна</Tag>
                                            </Space>
                                        }
                                        description="Webhook получает уведомления о новых сообщениях в режиме реального времени"
                                    />
                                </List.Item>
                            )}
                        />
                    </Card>
                )}

            </Card>
        </div>
    );
};

