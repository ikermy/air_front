import React from 'react';
import { Card, Row, Col, Typography, Tag } from 'antd';
import {
    AndroidOutlined,
    SubnodeOutlined,
    NotificationOutlined,
    DollarOutlined, UserOutlined,
} from '@ant-design/icons';
import { FaDev } from 'react-icons/fa';
import './DashboardOverview.css';
import {GiConversation} from "react-icons/gi";
import {GoLog} from "react-icons/go";
import {GrServices} from "react-icons/gr";
import {SiCivicrm} from "react-icons/si";

const { Title, Paragraph, Text } = Typography;

const DashboardOverview = ({ userRole = null, onMenuChange = null }) => {
    const isDeveloper = userRole === "Developer";
    const isService = userRole === "Service";
    const showSimpleAuth = process.env.REACT_APP_SHOW_SIMPLE_AUTH === "true";

    // Функция для обработки клика по карточке
    const handleCardClick = (sectionKey) => {
        if (onMenuChange) {
            onMenuChange(sectionKey);
        }
    };

    const dashboardSections = [
        // Dev Tools - показываем только для разработчиков
        ...(isDeveloper ? [{
            key: 'dev',
            title: 'Инструменты разработчика',
            icon: <FaDev />,
            description: 'Расширенные настройки и диагностика системы',
            features: [
                'Системные настройки и конфигурация',
                'Тестирование интеграций',
                'Просмотр логов системы',
                'API управления',
                'Выбор модели GPT',
            ],
            color: '#ff4d4f'
        }] : [{
            key: 'user',
            title: 'О пользователе',
            icon: <UserOutlined />,
            description: 'Информация о пользователе и настройки вашего аккаунта',
            features: [
                'Просмотр и редактирование профиля пользователя',
                'Отслеживание баланса и информации о подписке',
                'Мониторинг использования сообщений и хранилища',
                'Удаление всех данных пользователя',
            ],
            color: '#ff4d4f'
        }]),

        ...(isService ? [] : [{
            key: 'models',
            title: 'Ассистент',
            icon: <AndroidOutlined />,
            description: 'Создание и управление AI-моделями для различных задач',
            features: [
                'Загрузка файлов для обучения',
                'Настройка промптов и инструкций',
                'Установка целей и триггеров',
                'Интерпретатор для генерации файлов'
            ],
            color: '#52c41a'
        }]),
        ...(isService ? [] : [{
            key: 'modules',
            title: 'Каналы',
            icon: <SubnodeOutlined />,
            description: 'Подключение мессенджеров и платформ для взаимодействия',
            features: [
                'Telegram Bot и User Bot',
                'WhatsApp Business API',
                'Веб-виджет для сайтов',
                'Instagram Bot',
            ],
            color: '#1890ff'
        }]),
        {
            key: 'crm',
            title: 'CRM Системы',
            icon: <SiCivicrm />,
            description: 'Интеграция с CRM системами для автоматизации работы с клиентами',
            features: [
                'Подключение amoCRM через OAuth',
                'Автоматическое создание контактов и лидов',
                'Синхронизация диалогов с CRM',
                'Настройка воронок и полей',
                'Управление токенами доступа',
                'Тестирование соединения'
            ],
            color: '#9254de'
        },
        // Поиск лидов - показываем для роли Service и Developer
        ...((isService || isDeveloper) ? [{
            key: 'services',
            title: 'Поиск лидов',
            icon: <GrServices />,
            description: 'Автоматический поиск и обработка потенциальных клиентов',
            features: [
                'Настройка AI-модели для поиска',
                'Управление списком контактов',
                'Расписание рассылок',
                'Статистика и аналитика результатов',
                'Настройка ботов и прокси',
                'События и триггеры'
            ],
            color: '#13c2c2'
        }] : []),
        {
            key: 'notifications',
            title: 'Уведомления',
            icon: <NotificationOutlined />,
            description: 'Настройка оповещений о важных событиях системы',
            features: [
                'Email уведомления',
                'Telegram уведомления',
                'Webhook уведомления',
                'Настройка триггеров событий'
            ],
            color: '#faad14'
        },
        ...(isService ? [] : [{
            key: 'stat',
            title: 'Диалоги',
            icon: <GiConversation />,
            description: 'Просмотр аналитики и метрик работы ассистента',
            features: [
                'Список всех диалогов',
                'Детальная история переписки',
                'Статистика использования',
                'Экспорт истории диалогов'
            ],
            color: '#722ed1'
        }]),
        {
            key: 'logs',
            title: 'Логи',
            icon: <GoLog/>,
            description: 'Получение логов работы всех используемых сервисов',
            features: [
                'Получение логов в реальном времени',
                'Максимально подробная информация',
                'Полная хронология событий',
                'Отслеживание ошибок и предупреждений',
            ],
            color: '#ffe539'
        },

        // Платежи - показываем только если showSimpleAuth === false
        ...(!showSimpleAuth ? [{
            key: 'bill',
            title: 'Платежи',
            icon: <DollarOutlined />,
            description: 'Управление подпиской, балансом и платежами',
            features: [
                'Различные тарифные планы',
                'Пополнение баланса',
                'История всех транзакций',
                'Настройка автоплатежей'
            ],
            color: '#eb2f96'
        }] : [])
    ];

    return (
        <div className="dashboard-overview">
            <div className="overview-header">
                <Title level={2}>
                    Добро пожаловать в панель управления Маруся AI
                </Title>
                <Paragraph className="overview-description">
                    Здесь вы можете управлять всеми аспектами вашего AI-ассистента.
                    Выберите любой раздел из меню слева для начала работы.
                </Paragraph>
            </div>

            <Row gutter={[24, 24]} className="overview-grid">
                {dashboardSections.map((section) => (
                    <Col xs={24} sm={12} lg={8} key={section.key}>
                        <Card
                            className="overview-card"
                            hoverable
                            onClick={() => handleCardClick(section.key)} // Обработка клика по карточке
                        >
                            <div className="card-header">
                                <div
                                    className="card-icon"
                                    style={{ color: section.color }}
                                >
                                    {section.icon}
                                </div>
                                <div className="card-content">
                                    <Title level={4} className="card-title">
                                        {section.title}
                                    </Title>
                                    <Tag color={section.color} className="section-tag">
                                        {section.key.toUpperCase()}
                                    </Tag>
                                </div>
                            </div>

                            <Paragraph className="card-description">
                                {section.description}
                            </Paragraph>

                            <div className="card-features">
                                <Text strong>Основные возможности:</Text>
                                <ul>
                                    {section.features.map((feature, index) => (
                                        <li key={index}>
                                            <Text>{feature}</Text>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>

            <div className="overview-footer">
                <Card className="quick-start-card">
                    <Title level={3}>
                        <AndroidOutlined /> Быстрый старт
                    </Title>
                    <Paragraph>
                        Для начала работы выполните следующие шаги:
                    </Paragraph>
                    <ol>
                        <li><strong>Создайте ассистента</strong> - настройте модель GPT и загрузите необходимые файлы</li>
                        <li><strong>Подключите каналы</strong> - добавьте Telegram, WhatsApp или другие мессенджеры</li>
                        <li><strong>Настроите уведомления</strong> - получайте информацию о важных событиях</li>
                        <li><strong>Отслеживайте статистику</strong> - анализируйте работу вашего ассистента</li>
                    </ol>
                </Card>
            </div>
        </div>
    );
};

export default DashboardOverview;
