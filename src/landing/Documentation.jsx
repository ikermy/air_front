import React, { useState } from 'react';
import { Typography, Collapse, Card, Row, Col, Tag, Button } from 'antd';
import {
    AndroidOutlined,
    MessageOutlined,
    BarChartOutlined,
    FileTextOutlined,
    BellOutlined,
    CreditCardOutlined,
    BugOutlined
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

const Documentation = () => {
    const [activeSection, setActiveSection] = useState(null);

    const documentationSections = [
        {
            key: 'models',
            title: 'Создание и управление агентами',
            icon: <AndroidOutlined />,
            description: 'Настройка AI-моделей для различных задач',
            items: [
                {
                    title: 'Выбор модели GPT',
                    content: 'Поддерживаются различные модели: GPT-3.5, GPT-4, GPT-4 Turbo. Каждая модель имеет свои особенности по скорости, качеству и стоимости.'
                },
                {
                    title: 'Загрузка файлов',
                    content: 'Возможность загрузки документов, изображений и других файлов для обучения модели. Поддерживаются форматы: PDF, DOC, TXT, JPG, PNG.'
                },
                {
                    title: 'Настройка промптов',
                    content: 'Создание системных инструкций для определения поведения агента. Промпты определяют роль, стиль общения и специализацию.'
                },
                {
                    title: 'Цели и триггеры',
                    content: 'Установка целей диалога и триггеров для автоматических действий. Система может определять достижение целей и выполнять заданные действия.'
                },
                {
                    title: 'Интерпретатор кода',
                    content: 'Включение возможности выполнения Python кода для анализа данных, вычислений и генерации графиков.'
                }
            ]
        },
        {
            key: 'channels',
            title: 'Каналы связи и интеграции',
            icon: <MessageOutlined />,
            description: 'Подключение мессенджеров и платформ',
            items: [
                {
                    title: 'Telegram Bot',
                    content: 'Создание и настройка Telegram ботов. Получение токена через @BotFather, настройка webhook для получения сообщений.'
                },
                {
                    title: 'Telegram User Bot',
                    content: 'Подключение как обычный пользователь Telegram. Требует авторизации через номер телефона и код подтверждения.'
                },
                {
                    title: 'WhatsApp Business',
                    content: 'Интеграция с WhatsApp Business API. Поддержка текстовых сообщений, изображений, документов и голосовых сообщений.'
                },
                {
                    title: 'Веб-виджет',
                    content: 'Встраиваемый чат-виджет для веб-сайтов. Генерация кода для интеграции, настройка внешнего вида и поведения.'
                },
                {
                    title: 'Instagram Direct',
                    content: 'Подключение к Instagram для работы с Direct сообщениями. Эмуляция мобильного устройства без использования Graph API.'
                }
            ]
        },
        {
            key: 'notifications',
            title: 'Система уведомлений',
            icon: <BellOutlined />,
            description: 'Настройка оповещений о событиях',
            items: [
                {
                    title: 'Email уведомления',
                    content: 'Настройка отправки уведомлений на электронную почту при важных событиях: новые диалоги, достижение целей, ошибки.'
                },
                {
                    title: 'Telegram уведомления',
                    content: 'Отправка уведомлений в личный Telegram при срабатывании триггеров или системных событий.'
                },
                {
                    title: 'Instant уведомления',
                    content: 'Получение уведомлений о работе сервисов прямо в интерфейсе панели управления.'
                },
                {
                    title: 'Webhook уведомления',
                    content: 'Настройка HTTP webhook для интеграции с внешними системами. Отправка POST запросов при определенных событиях.'
                },
                {
                    title: 'События для уведомлений',
                    content: 'Выбор событий: начало диалога, завершение диалога, достижение цели, срабатывание триггера, ошибки системы.'
                }
            ]
        },
        {
            key: 'statistics',
            title: 'Аналитика и статистика',
            icon: <BarChartOutlined />,
            description: 'Просмотр метрик и диалогов',
            items: [
                {
                    title: 'Список диалогов',
                    content: 'Просмотр всех диалогов с фильтрацией по каналам, датам, статусам. Поиск по содержимому сообщений.'
                },
                {
                    title: 'Детали диалога',
                    content: 'Полная история переписки с отображением времени, типов сообщений, файлов и метаданных.'
                },
                {
                    title: 'Статистика использования',
                    content: 'Количество сообщений, активные пользователи, популярные каналы, время ответа, достижение целей.'
                },
                {
                    title: 'Экспорт данных',
                    content: 'Выгрузка диалогов и статистики в различных форматах: JSON, CSV, PDF для анализа.'
                }
            ]
        },
        {
            key: 'billing',
            title: 'Биллинг и тарифы',
            icon: <CreditCardOutlined />,
            description: 'Управление подпиской и платежами',
            items: [
                {
                    title: 'Тарифные планы',
                    content: 'Различные тарифы с лимитами на количество сообщений, каналов и функций. Возможность смены тарифа.'
                },
                {
                    title: 'Пополнение баланса',
                    content: 'Различные способы оплаты: банковские карты, электронные кошельки, криптовалюты.'
                },
                {
                    title: 'История платежей',
                    content: 'Просмотр всех транзакций, загрузка документов об оплате, отслеживание расходов.'
                },
                {
                    title: 'Автоплатежи',
                    content: 'Настройка автоматического пополнения баланса при достижении минимального значения.'
                }
            ]
        },
        {
            key: 'dev-tools',
            title: 'Инструменты разработчика',
            icon: <BugOutlined />,
            description: 'Расширенные настройки и диагностика',
            items: [
                {
                    title: 'Системные настройки',
                    content: 'Конфигурация серверных параметров: API ключи, настройки подключений, лимиты запросов.'
                },
                {
                    title: 'Тестирование интеграций',
                    content: 'Проверка работы подключений к мессенджерам, тестовые сообщения, диагностика ошибок.'
                },
                {
                    title: 'Логи системы',
                    content: 'Просмотр системных логов, ошибок, статусов сервисов для диагностики проблем.'
                },
                {
                    title: 'API управления',
                    content: 'REST API для программного управления системой: создание моделей, отправка сообщений, получение статистики.'
                }
            ]
        }
    ];

    const handleSectionClick = (sectionKey) => {
        setActiveSection(activeSection === sectionKey ? null : sectionKey);
    };

    return (
        <div className="documentation-section" id="documentation-section">
            <h2 className="intro-title">
                <span className="highlight">Маруся AI</span> — руководство по использованию
            </h2>
            <Paragraph className="documentation-intro">
                Полное руководство по работе с платформой Маруся AI. Изучите возможности системы
                и узнайте, как эффективно настроить агента для ваших задач.
            </Paragraph>

            <div className="documentation-container">
                <Row gutter={[24, 24]} className="documentation-grid">
                    {documentationSections.map((section) => (
                        <Col xs={24} sm={12} lg={8} key={section.key}>
                            <Card
                                className={`documentation-card ${activeSection === section.key ? 'active' : ''}`}
                                hoverable
                                onClick={() => handleSectionClick(section.key)}
                            >
                                <div className="doc-card-header">
                                    <div className="doc-icon">
                                        {section.icon}
                                    </div>
                                    <div className="doc-card-content">
                                        <Title level={4} className="doc-card-title">
                                            {section.title}
                                        </Title>
                                        <Text className="doc-card-description">
                                            {section.description}
                                        </Text>
                                    </div>
                                </div>

                                {activeSection === section.key && (
                                    <div className="doc-card-details">
                                        <Collapse
                                            ghost
                                            size="small"
                                            items={section.items.map((item, index) => ({
                                                key: index,
                                                label: (
                                                    <Text strong className="doc-item-title">
                                                        {item.title}
                                                    </Text>
                                                ),
                                                children: (
                                                    <Paragraph className="doc-item-content">
                                                        {item.content}
                                                    </Paragraph>
                                                )
                                            }))}
                                        />
                                    </div>
                                )}
                            </Card>
                        </Col>
                    ))}
                </Row>
            </div>

            <div className="documentation-footer">
                <Card className="api-info-card">
                    <Title level={3}>
                        <FileTextOutlined /> API Документация
                    </Title>
                    <Paragraph>
                        Для разработчиков доступна подробная API документация с примерами запросов,
                        схемами данных и интерактивным тестированием эндпоинтов.
                    </Paragraph>
                    <div className="api-tags">
                        <Tag color="blue">REST API</Tag>
                        <Tag color="green">WebSocket</Tag>
                        <Tag color="orange">Webhook</Tag>
                        <Tag color="purple">OpenAPI 3.0</Tag>
                    </div>
                    <Button
                        style={{color: "black", backgroundColor: "var(--new-button-color)", borderColor: "var(--new-button-color)"}}
                        type="primary" className="api-docs-button">
                        Открыть API документацию
                    </Button>
                </Card>
            </div>
        </div>
    );
};

export default Documentation;
