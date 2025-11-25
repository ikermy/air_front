import {useEffect, useState, useRef} from "react";
import {validateAndRefreshToken} from "../../../utils/easyUtils";
import {message, Spin, Button, Table, Badge, Tag, Alert, Empty} from "antd";
import {BellOutlined, ReloadOutlined, SyncOutlined} from "@ant-design/icons";
import {ServiceBotEvents} from "./serviceBotEvents";
import {showErrorNotification, showNotification} from "../../hotification/showNotification";
import "../../steps.css";
import "../../../dashboard/steps/CreateModel.css";

const EVENT_TYPES = {
    state: { label: 'Состояние', color: 'blue' },
    error: { label: 'Ошибка', color: 'red' },
    warning: { label: 'Предупреждение', color: 'orange' },
    info: { label: 'Информация', color: 'geekblue' }
};

const CAUSE_GROUP_COLORS = {
    auth_key: { label: 'Ключ авторизации', color: 'red' },
    session: { label: 'Сессия', color: 'orange' },
    phone: { label: 'Телефон', color: 'volcano' },
    password: { label: 'Пароль', color: 'gold' },
    api: { label: 'API', color: 'red' },
    user_block: { label: 'Блокировка пользователя', color: 'magenta' },
    chat_access: { label: 'Доступ к чату', color: 'purple' },
    content: { label: 'Контент', color: 'orange' },
    media: { label: 'Медиа', color: 'orange' },
    rate_limit: { label: 'Превышен лимит', color: 'volcano' },
    other: { label: 'Другое', color: 'default' }
};

const SEVERITY_COLORS = {
    fatal: { label: 'Критическая', color: 'red' },
    start_block: { label: 'Блокировка запуска', color: 'volcano' },
    send_block: { label: 'Блокировка отправки', color: 'orange' },
    recoverable: { label: 'Инфо', color: 'blue' }
};

export function Events() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [connected, setConnected] = useState(false);
    const [pageSize, setPageSize] = useState(20);
    const [currentPage, setCurrentPage] = useState(1);
    const [lastEventId, setLastEventId] = useState(0);
    const serviceRef = useRef(null);

    useEffect(() => {
        const initializeService = async () => {
            setLoading(true);

            try {
                const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
                if (!token) {
                    message.error('Ошибка аутентификации');
                    setLoading(false);
                    return;
                }

                // Получаем userId из токена или другого источника
                // Предполагаем, что userId хранится в localStorage или можно извлечь из токена
                const userIdFromStorage = localStorage.getItem("userId");
                if (!userIdFromStorage) {
                    message.error('Не удалось определить ID пользователя');
                    setLoading(false);
                    return;
                }

                const parsedUserId = parseInt(userIdFromStorage);

                // Получаем последний event_id из localStorage
                const storedLastEventId = localStorage.getItem("lastEventId");
                const initialLastEventId = storedLastEventId ? parseInt(storedLastEventId) : 0;
                setLastEventId(initialLastEventId);

                // Создаём сервис и настраиваем колбэки
                const service = new ServiceBotEvents();

                service.setCallbacks({
                    onEvents: (newEvents, count) => {
                        console.log(`Получено событий: ${count}`);

                        setEvents(prevEvents => {
                            // Объединяем старые и новые события, убираем дубликаты
                            const combinedEvents = [...prevEvents, ...newEvents];
                            const uniqueEvents = combinedEvents.filter((event, index, self) =>
                                index === self.findIndex(e => e.event_id === event.event_id)
                            );

                            // Сортируем по event_id в порядке убывания (новые сверху)
                            return uniqueEvents.sort((a, b) => b.event_id - a.event_id);
                        });

                        // Обновляем lastEventId
                        if (newEvents.length > 0) {
                            const maxEventId = Math.max(...newEvents.map(e => e.event_id));
                            setLastEventId(maxEventId);
                            localStorage.setItem("lastEventId", maxEventId.toString());
                        }
                    },
                    onNoNewEvents: () => {
                        console.log('Нет новых событий');
                    },
                    onError: (error) => {
                        showErrorNotification(`Ошибка: ${error}`);
                    },
                    onConnected: () => {
                        setConnected(true);
                        showNotification('Подключено к серверу событий');
                    },
                    onDisconnected: () => {
                        setConnected(false);
                        message.warning('Отключено от сервера событий');
                    },
                    onUpdateToken: () => {
                        message.error('Требуется обновление токена');
                    }
                });

                serviceRef.current = service;

                // Подключаемся к серверу
                const success = await service.connect(parsedUserId, initialLastEventId);
                if (!success) {
                    message.error('Не удалось подключиться к серверу событий');
                }
            } catch (error) {
                console.error('Ошибка инициализации сервиса событий:', error);
                showErrorNotification('Ошибка инициализации сервиса событий');
            } finally {
                setLoading(false);
            }
        };

        initializeService();

        // Cleanup при размонтировании компонента
        return () => {
            if (serviceRef.current) {
                serviceRef.current.disconnect();
            }
        };
    }, []);

    const handleRefresh = () => {
        if (serviceRef.current && serviceRef.current.isConnected()) {
            serviceRef.current.requestEvents();
            showNotification('Запрос обновления событий');
        } else {
            message.warning('Нет подключения к серверу');
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const getEventTypeConfig = (eventType) => {
        return EVENT_TYPES[eventType] || { label: eventType || 'unknown', color: 'default' };
    };

    const getCauseGroupConfig = (causeGroup) => {
        return CAUSE_GROUP_COLORS[causeGroup] || { label: causeGroup || '-', color: 'default' };
    };

    const getSeverityConfig = (severity) => {
        return SEVERITY_COLORS[severity] || { label: severity || '-', color: 'default' };
    };

    const columns = [
        // {
        //     title: 'ID',
        //     dataIndex: 'event_id',
        //     key: 'event_id',
        //     width: 80,
        //     sorter: (a, b) => a.event_id - b.event_id,
        // },
        {
            title: 'Бот',
            dataIndex: 'bot_alias',
            key: 'bot_alias',
            width: 150,
            render: (alias) => <Tag color="blue">{alias || 'N/A'}</Tag>
        },
        // {
        //     title: 'Тип события',
        //     dataIndex: 'event_type',
        //     key: 'event_type',
        //     width: 150,
        //     render: (type) => {
        //         const config = getEventTypeConfig(type);
        //         return <Badge color={config.color} text={config.label} />;
        //     },
        //     filters: [
        //         { text: 'Состояние', value: 'state' },
        //         { text: 'Ошибка', value: 'error' },
        //         { text: 'Предупреждение', value: 'warning' },
        //         { text: 'Информация', value: 'info' },
        //     ],
        //     onFilter: (value, record) => record.event_type === value,
        // },
        {
            title: 'Событие',
            dataIndex: 'severity',
            key: 'severity',
            width: 150,
            render: (severity) => {
                const config = getSeverityConfig(severity);
                return <Tag color={config.color}>{config.label}</Tag>;
            },
            filters: [
                { text: 'Критическая', value: 'fatal' },
                { text: 'Блокировка запуска', value: 'start_block' },
                { text: 'Блокировка отправки', value: 'send_block' },
                { text: 'Инфо', value: 'recoverable' },
            ],
            onFilter: (value, record) => record.severity === value,
        },
        {
            title: 'Группа причин',
            dataIndex: 'cause_group',
            key: 'cause_group',
            width: 150,
            render: (causeGroup) => {
                const config = getCauseGroupConfig(causeGroup);
                return <Tag color={config.color}>{config.label}</Tag>;
            },
            filters: [
                { text: 'Ключ авторизации', value: 'auth_key' },
                { text: 'Сессия', value: 'session' },
                { text: 'Телефон', value: 'phone' },
                { text: 'Пароль', value: 'password' },
                { text: 'API', value: 'api' },
                { text: 'Блокировка пользователя', value: 'user_block' },
                { text: 'Доступ к чату', value: 'chat_access' },
                { text: 'Контент', value: 'content' },
                { text: 'Медиа', value: 'media' },
                { text: 'Превышен лимит', value: 'rate_limit' },
                { text: 'Другое', value: 'other' },
            ],
            onFilter: (value, record) => record.cause_group === value,
        },
        {
            title: 'Код причины',
            dataIndex: 'cause_code',
            key: 'cause_code',
            width: 150,
            ellipsis: true,
        },
        {
            title: 'Описание',
            dataIndex: 'description',
            key: 'description',
            ellipsis: true,
        },
        {
            title: 'Дата',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 160,
            render: (date) => formatDate(date),
            sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at),
        },
    ];

    if (loading) {
        return (
            <div className="dashboard-block" style={{ textAlign: 'center', padding: '50px' }}>
                <Spin size="large" tip="Загрузка событий..." />
            </div>
        );
    }

    return (
        <div className="dashboard-block">
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <BellOutlined style={{ fontSize: '24px' }} />
                    <h2 style={{ margin: 0 }}>События ботов</h2>
                    {connected ? (
                        <Badge status="processing" text="Подключено" />
                    ) : (
                        <Badge status="default" text="Отключено" />
                    )}
                </div>
                <Button
                    type="primary"
                    icon={connected ? <ReloadOutlined /> : <SyncOutlined spin />}
                    onClick={handleRefresh}
                    disabled={!connected}
                >
                    Обновить
                </Button>
            </div>

            {!connected && (
                <Alert
                    message="Нет подключения"
                    description="Соединение с сервером событий отсутствует. События не обновляются в реальном времени."
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                />
            )}

            {events.length === 0 ? (
                <Empty
                    description="Нет событий для отображения"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
            ) : (
                <Table
                    columns={columns}
                    dataSource={events}
                    rowKey="event_id"
                    pagination={{
                        current: currentPage,
                        pageSize: pageSize,
                        total: events.length,
                        showSizeChanger: true,
                        pageSizeOptions: ['10', '20', '50', '100'],
                        onChange: (page, size) => {
                            setCurrentPage(page);
                            setPageSize(size);
                        },
                        showTotal: (total) => `Всего событий: ${total}`,
                    }}
                    scroll={{ x: 1400 }}
                />
            )}

            <div style={{ marginTop: 16, color: '#666', fontSize: '12px' }}>
                <p>Последний ID события: {lastEventId}</p>
                <p>События обновляются автоматически каждые 30 секунд</p>
            </div>
        </div>
    );
}
