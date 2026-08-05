import React from 'react';
import { Card, Row, Col, Typography, Tag } from 'antd';
import {
    AndroidOutlined,
    SubnodeOutlined,
    NotificationOutlined,
    DollarOutlined, UserOutlined,
} from '@ant-design/icons';
import { FaDev } from 'react-icons/fa';
import {GiConversation} from "react-icons/gi";
import {GoLog} from "react-icons/go";
import {GrServices} from "react-icons/gr";
import {SiCivicrm} from "react-icons/si";
import {useTranslation} from "react-i18next";

const { Title, Paragraph, Text } = Typography;

const DashboardOverview = ({ userRole = null, onMenuChange = null }) => {
    const {t} = useTranslation();
    const isDeveloper = userRole === "Developer";
    const isService = userRole === "Service";
    const showSimpleAuth = false;

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
            title: t('dashboardOverviewDevTitle') || 'Инструменты разработчика',
            icon: <FaDev />,
            description: t('dashboardOverviewDevDesc') || 'Расширенные настройки и диагностика системы',
            features: [
                t('dashboardOverviewDevFeature1') || 'Системные настройки и конфигурация',
                t('dashboardOverviewDevFeature2') || 'Тестирование интеграций',
                t('dashboardOverviewDevFeature3') || 'Просмотр логов системы',
                t('dashboardOverviewDevFeature4') || 'API управления',
                t('dashboardOverviewDevFeature5') || 'Выбор модели GPT',
            ],
            color: '#ff4d4f'
        }] : [{
            key: 'user',
            title: t('dashboardOverviewUserTitle') || 'О пользователе',
            icon: <UserOutlined />,
            description: t('dashboardOverviewUserDesc') || 'Информация о пользователе и настройки вашего аккаунта',
            features: [
                t('dashboardOverviewUserFeature1') || 'Просмотр и редактирование профиля пользователя',
                t('dashboardOverviewUserFeature2') || 'Отслеживание баланса и информации о подписке',
                t('dashboardOverviewUserFeature3') || 'Мониторинг использования сообщений и хранилища',
                t('dashboardOverviewUserFeature4') || 'Удаление всех данных пользователя',
            ],
            color: '#ff4d4f'
        }]),

        ...(isService ? [] : [{
            key: 'models',
            title: t('dashboardOverviewModelsTitle') || 'Модель',
            icon: <AndroidOutlined />,
            description: t('dashboardOverviewModelsDesc') || 'Создание и управление AI-моделями для различных задач',
            features: [
                t('dashboardOverviewModelsFeature1') || 'Загрузка файлов для обучения',
                t('dashboardOverviewModelsFeature2') || 'Настройка промптов и инструкций',
                t('dashboardOverviewModelsFeature3') || 'Установка целей и триггеров',
                t('dashboardOverviewModelsFeature4') || 'Интерпретатор для генерации файлов'
            ],
            color: '#52c41a'
        }]),
        ...(isService ? [] : [{
            key: 'modules',
            title: t('dashboardOverviewModulesTitle') || 'Каналы',
            icon: <SubnodeOutlined />,
            description: t('dashboardOverviewModulesDesc') || 'Подключение мессенджеров и платформ для взаимодействия',
            features: [
                t('dashboardOverviewModulesFeature1') || 'Telegram Bot и User Bot',
                'WhatsApp Business API',
                t('dashboardOverviewModulesFeature3') || 'Веб-виджет для сайтов',
                'Instagram Bot',
                'Avito Bot'
            ],
            color: '#1890ff'
        }]),
        {
            key: 'crm',
            title: t('dashboardOverviewCRMTitle') || 'CRM Системы',
            icon: <SiCivicrm />,
            description: t('dashboardOverviewCRMDesc') || 'Интеграция с CRM системами для автоматизации работы с клиентами',
            features: [
                t('dashboardOverviewCRMFeature1') || 'Подключение amoCRM через OAuth',
                t('dashboardOverviewCRMFeature2') || 'Автоматическое создание контактов и лидов',
                t('dashboardOverviewCRMFeature3') || 'Синхронизация диалогов с CRM',
                t('dashboardOverviewCRMFeature4') || 'Настройка воронок и полей',
                t('dashboardOverviewCRMFeature5') || 'Управление токенами доступа',
                t('dashboardOverviewCRMFeature6') || 'Тестирование соединения'
            ],
            color: '#9254de'
        },
        {
            key: 'services',
            title: t('dashboardOverviewServicesTitle') || 'Поиск лидов',
            icon: <GrServices />,
            description: t('dashboardOverviewServicesDesc') || 'Автоматический поиск и обработка потенциальных клиентов',
            features: [
                t('dashboardOverviewServicesFeature1') || 'Настройка AI-модели для поиска',
                t('dashboardOverviewServicesFeature2') || 'Управление списком контактов',
                t('dashboardOverviewServicesFeature3') || 'Расписание рассылок',
                t('dashboardOverviewServicesFeature4') || 'Статистика и аналитика результатов',
                t('dashboardOverviewServicesFeature5') || 'Настройка ботов и прокси',
                t('dashboardOverviewServicesFeature6') || 'События и триггеры'
            ],
            color: '#13c2c2'
        },
        {
            key: 'notifications',
            title: t('dashboardOverviewNotificationsTitle') || 'Уведомления',
            icon: <NotificationOutlined />,
            description: t('dashboardOverviewNotificationsDesc') || 'Настройка оповещений о важных событиях системы',
            features: [
                t('dashboardOverviewNotificationsFeature1') || 'Email уведомления',
                t('dashboardOverviewNotificationsFeature2') || 'Telegram уведомления',
                t('dashboardOverviewNotificationsFeature3') || 'Webhook уведомления',
                t('dashboardOverviewNotificationsFeature4') || 'Instant уведомления',
                t('dashboardOverviewNotificationsFeature5') || 'Настройка триггеров событий'
            ],
            color: '#faad14'
        },
        {
            key: 'stat',
            title: t('dashboardOverviewStatTitle') || 'Диалоги',
            icon: <GiConversation />,
            description: t('dashboardOverviewStatDesc') || 'Просмотр аналитики и метрик работы агента',
            features: [
                t('dashboardOverviewStatFeature1') || 'Список всех диалогов',
                t('dashboardOverviewStatFeature2') || 'Детальная история переписки',
                t('dashboardOverviewStatFeature3') || 'Статистика использования',
                t('dashboardOverviewStatFeature4') || 'Экспорт истории диалогов'
            ],
            color: '#722ed1'
        },
        {
            key: 'logs',
            title: t('dashboardOverviewLogsTitle') || 'Логи',
            icon: <GoLog/>,
            description: t('dashboardOverviewLogsDesc') || 'Получение логов работы всех используемых сервисов',
            features: [
                t('dashboardOverviewLogsFeature1') || 'Получение логов в реальном времени',
                t('dashboardOverviewLogsFeature2') || 'Максимально подробная информация',
                t('dashboardOverviewLogsFeature3') || 'Полная хронология событий',
                t('dashboardOverviewLogsFeature4') || 'Отслеживание ошибок и предупреждений',
            ],
            color: '#ffe539'
        },

        // Платежи - показываем только если showSimpleAuth === false
        ...(!showSimpleAuth ? [{
            key: 'bill',
            title: t('dashboardOverviewBillTitle') || 'Платежи',
            icon: <DollarOutlined />,
            description: t('dashboardOverviewBillDesc') || 'Управление подпиской, балансом и платежами',
            features: [
                t('dashboardOverviewBillFeature1') || 'Различные тарифные планы',
                t('dashboardOverviewBillFeature2') || 'Пополнение баланса',
                t('dashboardOverviewBillFeature3') || 'История всех транзакций',
                t('dashboardOverviewBillFeature4') || 'Настройка автоплатежей'
            ],
            color: '#eb2f96'
        }] : [])
    ];

    return (
        <div className="dashboard-overview">
            <div className="overview-header">
                <Title level={2}>
                    {t('dashboardOverviewWelcomeTitle') || 'Добро пожаловать в панель управления Маруся AI'}
                </Title>
                <Paragraph className="overview-description">
                    {t('dashboardOverviewWelcomeDescription') || 'Здесь вы можете управлять всеми аспектами вашего AI-агента. Выберите любой раздел из меню слева для начала работы.'}
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
                                    <Tag
                                        className="section-tag"
                                        color={section.color}
                                        style={{ backgroundColor: section.color, color: "white" }}
                                    >
                                        {section.key.toUpperCase()}
                                    </Tag>

                                </div>
                            </div>

                            <Paragraph className="card-description">
                                {section.description}
                            </Paragraph>

                            <div className="card-features">
                                <Text strong>{t('dashboardOverviewMainFeatures') || 'Основные возможности:'}</Text>
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
                        <AndroidOutlined /> {t('dashboardOverviewQuickStartTitle') || 'Быстрый старт'}
                    </Title>
                    <Paragraph>
                        {t('dashboardOverviewQuickStartDesc') || 'Для начала работы выполните следующие шаги:'}
                    </Paragraph>
                    <ol>
                        <li><strong>{t('dashboardOverviewQuickStartStep1Title') || 'Создайте агента'}</strong> - {t('dashboardOverviewQuickStartStep1Desc') || 'настройте модель GPT и загрузите необходимые файлы'}</li>
                        <li><strong>{t('dashboardOverviewQuickStartStep2Title') || 'Подключите каналы'}</strong> - {t('dashboardOverviewQuickStartStep2Desc') || 'добавьте Telegram, WhatsApp или другие мессенджеры'}</li>
                        <li><strong>{t('dashboardOverviewQuickStartStep3Title') || 'Настроите уведомления'}</strong> - {t('dashboardOverviewQuickStartStep3Desc') || 'получайте информацию о важных событиях'}</li>
                        <li><strong>{t('dashboardOverviewQuickStartStep4Title') || 'Отслеживайте статистику'}</strong> - {t('dashboardOverviewQuickStartStep4Desc') || 'анализируйте работу вашего агента'}</li>
                    </ol>
                </Card>
            </div>
        </div>
    );
};

export default DashboardOverview;
