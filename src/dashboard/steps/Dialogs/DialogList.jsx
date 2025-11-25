import React, {useState, useEffect, useRef} from 'react';
import {useTranslation} from 'react-i18next';
import './DialogList.css';
import '../Tour.css';
import {validateAndRefreshToken} from "../../../utils/easyUtils";
import {
    showWarningNotification
} from "../../hotification/showNotification";
import {FaInstagram, FaTelegramPlane, FaWhatsapp} from "react-icons/fa";
import {CommentOutlined, CheckCircleFilled, CloseCircleFilled, CalendarOutlined, UserOutlined, MessageOutlined, AppstoreOutlined, UnorderedListOutlined, FilterOutlined, BarChartOutlined, QuestionCircleOutlined, PlayCircleOutlined} from "@ant-design/icons";
import {TbWorldWww} from "react-icons/tb";
import {ViewDialog} from "./ViewDialog";
import {Spin, Card, Typography, Space, Pagination, Row, Col, Empty, Radio, Select, Button, Modal, Tour, FloatButton} from "antd";
import {getTourPanelState, setTourPanelState, getViewModeState, setViewModeState} from "../../../utils/cookieUtils";

const { Text, Title } = Typography;
const { Option } = Select;
const LAND_URL = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND) || process.env.REACT_APP_LAND;

export function DialogList() {
    const [loading, setLoading] = useState(true);
    const {t} = useTranslation();
    const [dialogs, setDialogs] = useState([]);
    const [viewDialog, setViewDialog] = useState(null);
    const [dialogTarget, setDialogTarget] = useState(0);
    const [dialogTrigger, setDialogTrigger] = useState(0);
    const [localToken, setLocalToken] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(10);
    const [viewMode, setViewMode] = useState(getViewModeState('dialoglist')); // Загружаем из cookies
    const [selectedType, setSelectedType] = useState('all'); // фильтр по типу
    const [tourVisible, setTourVisible] = useState(false);
    const [current, setCurrent] = useState(0);
    const [tourPanelVisible, setTourPanelVisible] = useState(getTourPanelState('dialoglist')); // Состояние для видимости панели

    // Refs для Tour targets
    const dialogHeaderRef = useRef(null);
    const typeFilterRef = useRef(null);
    const viewToggleRef = useRef(null);
    const dialogCardsRef = useRef(null);
    const paginationRef = useRef(null);

    // Фильтрация диалогов по типу
    const filteredDialogs = selectedType === 'all'
        ? dialogs
        : dialogs.filter(dialog => dialog.Type === selectedType);

    // Вычисляем данные для текущей страницы
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const currentDialogs = filteredDialogs.slice(startIndex, endIndex);

    // Сброс на первую страницу при изменении фильтра
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedType]);

    useEffect(() => {
        const fetchUserDialogs = async () => {
            try {
                const token = await validateAndRefreshToken(localStorage.getItem("authToken"))
                if (token != null) {
                    setLocalToken(token)
                    const response = await fetch(`${LAND_URL}/getuserdialogs?token=${encodeURIComponent(token)}`, {
                        method: "GET",
                        headers: {"Content-Type": "application/json"},
                    });

                    if (response.ok) {
                        const data = await response.json();
                        setDialogs(data);
                    }
                } else {
                    showWarningNotification("Ошибка получения диалогов",
                        "Токен не обновлен, необходимо повторно авторизоваться!")
                }
            } catch (error) {
                // setError(error.message);
            }
            finally {
                setLoading(false);
            }
        };

        fetchUserDialogs();
    }, []);

    const getDialogTypeConfig = (type) => {
        switch (type) {
            case 'TgBot':
                return {
                    icon: <FaTelegramPlane />,
                    label: 'Telegram Bot',
                    color: '#0088cc'
                };
            case 'Widget':
                return {
                    icon: <CommentOutlined />,
                    label: 'Web Widget',
                    color: '#52c41a'
                };
            case 'Telegram':
                return {
                    icon: <FaTelegramPlane />,
                    label: 'Telegram',
                    color: '#0088cc'
                };
            case 'Web':
                return {
                    icon: <TbWorldWww />,
                    label: 'Web',
                    color: '#1890ff'
                };
            case 'WhatsApp':
                return {
                    icon: <FaWhatsapp />,
                    label: 'WhatsApp',
                    color: '#25d366'
                };
            case 'Instagram':
                return {
                    icon: <FaInstagram />,
                    label: 'Instagram',
                    color: '#e4405f'
                };
            default:
                return {
                    icon: <MessageOutlined />,
                    label: type,
                    color: '#8c8c8c'
                };
        }
    };

    const StatusIndicator = ({ value, type }) => {
        const statusText = type === 'target'
            ? (value ? t('TargetComplete') : t('TargetNoComplete'))
            : (value ? t('TriggerComplete') : t('TriggerNoComplete'));

        // Определяем цвета в зависимости от типа
        const getStatusStyle = () => {
            if (type === 'target') {
                return {
                    successColor: '#52c41a',
                    failColor: '#ff4d4f',
                    successBg: 'rgba(82, 196, 26, 0.1)',
                    failBg: 'rgba(255, 77, 79, 0.1)',
                    successBorder: 'rgba(82, 196, 26, 0.3)',
                    failBorder: 'rgba(255, 77, 79, 0.3)'
                };
            } else {
                return {
                    successColor: '#1890ff',
                    failColor: '#faad14',
                    successBg: 'rgba(24, 144, 255, 0.1)',
                    failBg: 'rgba(250, 173, 20, 0.1)',
                    successBorder: 'rgba(24, 144, 255, 0.3)',
                    failBorder: 'rgba(250, 173, 20, 0.3)'
                };
            }
        };

        const style = getStatusStyle();
        const isSuccess = value;

        return (
            <div
                className={`modern-status-indicator ${isSuccess ? 'success' : 'fail'}`}
                style={{
                    background: isSuccess ? style.successBg : style.failBg,
                    borderColor: isSuccess ? style.successBorder : style.failBorder,
                    color: isSuccess ? style.successColor : style.failColor
                }}
            >
                <div className="status-icon-wrapper">
                    {isSuccess ? (
                        <CheckCircleFilled style={{color: style.successColor}} />
                    ) : (
                        <CloseCircleFilled style={{color: style.failColor}} />
                    )}
                </div>
                <span className="status-text">{statusText}</span>
            </div>
        );
    };

    const handleDialogClick = (dialog) => {
        setViewDialog(dialog.DialogId);
        setDialogTarget(dialog.Target);
        setDialogTrigger(dialog.Trigger);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    // Получаем уникальные типы диалогов для фильтра
    const getUniqueTypes = () => {
        const types = [...new Set(dialogs.map(dialog => dialog.Type))];
        return types.map(type => ({
            value: type,
            label: getDialogTypeConfig(type).label,
            icon: getDialogTypeConfig(type).icon
        }));
    };

    // Функция для запуска тура
    const startTour = () => {
        setTourVisible(true);
        setCurrent(0);
        setTourPanelState('dialoglist', false); // Сохраняем состояние скрытой панели
    };

    // Функция для показа панели Tour при клике на FloatButton
    const showTourPanel = () => {
        setTourPanelVisible(true);
        setTourPanelState('dialoglist', true); // Сохраняем состояние показанной панели
    };

    // Функция для скрытия панели Tour
    const hideTourPanel = () => {
        setTourPanelVisible(false);
        setTourPanelState('dialoglist', false); // Сохраняем состояние скрытой панели
    };

    // Шаги Tour для DialogList
    const steps = [
        {
            title: '📊 Добро пожаловать в статистику диалогов',
            description: 'Здесь вы можете просматривать и анализировать историю всех диалогов пользователей с вашим ассистентом, отслеживать эффективность и успешность взаимодействий.',
            target: () => dialogHeaderRef.current,
        },
        {
            title: '🔍 Фильтрация диалогов по типу',
            description: 'Используйте этот фильтр для сортировки диалогов по платформам: Telegram, WhatsApp, Instagram, Web Widget и другие. Это поможет анализировать эффективность каждого канала отдельно.',
            target: () => typeFilterRef.current,
        },
        {
            title: '👁️ Переключение режимов просмотра',
            description: 'Выбирайте между карточным видом (для детального просмотра) и списочным видом (для быстрого сканирования). Каждый режим оптимизирован для разных задач.',
            target: () => viewToggleRef.current,
        },
        {
            title: '💬 Карточки диалогов',
            description: 'Каждая карточка содержит информацию о диалоге: тип платформы, дату, пользователя и статусы выполнения целей. Кликните на карточку для просмотра полного диалога.',
            target: () => dialogCardsRef.current,
        },
        {
            title: '📄 Навигация по страницам',
            description: 'Используйте пагинацию для перемещения между страницами диалогов. Показывается информация о текущем диапазоне и общем количестве диалогов.',
            target: () => paginationRef.current,
        },
        {
            title: '✅ Готово к анализу!',
            description: 'Теперь вы готовы эффективно работать со статистикой диалогов. Изучайте взаимодействия пользователей и оптимизируйте работу вашего ассистента!',
            target: () => dialogCardsRef.current,
        },
    ];

    // Функция для изменения режима просмотра с сохранением в cookies
    const handleViewModeChange = (e) => {
        const newViewMode = e.target.value;
        setViewMode(newViewMode);
        setViewModeState('dialoglist', newViewMode); // Сохраняем в cookies
    };

    if (loading) {
        return <div className="notifications-loading">
            <Spin size="large" />
            <Text className="loading-text">
                Загрузка данных...
            </Text>
        </div>
    }

    return (
        <div className="create-model-container">
            <div className="section-title">
                <BarChartOutlined />
                Статистика диалогов
            </div>
            <div className="section-description">
                Просматривайте историю диалогов пользователей с вашим ассистентом и анализируйте их эффективность
            </div>

            <div className="tour-layout">
                <div className="tour-content">
                    <div className="dialog-list-modern">
                        <div className="dialog-list-header" ref={dialogHeaderRef}>
                            <div className="header-left">
                                <Title level={3} className="dialog-list-title">
                                    История диалогов
                                </Title>
                                <Text type="secondary" className="dialog-count">
                                    {selectedType === 'all'
                                        ? `${t('TotalDialogs')}: ${dialogs.length}`
                                        : `Показано: ${filteredDialogs.length} из ${dialogs.length}`
                                    }
                                </Text>
                            </div>

                            <div className="header-controls">
                                {/* Фильтр по типу */}
                                <div className="type-filter" ref={typeFilterRef}>
                                    <Select
                                        value={selectedType}
                                        onChange={setSelectedType}
                                        style={{ width: 200 }}
                                        placeholder="Фильтр по типу"
                                        suffixIcon={<FilterOutlined />}
                                    >
                                        <Option value="all">
                                            <Space>
                                                <MessageOutlined />
                                                Все типы
                                            </Space>
                                        </Option>
                                        {getUniqueTypes().map(type => (
                                            <Option key={type.value} value={type.value}>
                                                <Space>
                                                    {type.icon}
                                                    {type.label}
                                                </Space>
                                            </Option>
                                        ))}
                                    </Select>
                                </div>

                                {/* Переключатель вида */}
                                <Radio.Group
                                    value={viewMode}
                                    onChange={handleViewModeChange}
                                    className="view-toggle"
                                    ref={viewToggleRef}
                                >
                                    <Radio.Button value="cards">
                                        <AppstoreOutlined /> Карточки
                                    </Radio.Button>
                                    <Radio.Button value="list">
                                        <UnorderedListOutlined /> Список
                                    </Radio.Button>
                                </Radio.Group>
                            </div>
                        </div>

                        {filteredDialogs.length > 0 ? (
                            <>
                                {viewMode === 'cards' ? (
                                    // Карточный вид
                                    <Row gutter={[16, 16]} className="dialog-cards-grid" ref={dialogCardsRef}>
                                        {currentDialogs.map((dialog) => {
                                            const typeConfig = getDialogTypeConfig(dialog.Type);
                                            return (
                                                <Col xs={24} sm={12} lg={8} xl={6} key={dialog.DialogId}>
                                                    <Card
                                                        className="dialog-card"
                                                        hoverable
                                                        onClick={() => handleDialogClick(dialog)}
                                                        size="small"
                                                    >
                                                        <div className="dialog-card-header">
                                                            <div
                                                                className="dialog-type-icon"
                                                                style={{ color: typeConfig.color }}
                                                            >
                                                                {typeConfig.icon}
                                                            </div>
                                                            <div className="dialog-card-title">
                                                                <Text strong>{typeConfig.label}</Text>
                                                                <Text type="secondary" className="dialog-id">
                                                                    #{dialog.DialogId}
                                                                </Text>
                                                            </div>
                                                        </div>

                                                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                                            <div className="dialog-info-row">
                                                                <CalendarOutlined className="info-icon" />
                                                                <Text type="secondary">{dialog.Date}</Text>
                                                            </div>

                                                            <div className="dialog-info-row">
                                                                <UserOutlined className="info-icon" />
                                                                <Text>{dialog.Responder}</Text>
                                                            </div>

                                                            <div className="dialog-statuses">
                                                                <StatusIndicator value={dialog.Target === 1} type="target" />
                                                                <StatusIndicator value={dialog.Trigger === 1} type="trigger" />
                                                            </div>
                                                        </Space>
                                                    </Card>
                                                </Col>
                                            );
                                        })}
                                    </Row>
                                ) : (
                                    // Списочный вид
                                    <div className="dialog-list-view">
                                        {currentDialogs.map((dialog) => {
                                            const typeConfig = getDialogTypeConfig(dialog.Type);
                                            return (
                                                <div
                                                    key={dialog.DialogId}
                                                    className="dialog-list-item"
                                                    onClick={() => handleDialogClick(dialog)}
                                                >
                                                    <div className="list-item-content">
                                                        <div className="list-item-left">
                                                            <div
                                                                className="list-type-icon"
                                                                style={{ color: typeConfig.color }}
                                                            >
                                                                {typeConfig.icon}
                                                            </div>
                                                            <div className="list-item-info">
                                                                <div className="list-item-header">
                                                                    <Text strong>{typeConfig.label}</Text>
                                                                    <Text type="secondary" className="list-dialog-id">
                                                                        #{dialog.DialogId}
                                                                    </Text>
                                                                </div>
                                                                <div className="list-item-details">
                                                                    <Space size="large">
                                                                        <Space size="small">
                                                                            <CalendarOutlined className="list-info-icon" />
                                                                            <Text type="secondary">{dialog.Date}</Text>
                                                                        </Space>
                                                                        <Space size="small">
                                                                            <UserOutlined className="list-info-icon" />
                                                                            <Text>{dialog.Responder}</Text>
                                                                        </Space>
                                                                    </Space>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="list-item-right">
                                                            <div className="list-statuses">
                                                                <StatusIndicator value={dialog.Target === 1} type="target" />
                                                                <StatusIndicator value={dialog.Trigger === 1} type="trigger" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                <div className="dialog-pagination" ref={paginationRef}>
                                    <Pagination
                                        current={currentPage}
                                        total={filteredDialogs.length}
                                        pageSize={pageSize}
                                        onChange={handlePageChange}
                                        showSizeChanger={false}
                                        showQuickJumper={false}
                                        showTotal={(total, range) =>
                                            `${range[0]}-${range[1]} из ${total} диалогов`
                                        }
                                        className="custom-pagination"
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="dialog-empty-state">
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description={
                                        <div>
                                            <Text type="secondary">
                                                {selectedType === 'all'
                                                    ? t('noDialogsFound')
                                                    : `Диалогов типа "${getDialogTypeConfig(selectedType).label}" не найдено`
                                                }
                                            </Text>
                                            <br />
                                            <Text type="secondary">
                                                {selectedType === 'all'
                                                    ? "Диалоги появятся здесь после первых обращений к вашему ассистенту"
                                                    : "Попробуйте выбрать другой тип или сбросить фильтр"
                                                }
                                            </Text>
                                            {selectedType !== 'all' && (
                                                <div style={{ marginTop: 12 }}>
                                                    <Button
                                                        type="primary"
                                                        onClick={() => setSelectedType('all')}
                                                    >
                                                        Показать все диалоги
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    }
                                />
                            </div>
                        )}

                        {isModalOpen && (
                            <Modal
                                title="Просмотр диалога"
                                open={isModalOpen}
                                onCancel={handleCloseModal}
                                footer={null}
                                width={900}
                                centered
                                destroyOnClose
                                className="dialog-view-modal"
                                styles={{
                                    mask: {
                                        backdropFilter: 'blur(4px)',
                                        WebkitBackdropFilter: 'blur(4px)',
                                    }
                                }}
                            >
                                <ViewDialog
                                    token={localToken}
                                    dialogId={viewDialog}
                                    target={dialogTarget}
                                    trigger={dialogTrigger}
                                />
                            </Modal>
                        )}
                    </div>
                </div>

                {/* Панель управления Tour справа - показывается только когда tourPanelVisible = true */}
                {tourPanelVisible && (
                    <div className="tour-controls tour-primary">
                        <div className="tour-controls-header">
                            <PlayCircleOutlined className="tour-controls-icon" />
                            <h3 className="tour-controls-title">
                                Интерактивный обзор
                            </h3>
                            <p className="tour-controls-subtitle">
                                Изучите интерфейс статистики диалогов пошагово
                            </p>
                        </div>

                        <div className="tour-start-button">
                            <Button
                                type="primary"
                                block
                                size="large"
                                onClick={startTour}
                            >
                                🚀 Начать тур
                            </Button>
                        </div>

                        {tourVisible && (
                            <div className="tour-progress">
                                <div className="tour-progress-step">
                                    <span className="tour-progress-step-text">
                                        Шаг {current + 1} из {steps.length}
                                    </span>
                                </div>
                                <div className="tour-progress-bar">
                                    <div
                                        className="tour-progress-fill"
                                        style={{width: `${((current + 1) / steps.length) * 100}%`}}
                                    />
                                </div>
                                <div className="tour-progress-title">
                                    {steps[current]?.title}
                                </div>
                            </div>
                        )}

                        <div className="tour-info">
                            <div className="tour-info-title">📋 Что вы изучите:</div>
                            <ul className="tour-info-list">
                                <li>Фильтрацию диалогов по типам</li>
                                <li>Переключение режимов просмотра</li>
                                <li>Анализ статистики диалогов</li>
                                <li>Просмотр детальной информации</li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>

            <Tour
                open={tourVisible}
                onClose={() => {
                    setTourVisible(false);
                    setCurrent(0);
                    hideTourPanel()
                }}
                steps={steps}
                current={current}
                onChange={setCurrent}
                indicatorsRender={(current, total) => (
                    <span className="tour-indicator">
                        {current + 1} / {total}
                    </span>
                )}
                type="primary"
                arrow={false}
            />

            <FloatButton
                icon={<QuestionCircleOutlined />}
                tooltip="Начать обзор интерфейса"
                onClick={showTourPanel}
                className="tour-float-button"
            />
        </div>
    );
}
