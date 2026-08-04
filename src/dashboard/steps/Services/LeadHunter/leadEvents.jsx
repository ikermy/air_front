import {useEffect, useState, useRef} from "react";
import {useTranslation} from 'react-i18next';
import {getAuthToken, refreshToken} from "../../../../utils/easyUtils";
import {message, Spin, Button, Table, Badge, Tag, Alert, Empty} from "antd";
import {BellOutlined, ReloadOutlined, SyncOutlined} from "@ant-design/icons";
import {LeadBotEvents} from "./leadBotEvents";
import {showErrorNotification, showNotification} from "../../../hotification/showNotification";


const CAUSE_GROUP_COLORS = {
    auth_key: { labelKey: 'causeAuthKey', defaultLabel: 'Ключ авторизации', color: 'red' },
    session: { labelKey: 'causeSession', defaultLabel: 'Сессия', color: 'orange' },
    phone: { labelKey: 'causePhone', defaultLabel: 'Телефон', color: 'volcano' },
    password: { labelKey: 'causePassword', defaultLabel: 'Пароль', color: 'gold' },
    api: { labelKey: 'causeApi', defaultLabel: 'API', color: 'red' },
    user_block: { labelKey: 'causeUserBlock', defaultLabel: 'Блокировка пользователя', color: 'magenta' },
    chat_access: { labelKey: 'causeChatAccess', defaultLabel: 'Доступ к чату', color: 'purple' },
    content: { labelKey: 'causeContent', defaultLabel: 'Контент', color: 'orange' },
    media: { labelKey: 'causeMedia', defaultLabel: 'Медиа', color: 'orange' },
    rate_limit: { labelKey: 'causeRateLimit', defaultLabel: 'Превышен лимит', color: 'volcano' },
    other: { labelKey: 'causeOther', defaultLabel: 'Другое', color: 'default' }
};

const SEVERITY_COLORS = {
    fatal: { labelKey: 'severityFatal', defaultLabel: 'Критическая', color: 'red' },
    start_block: { labelKey: 'severityStartBlock', defaultLabel: 'Блокировка запуска', color: 'volcano' },
    send_block: { labelKey: 'severitySendBlock', defaultLabel: 'Блокировка отправки', color: 'orange' },
    recoverable: { labelKey: 'severityRecoverable', defaultLabel: 'Инфо', color: 'blue' }
};

export function LeadEvents() {
    const { t } = useTranslation();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [connected, setConnected] = useState(false);
    const [pageSize, setPageSize] = useState(20);
    const [currentPage, setCurrentPage] = useState(1);
    const [lastEventId, setLastEventId] = useState(0);
    const serviceRef = useRef(null);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                let token = getAuthToken();
                if (!token) {
                    token = await refreshToken();
                }

                if (token) {
                    // Получаем userId из токена или другого источника
                    // Предполагаем, что userId хранится в localStorage или можно извлечь из токена
                    const userIdFromStorage = localStorage.getItem("userId");
                    if (!userIdFromStorage) {
                        message.error(t('userIdError') || 'Не удалось определить ID пользователя');
                        setLoading(false);
                        return;
                    }

                    const parsedUserId = parseInt(userIdFromStorage);

                    // Получаем последний event_id из localStorage
                    const storedLastEventId = localStorage.getItem("lastEventId");
                    const initialLastEventId = storedLastEventId ? parseInt(storedLastEventId) : 0;
                    setLastEventId(initialLastEventId);

                    // Создаём сервис и настраиваем колбэки
                    const service = new LeadBotEvents();

                    service.setCallbacks({
                        onEvents: (newEvents, count) => {
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
                            showErrorNotification(`${t('error') || 'Ошибка'}: ${error}`);
                        },
                        onConnected: () => {
                            setConnected(true);
                            showNotification(t('eventsConnected') || 'Подключено к серверу событий');
                        },
                        onDisconnected: () => {
                            setConnected(false);
                            message.warning(t('eventsDisconnected') || 'Отключено от сервера событий');
                        },
                        onUpdateToken: () => {
                            message.error(t('serviceRequireAuth') || 'Требуется обновление токена');
                        }
                    });

                    serviceRef.current = service;

                    // Подключаемся к серверу
                    const success = await service.connect(parsedUserId, initialLastEventId);
                    if (!success) {
                        message.error(t('eventsConnectError') || 'Не удалось подключиться к серверу событий');
                    }
                }
            } catch (error) {
                console.error('Ошибка инициализации сервиса событий:', error);
                showErrorNotification(t('serviceInitError') || 'Ошибка инициализации сервиса событий');
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();

        // Cleanup при размонтировании компонента
        return () => {
            if (serviceRef.current) {
                serviceRef.current.disconnect();
            }
        };
    }, [t]);

    const handleRefresh = () => {
        if (serviceRef.current && serviceRef.current.isConnected()) {
            serviceRef.current.requestEvents();
            showNotification(t('eventsRequestUpdate') || 'Запрос обновления событий');
        } else {
            message.warning(t('noServerConnection') || 'Нет подключения к серверу');
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString(t('locale') || 'ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const getCauseGroupConfig = (causeGroup) => {
        const config = CAUSE_GROUP_COLORS[causeGroup];
        if (config) {
            return { label: t(config.labelKey) || config.defaultLabel, color: config.color };
        }
        return { label: causeGroup || '-', color: 'default' };
    };

    const getSeverityConfig = (severity) => {
        const config = SEVERITY_COLORS[severity];
        if (config) {
            return { label: t(config.labelKey) || config.defaultLabel, color: config.color };
        }
        return { label: severity || '-', color: 'default' };
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
            title: t('botColumn') || 'Бот',
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
            title: t('eventColumn') || 'Событие',
            dataIndex: 'severity',
            key: 'severity',
            width: 150,
            render: (severity) => {
                const config = getSeverityConfig(severity);
                return <Tag color={config.color}>{config.label}</Tag>;
            },
            filters: [
                { text: t('severityFatal') || 'Критическая', value: 'fatal' },
                { text: t('severityStartBlock') || 'Блокировка запуска', value: 'start_block' },
                { text: t('severitySendBlock') || 'Блокировка отправки', value: 'send_block' },
                { text: t('severityRecoverable') || 'Инфо', value: 'recoverable' },
            ],
            onFilter: (value, record) => record.severity === value,
        },
        {
            title: t('causeGroupColumn') || 'Группа причин',
            dataIndex: 'cause_group',
            key: 'cause_group',
            width: 150,
            render: (causeGroup) => {
                const config = getCauseGroupConfig(causeGroup);
                return <Tag color={config.color}>{config.label}</Tag>;
            },
            filters: [
                { text: t('causeAuthKey') || 'Ключ авторизации', value: 'auth_key' },
                { text: t('causeSession') || 'Сессия', value: 'session' },
                { text: t('causePhone') || 'Телефон', value: 'phone' },
                { text: t('causePassword') || 'Пароль', value: 'password' },
                { text: t('causeApi') || 'API', value: 'api' },
                { text: t('causeUserBlock') || 'Блокировка пользователя', value: 'user_block' },
                { text: t('causeChatAccess') || 'Доступ к чату', value: 'chat_access' },
                { text: t('causeContent') || 'Контент', value: 'content' },
                { text: t('causeMedia') || 'Медиа', value: 'media' },
                { text: t('causeRateLimit') || 'Превышен лимит', value: 'rate_limit' },
                { text: t('causeOther') || 'Другое', value: 'other' },
            ],
            onFilter: (value, record) => record.cause_group === value,
        },
        {
            title: t('causeCodeColumn') || 'Код причины',
            dataIndex: 'cause_code',
            key: 'cause_code',
            width: 150,
            ellipsis: true,
        },
        {
            title: t('descriptionColumn') || 'Описание',
            dataIndex: 'description',
            key: 'description',
            ellipsis: true,
        },
        {
            title: t('dateColumn') || 'Дата',
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
                <Spin size="large" description={t('loadingEvents') || "Загрузка событий..."} />
            </div>
        );
    }

    return (
        <div className="dashboard-block">
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <BellOutlined style={{ fontSize: '24px' }} />
                    <h2 style={{ margin: 0 }}>{t('botEventsTitle') || 'События ботов'}</h2>
                    {connected ? (
                        <Badge status="processing" text={t('eventsConnected') || "Подключено"} />
                    ) : (
                        <Badge status="default" text={t('eventsDisconnected') || "Отключено"} />
                    )}
                </div>
                <Button
                    type="primary"
                    icon={connected ? <ReloadOutlined /> : <SyncOutlined spin />}
                    onClick={handleRefresh}
                    disabled={!connected}
                >
                    {t('eventsRefresh') || 'Обновить'}
                </Button>
            </div>

            {!connected && (
                <Alert
                    message={t('noConnectionTitle') || "Нет подключения"}
                    description={t('noConnectionDesc') || "Соединение с сервером событий отсутствует. События не обновляются в реальном времени."}
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                />
            )}

            {events.length === 0 ? (
                <Empty
                    description={t('noEventsToDisplay') || "Нет событий для отображения"}
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
                        showTotal: (total) => (t('totalEventsCount', { total }) || `Всего событий: ${total}`),
                    }}
                    scroll={{ x: 1400 }}
                />
            )}

            <div style={{ marginTop: 16, color: '#666', fontSize: '12px' }}>
                <p>{t('lastEventIdLabel', { id: lastEventId }) || `Последний ID события: ${lastEventId}`}</p>
                <p>{t('autoUpdateNote') || 'События обновляются автоматически каждые 30 секунд'}</p>
            </div>
        </div>
    );
}
