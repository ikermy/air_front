import React, {useState} from 'react';
import {Card, Row, Col, Typography, Tag, message} from 'antd';
import {
    AndroidOutlined,
    SubnodeOutlined,
    NotificationOutlined,
    DollarOutlined,
    PlayCircleOutlined,
    CheckCircleOutlined
} from '@ant-design/icons';
import {GiConversation} from "react-icons/gi";
import {GoLog} from "react-icons/go";
import './DashboardDemo.css';
import {useNavigate} from "react-router-dom";
import {useAuth} from "../AuthContext";
import Modal from "../Modal";
import {RegForm} from "./auth/RegForm";
import {AuthForm} from "./auth/AuthForm";
import {
    handleDeny,
    handleDenyMail,
    handleDiasbled,
    handleError,
    handleFalure,
    handleNotConfirmed,
    handleSuccess
} from "./auth/notificationHandlers";
import {RestoreMail} from "./auth/RestoreMail";

const {Title, Paragraph, Text} = Typography;

const DashboardOverView = () => {
    const [activeSection, setActiveSection] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false); // Состояние для модального окна
    const navigate = useNavigate();
    const {isAuthenticated} = useAuth();
    const [mirror, setMirror] = useState(false);
    const [restore, setRestore] = useState(false);
    const [messageApi, contextHolder] = message.useMessage();

    const handleOpenModal = () => {
        if (isAuthenticated) {
            navigate("/dashboard")
        } else {
            setIsModalOpen(true);
            setMirror(false)
            setRestore(false)
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const demoSections = [
        {
            key: 'models',
            title: 'Модель',
            icon: <AndroidOutlined/>,
            description: 'Создание и управление AI-моделями для различных задач',
            features: [
                'Загрузка файлов для обучения',
                'Настройка промптов и инструкций',
                'Установка целей и триггеров',
                'Интерпретатор для генерации файлов'
            ],
            color: '#52c41a',
            status: 'models'
        },
        {
            key: 'modules',
            title: 'Каналы',
            icon: <SubnodeOutlined/>,
            description: 'Подключение мессенджеров и платформ для взаимодействия',
            features: [
                'Telegram Bot и User Bot',
                'WhatsApp Business API',
                'Веб-виджет для сайтов',
                'Instagram Bot'
            ],
            color: '#1890ff',
            status: 'active'
        },
        {
            key: 'notifications',
            title: 'Уведомления',
            icon: <NotificationOutlined/>,
            description: 'Настройка оповещений о важных событиях системы',
            features: [
                'Email уведомления',
                'Telegram уведомления',
                'Webhook уведомления',
                'Настройка триггеров событий'
            ],
            color: '#faad14',
            status: 'notifications'
        },
        {
            key: 'chats',
            title: 'Диалоги',
            icon: <GiConversation/>,
            description: 'Просмотр аналитики и метрик работы агента',
            features: [
                'Список всех диалогов',
                'Детальная история переписки',
                'Статистика использования',
                'Экспорт истории диалогов'
            ],
            color: '#722ed1',
            status: 'chats'
        },
        {
            key: 'logs',
            title: 'Логи',
            icon: <GoLog/>,
            description: 'Получение логов работы всех используемых сервисов',
            features: [
                'Получение логов в реальном времени',
                'Максимально подробная информация',
                'Полная хронология событий',
                'Отслеживание ошибок и предупреждений'
            ],
            color: '#ffe539',
            status: 'logs'
        },
        {
            key: 'bill',
            title: 'Платежи',
            icon: <DollarOutlined/>,
            description: 'Управление подпиской, балансом и платежами',
            features: [
                'Различные тарифные планы',
                'Пополнение баланса',
                'История всех транзакций',
                'Настройка автоплатежей'
            ],
            color: '#eb2f96',
            status: 'bill'
        }
    ];

    const getStatusIcon = (status) => {
        switch (status) {
            case 'active':
                return <PlayCircleOutlined style={{color: '#52c41a'}}/>;
            case 'ready':
                return <CheckCircleOutlined style={{color: '#52c41a'}}/>;
            default:
                return null;
        }
    };

    const handleSectionClick = (key) => {
        setActiveSection(activeSection === key ? null : key);
    };

    return (
        <div className="dashboard-demo">
            {contextHolder}
            <div className="dashboard-demo-content">
                <div className="demo-header">
                    <h2 className="intro-title">
                        <span className="highlight">Маруся AI</span> — панель управления AI-агента
                    </h2>
                    <Paragraph className="demo-description">
                        Полный контроль над вашим агентом в удобном интерфейсе
                    </Paragraph>
                </div>

                <Row gutter={[16, 16]} className="demo-grid">
                    {demoSections.map((section) => (
                        <Col xs={24} sm={12} lg={8} key={section.key}>
                            <Card
                                className={`demo-card ${activeSection === section.key ? 'active' : ''}`}
                                hoverable
                                onClick={() => handleSectionClick(section.key)}
                            >
                                <div className="demo-card-header">
                                    <div
                                        className="demo-card-icon"
                                        style={{color: section.color}}
                                    >
                                        {section.icon}
                                    </div>
                                    <div className="demo-card-content">
                                        <div className="demo-card-title-row">
                                            <Title level={5} className="demo-card-title">
                                                {section.title}
                                            </Title>
                                            {getStatusIcon(section.status)}
                                        </div>
                                        <Tag
                                            color={section.color}
                                            className="demo-section-tag"
                                            size="small"
                                        >
                                            {section.status.toUpperCase()}
                                        </Tag>
                                    </div>
                                </div>

                                <Paragraph className="demo-card-description">
                                    {section.description}
                                </Paragraph>

                                {activeSection === section.key && (
                                    <div className="demo-card-features">
                                        <Text strong>Возможности:</Text>
                                        <ul>
                                            {section.features.slice(0, 3).map((feature, index) => (
                                                <li key={index}>
                                                    <Text className="demo-feature-text">{feature}</Text>
                                                </li>
                                            ))}
                                            {section.features.length > 3 && (
                                                <li>
                                                    <Text className="demo-feature-text">
                                                        и еще {section.features.length - 3} функций...
                                                    </Text>
                                                </li>
                                            )}
                                        </ul>
                                    </div>
                                )}
                            </Card>
                        </Col>
                    ))}
                </Row>

                <div className="demo-footer">
                    <Card className="demo-quick-start">
                        <div className="demo-quick-start-content">
                            <AndroidOutlined className="demo-quick-start-icon"/>
                            <div
                                onClick={e => {
                                    e.stopPropagation();
                                    handleOpenModal();
                                }}
                                style={{cursor: 'pointer'}}
                            >
                                <Title level={4} className="demo-quick-start-title">
                                    Готовы начать работу?
                                </Title>
                                <Text className="demo-quick-start-text">
                                    Создайте агента за 5 минут и подключите его к любому мессенджеру
                                </Text>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {isModalOpen && (
                <Modal onClose={handleCloseModal} itFreeClose={false}>
                    {restore ? (
                        <RestoreMail
                            setMainModalOpen={setIsModalOpen}
                            handleDenyMail={() => handleDenyMail(messageApi)}
                            handleSuccess={() => handleSuccess(messageApi)}
                            handleError={() => handleError(messageApi)}
                        />
                    ) : (
                        <>
                            {!mirror ? (
                                <RegForm
                                    demo={true}
                                    setMirror={setMirror}
                                    setMainModalOpen={setIsModalOpen}
                                    handleSuccess={() => handleSuccess(messageApi)}
                                    handleFalure={() => handleFalure(messageApi)}
                                    handleError={() => handleError(messageApi)}
                                    mirror={!mirror}
                                />
                            ) : (
                                <AuthForm
                                    setMainModalOpen={setIsModalOpen}
                                    setMirror={setMirror}
                                    mirror={!mirror}
                                    setRestoreMail={setRestore}
                                    handleError={() => handleError(messageApi)}
                                    handleDeny={() => handleDeny(messageApi)}
                                    handleDiasbled={() => handleDiasbled(messageApi)}
                                    handleNotConfirmed={() => handleNotConfirmed(messageApi)}
                                />
                            )}
                        </>
                    )}
                </Modal>
            )}
        </div>
    );
};

export default DashboardOverView;
