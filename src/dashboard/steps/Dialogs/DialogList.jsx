import React, {useState, useEffect, useRef} from 'react';
import {useTranslation} from 'react-i18next';
import './DialogList.css';
import '../Tour.css';
import {authFetch} from '../../../utils/easyUtils';
import {DeleteDialogs} from './dialogsUtils';
import {
    showWarningNotification
} from "../../hotification/showNotification";
import {FaInstagram, FaTelegramPlane, FaWhatsapp} from "react-icons/fa";
import {
    CommentOutlined,
    CheckCircleFilled,
    CloseCircleFilled,
    CalendarOutlined,
    UserOutlined,
    MessageOutlined,
    AppstoreOutlined,
    UnorderedListOutlined,
    FilterOutlined,
    BarChartOutlined,
    QuestionCircleOutlined,
    PlayCircleOutlined,
    DeleteOutlined,
    ExclamationCircleOutlined
} from "@ant-design/icons";
import {TbWorldWww} from "react-icons/tb";
import {ViewDialog} from "./ViewDialog";
import {
    Spin,
    Card,
    Typography,
    Space,
    Pagination,
    Row,
    Col,
    Empty,
    Radio,
    Select,
    Button,
    Modal,
    Tour,
    FloatButton
} from "antd";
import {showNotification, showErrorNotification} from '../../hotification/showNotification';
import {getTourPanelState, setTourPanelState, getViewModeState, setViewModeState} from "../../../utils/cookieUtils";
import AvitoIcon from "../Channals/AvitoIcon";


const {Title, Text} = Typography;
const {Option} = Select;

export function DialogList() {
    const {t} = useTranslation();
    const [loading, setLoading] = useState(true);
    const [dialogs, setDialogs] = useState([]);
    const [viewDialog, setViewDialog] = useState(null);
    const [dialogTarget, setDialogTarget] = useState(0);
    const [dialogTrigger, setDialogTrigger] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(10);
    const [viewMode, setViewMode] = useState(getViewModeState('dialoglist')); // Загружаем из cookies
    const [selectedType, setSelectedType] = useState('all'); // фильтр по типу
    const [tourVisible, setTourVisible] = useState(false);
    const [current, setCurrent] = useState(0);
    const [tourPanelVisible, setTourPanelVisible] = useState(getTourPanelState('dialoglist')); // Состояние для видимости панели
    const [selectedDialogs, setSelectedDialogs] = useState([]); // массив выбранных dialogId для удаления
    const [batchDeleteModalOpen, setBatchDeleteModalOpen] = useState(false);

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

    // Сброс на первую страницу при изменении фильтра
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedType]);

    // Вычисляем данные для текущей страницы
    // Используем Math.max(1, ...) чтобы гарантировать, что currentPage никогда не превышает максимальное количество страниц
    const maxPages = Math.ceil(filteredDialogs.length / pageSize);
    const validCurrentPage = Math.min(currentPage, Math.max(1, maxPages));
    const startIndex = (validCurrentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const currentDialogs = filteredDialogs.slice(startIndex, endIndex);

    useEffect(() => {
        const fetchDialogs = async () => {
            try {
                const response = await authFetch(`/v1/dialog/all`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                });

                if (response && response.ok) {
                    const data = await response.json();
                    setDialogs(data);
                } else if (response && response.status === 401) {
                    showWarningNotification("Ошибка получения диалогов", "Токен не обновлен, необходимо повторно авторизоваться!");
                }
            } catch (error) {
                // setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchDialogs();
    }, []);

    const getDialogTypeConfig = (type) => {
        switch (type) {
            case 'TgBot':
                return {
                    icon: <FaTelegramPlane/>,
                    label: 'Telegram Bot',
                    color: '#0088cc'
                };
            case 'Widget':
                return {
                    icon: <CommentOutlined/>,
                    label: 'Web Widget',
                    color: '#52c41a'
                };
            case 'Telegram':
                return {
                    icon: <FaTelegramPlane/>,
                    label: 'Telegram',
                    color: '#0088cc'
                };
            case 'Web':
                return {
                    icon: <TbWorldWww/>,
                    label: 'Web',
                    color: '#1890ff'
                };
            case 'WhatsApp':
                return {
                    icon: <FaWhatsapp/>,
                    label: 'WhatsApp',
                    color: '#25d366'
                };
            case 'Instagram':
                return {
                    icon: <FaInstagram/>,
                    label: 'Instagram',
                    color: '#e4405f'
                };
            case 'Avito':
                return {
                    icon: <AvitoIcon size={15} />,
                    label: 'Avito',
                    color: '#4ea7ff'
                };
            default:
                return {
                    icon: <MessageOutlined/>,
                    label: type,
                    color: '#8c8c8c'
                };
        }
    };

    const StatusIndicator = ({value, type}) => {
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
                        <CheckCircleFilled style={{color: style.successColor}}/>
                    ) : (
                        <CloseCircleFilled style={{color: style.failColor}}/>
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

    const handleDialogDeleted = (deletedDialogId) => {
        // Удаляем диалог из локального состояния
        setDialogs(prev => prev.filter(d => d.DialogId !== deletedDialogId));
        // Удаляем из выбранных, если там был
        setSelectedDialogs(prev => prev.filter(id => id !== deletedDialogId));
        // Закрываем модальное окно
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
            title: t("dialogsTourWelcome") || '📊 Добро пожаловать в статистику диалогов',
            description: t("dialogsTourWelcomeDesc") || 'Здесь вы можете просматривать и анализировать историю всех диалогов пользователей с вашим агентом, отслеживать эффективность и успешность взаимодействий.',
            target: () => dialogHeaderRef.current,
        },
        {
            title: t("dialogsTourFilter") || '🔍 Фильтрация диалогов по типу',
            description: t("dialogsTourFilterDesc") || 'Используйте этот фильтр для сортировки диалогов по платформам: Telegram, WhatsApp, Instagram, Web Widget и другие. Это поможет анализировать эффективность каждого канала отдельно.',
            target: () => typeFilterRef.current,
        },
        {
            title: t("dialogsTourViewToggle") || '👁️ Переключение режимов просмотра',
            description: t("dialogsTourViewToggleDesc") || 'Выбирайте между карточным видом (для детального просмотра) и списочным видом (для быстрого сканирования). Каждый режим оптимизирован для разных задач.',
            target: () => viewToggleRef.current,
        },
        {
            title: t("dialogsTourCards") || '💬 Карточки диалогов',
            description: t("dialogsTourCardsDesc") || 'Каждая карточка содержит информацию о диалоге: тип платформы, дату, пользователя и статусы выполнения целей. Кликните на карточку для просмотра полного диалога.',
            target: () => dialogCardsRef.current,
        },
        {
            title: t("dialogsTourPagination") || '📄 Навигация по страницам',
            description: t("dialogsTourPaginationDesc") || 'Используйте пагинацию для перемещения между страницами диалогов. Показывается информация о текущем диапазоне и общем количестве диалогов.',
            target: () => paginationRef.current,
        },
        {
            title: t("dialogsTourReady") || '✅ Готово к анализу!',
            description: t("dialogsTourReadyDesc") || 'Теперь вы готовы эффективно работать со статистикой диалогов. Изучайте взаимодействия пользователей и оптимизируйте работу вашего агента!',
            target: () => dialogCardsRef.current,
        },
    ];

    // Функция для изменения режима просмотра с сохранением в cookies
    const handleViewModeChange = (e) => {
        const newViewMode = e.target.value;
        setViewMode(newViewMode);
        setViewModeState('dialoglist', newViewMode); // Сохраняем в cookies
    };

    const toggleSelectDialog = (e, dialogId) => {
        e.stopPropagation(); // предотвратить открытие просмотра
        setSelectedDialogs(prev => {
            const exists = prev.includes(dialogId);
            if (exists) return prev.filter(id => id !== dialogId);
            return [...prev, dialogId];
        });
    };

    if (loading) {
        return <div className="notifications-loading">
            <Spin size="large"/>
            <Text className="loading-text">
                {t("dialogsLoading") || "Загрузка диалогов..."}
            </Text>
        </div>
    }

    return (
        <div className="create-model-container">
            <div className="section-title">
                <BarChartOutlined/>
                {t("dialogsTitle") || "Статистика диалогов"}
            </div>
            <div className="section-description">
                {t("dialogsDescription") || "Просматривайте историю диалогов пользователей с вашим агентом и анализируйте их эффективность"}
            </div>

            <div className="tour-layout">
                <div className="tour-content">
                    <div className="dialog-list-modern">
                        <div className="dialog-list-header" ref={dialogHeaderRef}>
                            <div className="header-left">
                                <Title level={3} className="dialog-list-title">
                                    {t("dialogsTitle") || "История диалогов"}
                                </Title>
                                <Text type="secondary" className="dialog-count">
                                    {selectedType === 'all'
                                        ? `${t('TotalDialogs') || "Всего диалогов"}: ${dialogs.length}`
                                        : `${t("shown") || "Показано"}: ${filteredDialogs.length} ${t("of") || "из"} ${dialogs.length}`
                                    }
                                </Text>
                            </div>

                            <div className="header-controls">
                                {/* Batch delete button in header (appears when there are selected dialogs) */}
                                {selectedDialogs.length > 0 && (
                                    <div style={{display: 'flex', alignItems: 'center'}}>
                                        <Button danger type="primary" icon={<DeleteOutlined/>}
                                                onClick={() => setBatchDeleteModalOpen(true)}>
                                            {t("dialogsDeleteSelected") || "Удалить диалоги"}
                                        </Button>
                                    </div>
                                )}

                                {/* Фильтр по типу */}
                                <div className="type-filter" ref={typeFilterRef}>
                                    <Select
                                        value={selectedType}
                                        onChange={setSelectedType}
                                        style={{width: 200}}
                                        placeholder={t("dialogsFilterByType") || "Фильтр по типу"}
                                        suffixIcon={<FilterOutlined/>}
                                    >
                                        <Option value="all">
                                            <Space>
                                                <MessageOutlined/>
                                                {t("dialogsFilterAll") || "Все типы"}
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
                                        <AppstoreOutlined/> {t("dialogsViewCards") || "Карточки"}
                                    </Radio.Button>
                                    <Radio.Button value="list">
                                        <UnorderedListOutlined/> {t("dialogsViewList") || "Список"}
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
                                                        <div className="dialog-card-header" style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between'
                                                        }}>
                                                            <div style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 10
                                                            }}>
                                                                <div
                                                                    className="dialog-type-icon"
                                                                    style={{
                                                                        color: typeConfig.color,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        position: 'relative',
                                                                        minWidth: 36
                                                                    }}
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
                                                            {/* Иконка удаления выровнена по правому краю карточки */}
                                                            <div className="dialog-delete-icon" onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleSelectDialog(e, dialog.DialogId);
                                                            }}
                                                                 style={{color: selectedDialogs.includes(dialog.DialogId) ? '#ff4d4f' : 'rgba(0,0,0,0.45)'}}>
                                                                <DeleteOutlined/>
                                                            </div>
                                                        </div>

                                                        <Space direction="vertical" size="small"
                                                               style={{width: '100%'}}>
                                                            <div className="dialog-info-row">
                                                                <CalendarOutlined className="info-icon"/>
                                                                <Text type="secondary">{dialog.Date}</Text>
                                                            </div>

                                                            <div className="dialog-info-row">
                                                                <UserOutlined className="info-icon"/>
                                                                <Text>{dialog.Responder}</Text>
                                                            </div>

                                                            <div className="dialog-statuses">
                                                                <StatusIndicator value={dialog.Target === 1}
                                                                                 type="target"/>
                                                                <StatusIndicator value={dialog.Trigger === 1}
                                                                                 type="trigger"/>
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
                                                                style={{
                                                                    color: typeConfig.color,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    position: 'relative',
                                                                    minWidth: 36
                                                                }}
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
                                                                            <CalendarOutlined
                                                                                className="list-info-icon"/>
                                                                            <Text type="secondary">{dialog.Date}</Text>
                                                                        </Space>
                                                                        <Space size="small">
                                                                            <UserOutlined className="list-info-icon"/>
                                                                            <Text>{dialog.Responder}</Text>
                                                                        </Space>
                                                                    </Space>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="list-item-right" style={{
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'flex-end'
                                                        }}>
                                                            {/* Иконка удаления — справа сверху */}
                                                            <div className="list-delete-icon" onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleSelectDialog(e, dialog.DialogId);
                                                            }}
                                                                 style={{color: selectedDialogs.includes(dialog.DialogId) ? '#ff4d4f' : 'rgba(0,0,0,0.45)'}}>
                                                                <DeleteOutlined/>
                                                            </div>
                                                            <div className="list-statuses">
                                                                <StatusIndicator value={dialog.Target === 1}
                                                                                 type="target"/>
                                                                <StatusIndicator value={dialog.Trigger === 1}
                                                                                 type="trigger"/>
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
                                        current={validCurrentPage}
                                        total={filteredDialogs.length}
                                        pageSize={pageSize}
                                        onChange={handlePageChange}
                                        showSizeChanger={false}
                                        showQuickJumper={false}
                                        showTotal={(total, range) =>
                                            `${range[0]}-${range[1]} ${t("of") || "из"} ${total} ${t("dialogsMessages") || "диалогов"}`
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
                                                    ? (t('dialogsNoDialogs') || "Диалоги не найдены")
                                                    : `${t("dialogsNoDialogsOfType") || "Диалогов типа"} "${getDialogTypeConfig(selectedType).label}" ${t("notFound") || "не найдено"}`
                                                }
                                            </Text>
                                            <br/>
                                            <Text type="secondary">
                                                {selectedType === 'all'
                                                    ? (t("dialogsNoDialogsDesc") || "Диалоги появятся здесь после первых обращений к вашему агенту")
                                                    : (t("dialogsTryAnotherType") || "Попробуйте выбрать другой тип или сбросить фильтр")
                                                }
                                            </Text>
                                            {selectedType !== 'all' && (
                                                <div style={{marginTop: 12}}>
                                                    <Button
                                                        type="primary"
                                                        onClick={() => setSelectedType('all')}
                                                    >
                                                        {t("dialogsShowAll") || "Показать все диалоги"}
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
                                title={t("dialogsViewTitle") || "Просмотр диалога"}
                                open={isModalOpen}
                                onCancel={handleCloseModal}
                                footer={null}
                                width={900}
                                centered
                                className="dialog-view-modal"
                            >
                                <ViewDialog
                                    dialogId={viewDialog}
                                    target={dialogTarget}
                                    trigger={dialogTrigger}
                                    onClose={handleCloseModal}
                                    onDialogDeleted={handleDialogDeleted}
                                />
                            </Modal>
                        )}

                        {/* Модальное подтверждение пакетного удаления */}
                        <Modal
                            title={<span
                                style={{color: '#ff4d4f'}}><ExclamationCircleOutlined/> {t("dialogsConfirmDeleteTitle") || "Подтверждение удаления"}</span>}
                            open={batchDeleteModalOpen}
                            onCancel={() => setBatchDeleteModalOpen(false)}
                            okText={t("delete") || "Удалить"}
                            cancelText={t("cancel") || "Отмена"}
                            okButtonProps={{danger: true}}
                            onOk={async () => {
                                try {
                                    const result = await DeleteDialogs(selectedDialogs);
                                    if (result && result.status === 'ok') {
                                        // Показать уведомления по каждому удаленному диалогу
                                        selectedDialogs.forEach(id => showNotification(`${t("dialog") || "Диалог"} ${id}`, t("dialogsDeleteSuccess") || 'успешно удалён!'));
                                        // Удаляем из локального состояния
                                        setDialogs(prev => prev.filter(d => !selectedDialogs.includes(d.DialogId)));
                                        // Если открыт просмотр удаленного диалога - закроем
                                        if (selectedDialogs.includes(viewDialog)) {
                                            setIsModalOpen(false);
                                        }
                                        setSelectedDialogs([]);
                                    } else {
                                        const err = result && result.error ? result.error : (t("dialogsDeleteErrorDesc") || 'Не удалось удалить диалоги');
                                        showErrorNotification(t("dialogsDeleteError") || 'Ошибка удаления диалогов', err);
                                    }
                                } catch (err) {
                                    console.error('Ошибка пакетного удаления диалогов:', err);
                                    showErrorNotification(t("dialogsDeleteError") || 'Ошибка удаления диалогов', err?.message || (t("error") || 'Ошибка при удалении диалогов'));
                                } finally {
                                    setBatchDeleteModalOpen(false);
                                }
                            }}
                        >
                            <p>{t("dialogsConfirmDeleteMessage") || "Вы уверены, что хотите удалить выбранные диалоги?"}</p>
                            <p style={{color: '#8c8c8c'}}>{t("dialogsConfirmDeleteNote") || "Это действие нельзя будет отменить."}</p>
                        </Modal>
                    </div>
                </div>

                {/* Панель управления Tour справа - показывается только когда tourPanelVisible = true */}
                {tourPanelVisible && (
                    <div className="tour-controls tour-primary">
                        <div className="tour-controls-header">
                            <PlayCircleOutlined className="tour-controls-icon"/>
                            <h3 className="tour-controls-title">
                                {t("dialogsTourTitle") || "Интерактивный обзор"}
                            </h3>
                            <p className="tour-controls-subtitle">
                                {t("dialogsTourSubtitle") || "Изучите интерфейс статистики диалогов пошагово"}
                            </p>
                        </div>

                        <div className="tour-start-button">
                            <Button
                                type="primary"
                                block
                                size="large"
                                onClick={startTour}
                            >
                                {t("dialogsTourStart") || "🚀 Начать тур"}
                            </Button>
                        </div>

                        {tourVisible && (
                            <div className="tour-progress">
                                <div className="tour-progress-step">
                                    <span className="tour-progress-step-text">
                                        {t("notifTourStep") || "Шаг"} {current + 1} {t("notifTourOf") || "из"} {steps.length}
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
                            <div className="tour-info-title">{t("dialogsTourWhatYouLearn") || "📋 Что вы изучите:"}</div>
                            <ul className="tour-info-list">
                                <li>{t("dialogsTourLearn1") || "Фильтрацию диалогов по типам"}</li>
                                <li>{t("dialogsTourLearn2") || "Переключение режимов просмотра"}</li>
                                <li>{t("dialogsTourLearn3") || "Анализ статистики диалогов"}</li>
                                <li>{t("dialogsTourLearn4") || "Просмотр детальной информации"}</li>
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
                icon={<QuestionCircleOutlined/>}
                tooltip={t("tourFloatButtonTooltip") || "Начать обзор интерфейса"}
                onClick={showTourPanel}
                className="tour-float-button"
            />
        </div>
    );
}
