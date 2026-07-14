import React, { useState } from "react";
import {
    Alert,
    Button,
    Card,
    Form,
    Input,
    Switch,
    Table,
    Tag,
    Typography,
    Space,
    Badge,
    Tooltip,
    Tabs
} from "antd";
import type { ColumnsType } from 'antd/es/table';
import {
    ReloadOutlined,
    CheckCircleOutlined,
    MessageOutlined,
    UserOutlined,
    ClockCircleOutlined
} from "@ant-design/icons";
import { fetchAvitoChats } from "../avitoUtils";
import type { Chat, ChatsResponse } from "../avitoTypes";
import AvitoIcon from "../AvitoIcon";
import { AvitoWebhooksManager } from "./AvitoWebhooksManager";

const { Text, Paragraph } = Typography;

interface AvitoChatsTestProps {
    channel?: any;
}

interface FormValues {
    limit?: number;
    offset?: number;
    unread_only?: boolean;
}

export const AvitoChatsTest: React.FC<AvitoChatsTestProps> = () => {
    const [form] = Form.useForm<FormValues>();

    // Состояния
    const [loading, setLoading] = useState<boolean>(false);
    const [chatsData, setChatsData] = useState<ChatsResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [responseStatus, setResponseStatus] = useState<number | null>(null);

    /**
     * Обработчик загрузки чатов
     */
    const handleFetchChats = async (values: FormValues): Promise<void> => {
        setLoading(true);
        setError(null);
        setChatsData(null);
        setResponseStatus(null);

        try {
            // Формируем параметры запроса
            const params = {
                limit: values.limit || undefined,
                offset: values.offset || undefined,
                unread_only: values.unread_only || false,
            };

            // Выполняем запрос
            const result = await fetchAvitoChats(params);

            setResponseStatus(result.status || null);

            if (result.success && result.data) {
                setChatsData(result.data);
            } else {
                setError(result.error || "Неизвестная ошибка");
            }
        } catch (err) {
            console.error("Ошибка при загрузке чатов:", err);
            setError(String(err));
        } finally {
            setLoading(false);
        }
    };

    /**
     * Сброс формы и данных
     */
    const handleReset = (): void => {
        form.resetFields();
        setChatsData(null);
        setError(null);
        setResponseStatus(null);
    };

    /**
     * Форматирование timestamp в читаемый формат
     */
    const formatTimestamp = (timestamp?: number): string => {
        if (!timestamp) return '-';
        const date = new Date(timestamp * 1000);
        return date.toLocaleString('ru-RU');
    };


    /**
     * Колонки для таблицы чатов
     */
    const columns: ColumnsType<Chat> = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 20,
            ellipsis: true,
            render: (text: string) => (
                <Tooltip title={text}>
                    <Text code copyable>
                        {text.substring(0, 15)}...
                    </Text>
                </Tooltip>
            )
        },
        {
            title: 'Пользователи',
            dataIndex: 'users',
            key: 'users',
            width: 90,
            render: (users) => (
                <Space direction="vertical" size="small">
                    {users && users.map((user: any, idx: number) => (
                        <Tag key={idx} icon={<UserOutlined />} color="blue">
                            {user.name} (ID: {user.id})
                        </Tag>
                    ))}
                </Space>
            )
        },
        {
            title: 'Последнее сообщение',
            dataIndex: 'last_message',
            key: 'last_message',
            width: 70,
            render: (msg) => {
                if (!msg) return <Text type="secondary">Нет сообщений</Text>;
                return (
                    <div>
                        <Paragraph ellipsis={{ rows: 2, expandable: true }}>
                            <MessageOutlined /> {msg.text}
                        </Paragraph>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                            {msg.direction === 'in' ? '← Входящее' : '→ Исходящее'}
                            {' | '}
                            {formatTimestamp(msg.created)}
                        </Text>
                    </div>
                );
            }
        },
        {
            title: 'Создан',
            dataIndex: 'created',
            key: 'created',
            width: 60,
            render: (timestamp: number) => (
                <Tooltip title={`Timestamp: ${timestamp}`}>
                    <Space>
                        <ClockCircleOutlined />
                        <Text>{formatTimestamp(timestamp)}</Text>
                    </Space>
                </Tooltip>
            )
        },
        {
            title: 'Обновлен',
            dataIndex: 'updated',
            key: 'updated',
            width: 60,
            render: (timestamp: number) => (
                <Tooltip title={`Timestamp: ${timestamp}`}>
                    <Space>
                        <ClockCircleOutlined />
                        <Text>{formatTimestamp(timestamp)}</Text>
                    </Space>
                </Tooltip>
            )
        },
        {
            title: 'Тип',
            dataIndex: ['context', 'type'],
            key: 'context_type',
            width: 20,
            render: (type: string) => (
                <Tag color={type === 'item' ? 'green' : 'orange'}>
                    {type}
                </Tag>
            )
        }
    ];

    /**
     * Рендер статуса ответа
     */
    const renderStatusAlert = () => {
        if (!responseStatus && !error) return null;

        let alertType: 'success' | 'info' | 'warning' | 'error' = 'info';
        let message = '';
        let description = '';

        if (responseStatus === 200) {
            alertType = 'success';
            message = '200 OK - Успешно';
            description = `Получено чатов: ${chatsData?.chats?.length || 0}`;
        } else if (responseStatus === 400) {
            alertType = 'warning';
            message = '400 Bad Request - Неверные параметры';
            description = error || 'Проверьте параметры запроса (limit: 1-100)';
        } else if (responseStatus === 401) {
            alertType = 'error';
            message = '401 Unauthorized - Avito не подключен';
            description = error || 'Необходимо подключить Avito канал';
        } else if (responseStatus === 500) {
            alertType = 'error';
            message = '500 Internal Server Error';
            description = error || 'Ошибка сервера при получении чатов';
        } else if (error) {
            alertType = 'error';
            message = 'Ошибка';
            description = error;
        }

        return (
            <Alert
                type={alertType}
                message={message}
                description={description}
                showIcon
                style={{ marginBottom: 16 }}
            />
        );
    };

    return (
        <div className="padding" style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <Tabs defaultActiveKey="chats" type="card">
                <Tabs.TabPane
                    tab={
                        <span>
                            <MessageOutlined />
                            <span style={{ marginLeft: 8 }}>Чаты</span>
                        </span>
                    }
                    key="chats"
                >
                    <Card
                        title={
                            <Space>
                                <AvitoIcon size={20} color="#1890ff" />
                                <span>Тестирование API получения чатов Avito</span>
                            </Space>
                        }
                        extra={
                    <Badge
                        status={chatsData ? 'success' : 'default'}
                        text={chatsData ? `Загружено: ${chatsData.chats.length}` : 'Не загружено'}
                    />
                }
            >
                {/* Форма параметров */}
                <Card
                    title="Параметры запроса"
                    size="small"
                    style={{ marginBottom: 24 }}
                >
                    <Form
                        form={form}
                        layout="inline"
                        onFinish={handleFetchChats}
                        initialValues={{
                            limit: 10,
                            offset: 0,
                            unread_only: false,
                        }}
                    >
                        <Form.Item
                            label="Limit"
                            name="limit"
                            tooltip="Количество чатов (1-100)"
                            rules={[
                                {
                                    type: 'number',
                                    min: 1,
                                    max: 100,
                                    message: 'Limit должен быть от 1 до 100',
                                    transform: (value) => Number(value)
                                }
                            ]}
                        >
                            <Input
                                type="number"
                                placeholder="10"
                                style={{ width: 62 }}
                            />
                        </Form.Item>

                        <Form.Item
                            label="Только непрочитанные"
                            name="unread_only"
                            valuePropName="checked"
                            tooltip="Фильтровать только непрочитанные чаты"
                        >
                            <Switch />
                        </Form.Item>

                        <Form.Item>
                            <Space>
                                <Button
                                    style={{color : 'black'}}
                                    type="primary"
                                    htmlType="submit"
                                    loading={loading}
                                    icon={<ReloadOutlined />}
                                >
                                    Загрузить чаты
                                </Button>
                                <Button onClick={handleReset}>
                                    Сбросить
                                </Button>
                            </Space>
                        </Form.Item>
                    </Form>
                </Card>

                {/* Статус ответа */}
                {renderStatusAlert()}

                {/* Таблица с чатами */}
                {chatsData && chatsData.chats && (
                    <Card
                        title={
                            <Space>
                                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                                <span>Результаты ({chatsData.chats.length} чатов)</span>
                            </Space>
                        }
                    >
                        {chatsData.chats.length === 0 ? (
                            <Alert
                                message="Чатов не найдено"
                                description="Авторизация работает, но чатов пока нет или они не соответствуют фильтрам."
                                type="info"
                                showIcon
                            />
                        ) : (
                            <Table
                                dataSource={chatsData.chats}
                                columns={columns}
                                rowKey="id"
                                pagination={{
                                    pageSize: 10,
                                    showSizeChanger: true,
                                    showTotal: (total) => `Всего: ${total} чатов`,
                                }}
                                scroll={{ x: 1200 }}
                                size="small"
                            />
                        )}
                    </Card>
                )}
            </Card>
                </Tabs.TabPane>

                <Tabs.TabPane
                    tab={
                        <span>
                            <CheckCircleOutlined />
                            <span style={{ marginLeft: 8 }}>Webhook подписки</span>
                        </span>
                    }
                    key="webhooks"
                >
                    <AvitoWebhooksManager />
                </Tabs.TabPane>
            </Tabs>
        </div>
    );
};

