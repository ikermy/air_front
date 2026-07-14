import {useEffect, useState, useCallback, forwardRef, useImperativeHandle} from "react";
import {
    deleteServiceContact,
    readServiceContactsData,
    saveServiceContactsData,
    deleteAllServiceContacts,
} from "./leadUtils";
import "../../../steps.css";
import "../../CreateModel.css";
import {message, Spin, Button, Table, Badge, Modal, Form, Input, Upload, Row, Col, Card, Space, Typography, Tooltip} from 'antd';
import {ContactsOutlined, PlusOutlined, DeleteOutlined, ExclamationCircleOutlined, UploadOutlined, MessageOutlined, SaveOutlined, CheckCircleOutlined} from "@ant-design/icons";
import {showErrorNotification, showNotification} from "../../../hotification/showNotification";
import {LeadViewDialog} from "./leadViewDialog";
import {useTranslation} from "react-i18next";
import { getAuthToken } from "../../../../utils/easyUtils";

const { Text } = Typography;

const CONTACT_STATUSES = {
    unprocessed: { labelKey: 'contactStatusUnprocessed', color: 'default' },
    processed: { labelKey: 'contactStatusProcessed', color: 'blue' },
    absent: { labelKey: 'contactStatusAbsent', color: 'orange' },
    unanswered: { labelKey: 'contactStatusUnanswered', color: 'volcano' },
    answered: { labelKey: 'contactStatusAnswered', color: 'green' },
    success: { labelKey: 'contactStatusSuccess', color: 'cyan' },
    banned: { labelKey: 'contactStatusBanned', color: 'red' },
    blocked: { labelKey: 'contactStatusBlocked', color: 'magenta' },
    other: { labelKey: 'contactStatusOther', color: 'purple' }
};

export const ServiceContactsData = forwardRef(function ServiceContactsData(props, ref) {
     const { t } = useTranslation();
     const [contacts, setContactsData] = useState(null);
     const [initialContacts, setInitialContacts] = useState(null);
     const [loading, setLoading] = useState(true);
     const [hasChanges, setHasChanges] = useState(false);
     const [isAddModalOpen, setIsAddModalOpen] = useState(false);
     const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
     const [selectedContact, setSelectedContact] = useState(null);
     const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
     const [previewContacts, setPreviewContacts] = useState([]);
     const [uploadStats, setUploadStats] = useState({ total: 0, valid: 0, invalid: 0, duplicates: 0 });
     const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
     const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
     const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
     const [historyContact, setHistoryContact] = useState(null);
     const [pageSize, setPageSize] = useState(20);
     const [currentPage, setCurrentPage] = useState(1);
     const [form] = Form.useForm();

    // Функция для сравнения двух списков контактов
    const compareContacts = useCallback((contacts1, contacts2) => {
        if (!contacts1 && !contacts2) return true;
        if (!contacts1 || !contacts2) return false;
        if (contacts1.length !== contacts2.length) return false;

        // Создаем Set из нормализованных контактов для сравнения
        const set1 = new Set(contacts1.map(c => normalizeContact(c.Contact)));
        const set2 = new Set(contacts2.map(c => normalizeContact(c.Contact)));

        if (set1.size !== set2.size) return false;

        for (let contact of set1) {
            if (!set2.has(contact)) return false;
        }

        return true;
    }, []);

    // useEffect для отслеживания изменений
    useEffect(() => {
        const changed = !compareContacts(contacts, initialContacts);
        setHasChanges(changed);
    }, [contacts, initialContacts, compareContacts]);

    // Функция перезагрузки контактов — вынесена и доступна родителю
    const refreshContacts = useCallback(async () => {
        setLoading(true);
        try {
            const token = getAuthToken();
            if (!token) {
                console.error("Token not found");
                setLoading(false);
                return;
            }

            const data = await readServiceContactsData(token);

            if (data && Array.isArray(data)) {
                // Сортируем: сначала по дате добавления (старые -> новые), контакты без даты в конце
                const sortedData = [...data].sort((a, b) => {
                    if (!a.Added && !b.Added) return 0;
                    if (!a.Added) return 1;
                    if (!b.Added) return -1;
                    return new Date(a.Added) - new Date(b.Added);
                });

                // Для контактов начинающихся с @ автоматически устанавливаем HasTelegram
                const enrichedData = sortedData.map(contact => ({
                    ...contact,
                    HasTelegram: contact.Contact?.startsWith('@') ? true : contact.HasTelegram
                }));

                setContactsData(enrichedData);
                setInitialContacts(enrichedData);
            } else {
                setContactsData([]);
                setInitialContacts([]);
            }
        } catch (e) {
            message.error(t('contactsLoadError') || 'Ошибка загрузки данных контактов');
            setContactsData([]);
            setInitialContacts([]);
        } finally {
            setLoading(false);
        }
    }, [t]);

    // Экспортируем метод refreshContacts родителю через ref
    useImperativeHandle(ref, () => ({
        refreshContacts
    }), [refreshContacts]);

    // Вызываем загрузку при монтировании
    useEffect(() => {
        refreshContacts();
    }, [refreshContacts]);

    // Функция нормализации контакта для сравнения и хранения
    const normalizeContact = (contact) => {
        if (contact == null) return '';
        const s = String(contact).trim();
        // Если это телефон (только цифры, может начинаться с +) — убираем ведущий +
        if (/^[+]?[0-9]+$/.test(s)) {
            return s.replace(/^\+/, '');
        }
        // Для username приводим к нижнему регистру и сохраняем ведущий @
        if (s.startsWith('@')) {
            return '@' + s.slice(1).toLowerCase();
        }
        // Возвращаем строку в нижнем регистре для прочих случаев
        return s.toLowerCase();
    };

    const validateContact = (contact) => {
        // Проверка на телефон (цифры, может начинаться с +)
        const phoneRegex = /^[+]?[0-9]{10,15}$/;
        // Проверка на username (начинается с @, от 5 до 32 символов)
        const usernameRegex = /^@[a-zA-Z0-9_]{5,32}$/;

        return phoneRegex.test(contact) || usernameRegex.test(contact);
    };

    const handleAddContact = () => {
        form.resetFields();
        setIsAddModalOpen(true);
    };

    const handleAddConfirm = async () => {
        try {
            const values = await form.validateFields();
            const contactValue = values.Contact.trim();

            // Нормализуем контакт
            const normalizedContact = normalizeContact(contactValue);

            // Проверяем на дубликаты
            const isDuplicate = contacts?.some(c => normalizeContact(c.Contact) === normalizedContact);

            if (isDuplicate) {
                // Показать ошибку на поле и предупреждение
                form.setFields([
                    { name: 'Contact', errors: [t('contactAlreadyExists') || 'Контакт уже существует в списке'] }
                ]);
                message.warning(t('contactAlreadyExistsMsg', { contact: contactValue }) || `Контакт "${contactValue}" уже существует в списке.`);
                return;
            }

            // Добавляем контакт в таблицу
            const newContact = {
                Contact: normalizedContact,
                Result: 'unprocessed',
                Added: null,
                Updated: null,
                isNew: true
            };

            setContactsData(prevContacts => [
                ...(prevContacts || []),
                newContact
            ]);

            setIsAddModalOpen(false);
            message.success(t('contactAdded', { contact: contactValue }) || `Контакт "${contactValue}" добавлен`);
        } catch (error) {
            console.error('Ошибка валидации:', error);
        }
    };

    const handleDeleteContact = (contact) => {
        setSelectedContact(contact);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!selectedContact) {
            message.error(t('contactNotSelected') || 'Не выбран контакт для удаления');
            return;
        }

        // Если контакт ещё не сохранён на сервере (нет даты добавления) — удаляем локально без запроса
        if (!selectedContact.Added) {
            const updatedContacts = (contacts || []).filter(c => normalizeContact(c.Contact) !== normalizeContact(selectedContact.Contact));
            setContactsData(updatedContacts);
            setInitialContacts(updatedContacts); // ← Обновляем initialContacts при удалении
            showNotification(t('contactDeletedFromList', { contact: selectedContact.Contact }) || `Контакт ${selectedContact.Contact} удален из списка`);
            setIsDeleteModalOpen(false);
            setSelectedContact(null);
            return;
        }

        setLoading(true);

        try {
            // Удаляем контакт на сервере
            const result = await deleteServiceContact(selectedContact.Contact);

            if (result) {
                // Удаляем контакт из локального состояния и initialContacts после успешного удаления на сервере
                const updatedContacts = contacts.filter(c => c.Contact !== selectedContact.Contact);
                setContactsData(updatedContacts);
                setInitialContacts(updatedContacts); // ← Обновляем initialContacts при удалении

                showNotification(t('contactDeleted', { contact: selectedContact.Contact }) || `Контакт ${selectedContact.Contact} удален`);
            } else {
                showErrorNotification(t('contactDeleteServerError') || 'Ошибка удаления контакта на сервере');
            }
        } catch (error) {
            console.error('Ошибка при удалении контакта:', error);
            showErrorNotification(t('contactDeleteError') || 'Ошибка удаления контакта');
        } finally {
            setLoading(false);
            setIsDeleteModalOpen(false);
            setSelectedContact(null);
        }
    };

    const handleDeleteAll = () => {
        if (!contacts || contacts.length === 0) {
            message.warning(t('contactsListEmpty') || 'Список контактов пуст');
            return;
        }
        setIsDeleteAllModalOpen(true);
    };

    const handleDeleteAllConfirm = async () => {
        setLoading(true);

        try {
            // Удаляем все контакты на сервере
            const result = await deleteAllServiceContacts();

            if (result) {
                // Очищаем список контактов только после успешного удаления на сервере
                setContactsData([]);
                setInitialContacts([]); // ← Обновляем initialContacts при удалении всех контактов
                showNotification(t('allContactsDeleted') || 'Все контакты удалены');
            } else {
                showErrorNotification(t('allContactsDeleteServerError') || 'Ошибка удаления всех контактов на сервере');
            }
        } catch (error) {
            console.error('Ошибка при удалении всех контактов:', error);
            showErrorNotification(t('allContactsDeleteError') || 'Ошибка удаления всех контактов');
        } finally {
            setLoading(false);
            setIsDeleteAllModalOpen(false);
        }
    };

    const handleFileUpload = (file) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const text = e.target.result;
            // Разбиваем на строки и очищаем
            const lines = text.split(/\r?\n/)
                .map(line => line.trim())
                .filter(line => line.length > 0);

            if (lines.length === 0) {
                message.error(t('fileEmptyError') || 'Файл пустой или не содержит контактов');
                return;
            }

            // Создаем Set существующих контактов (нормализованных) для быстрой проверки дубликатов
            const existingContactsSet = new Set(
                (contacts || []).map(c => normalizeContact(c.Contact))
            );

            // Обрабатываем каждую строку
            const validContacts = [];
            const invalidContacts = [];
            let duplicatesCount = 0;

            lines.forEach(line => {
                const normalizedLine = normalizeContact(line);

                if (existingContactsSet.has(normalizedLine)) {
                    duplicatesCount++;
                } else if (validateContact(line)) {
                    validContacts.push({
                        Contact: normalizedLine, // Сохраняем нормализованный контакт (без +)
                        Result: 'unprocessed',
                        isValid: true
                    });
                    // Добавляем в Set, чтобы избежать дубликатов внутри загружаемого файла
                    existingContactsSet.add(normalizedLine);
                } else {
                    invalidContacts.push({
                        Contact: line,
                        Result: 'unprocessed',
                        isValid: false
                    });
                }
            });

            // Статистика
            const stats = {
                total: lines.length,
                valid: validContacts.length,
                invalid: invalidContacts.length,
                duplicates: duplicatesCount
            };

            setUploadStats(stats);
            setPreviewContacts([...validContacts, ...invalidContacts]);
            setIsPreviewModalOpen(true);
        };

        reader.onerror = () => {
            message.error('Ошибка чтения файла');
        };

        reader.readAsText(file);
        return false; // Предотвращаем автоматическую загрузка
    };

    const handleConfirmUpload = async () => {
        // Фильтруем только валидные контакты
        const validContacts = previewContacts.filter(c => c.isValid);

        if (validContacts.length === 0) {
            message.warning(t('noValidContactsError') || 'Нет валидных контактов для добавления');
            setIsPreviewModalOpen(false);
            return;
        }

        // Добавляем контакты в локальное состояние
        setContactsData(prevContacts => [
            ...(prevContacts || []),
            ...validContacts.map(c => ({ Contact: c.Contact, Result: c.Result, isNew: true }))
        ]);

        message.success(t('contactsAddedSuccess', { count: validContacts.length }) || `Успешно добавлено ${validContacts.length} контактов`);
        setIsPreviewModalOpen(false);
        setPreviewContacts([]);
    };

    const handleSaveChanges = () => {
        setIsSaveModalOpen(true);
    };

    const handleViewHistory = (contact) => {
        setHistoryContact(contact);
        setIsHistoryModalOpen(true);
    };

    const handleCloseHistoryModal = () => {
        setIsHistoryModalOpen(false);
        setHistoryContact(null);
    };

    const handleSaveConfirm = async () => {
        setLoading(true);
        try {
            // Сначала сохраняем контакты на сервере
            const res = await saveServiceContactsData(contacts);
            if (res) {
                showNotification(t('contactsSaveSuccess') || 'Данные контактов успешно сохранены');
                setIsSaveModalOpen(false);

                // Перезагружаем обновлённый список с сервера
                const data = await readServiceContactsData();
                if (data && Array.isArray(data) && data.length > 0) {
                    // Сортируем: сначала по дате добавления (старые -> новые), контакты без даты в конце
                    const sortedData = [...data].sort((a, b) => {
                        if (!a.Added && !b.Added) return 0;
                        if (!a.Added) return 1;
                        if (!b.Added) return -1;
                        return new Date(a.Added) - new Date(b.Added);
                    });
                    setContactsData(sortedData);
                    setInitialContacts(sortedData);
                } else {
                    setContactsData([]);
                    setInitialContacts([]);
                }
                setHasChanges(false);
            } else {
                showErrorNotification(t('contactsSaveError') || 'Ошибка сохранения данных контактов');
            }
        } catch (e) {
            console.error('Ошибка сохранения:', e);
            showErrorNotification(t('contactsSaveError') || 'Ошибка сохранения данных контактов');
        } finally {
            setLoading(false);
        }
    };

    // Функция для определения классов строки на основе HasTelegram и HasWhatsApp
    const getContactRowClasses = (record) => {
        const classes = ['compact-row'];

        // Используем существующие классы ботов
        if (record.HasTelegram) {
            classes.push('bot-row-telegram');
        }
        if (record.HasWhatsApp) {
            classes.push('bot-row-whatsapp');
        }

        return classes.join(' ');
    };

    const columns = [
        {
            title: '#',
            key: 'index',
            width: 70,
            render: (text, record, index) => {
                const number = (currentPage - 1) * pageSize + index + 1;

                // Если контакт имеет провайдеров, показываем полоску слева
                if (record.HasTelegram || record.HasWhatsApp) {
                    // Определяем цвет полоски
                    let polosaColor;
                    let polosaTitle;

                    if (record.HasTelegram && record.HasWhatsApp) {
                        // Двухцветная полоска
                        polosaColor = 'linear-gradient(to bottom, rgba(24, 144, 255, 0.7) 0%, rgba(24, 144, 255, 0.7) 49.9%, rgba(82, 196, 26, 0.7) 50%, rgba(82, 196, 26, 0.7) 100%)';
                        polosaTitle = 'Telegram ' + (t('and') || 'и') + ' WhatsApp';
                    } else if (record.HasTelegram) {
                        // Синяя полоска для Telegram
                        polosaColor = 'rgba(24, 144, 255, 0.7)';
                        polosaTitle = 'Telegram';
                    } else {
                        // Зелёная полоска для WhatsApp
                        polosaColor = 'rgba(82, 196, 26, 0.7)';
                        polosaTitle = 'WhatsApp';
                    }

                    return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '-8px', paddingLeft: '8px' }}>
                            <div style={{
                                background: polosaColor,
                                width: '5px',
                                height: '24px',
                                borderRadius: '2px',
                                flexShrink: 0
                            }} title={polosaTitle} />
                            <span>{number}</span>
                        </div>
                    );
                }

                return <span>{number}</span>;
            },
        },
        {
            title: t('contact') || 'Контакт',
            dataIndex: 'Contact',
            key: 'Contact',
            render: (contact, record) => {
                const isViewable = record.Result === 'answered' || record.Result === 'success';
                return (
                    <strong
                        style={{
                            cursor: isViewable ? 'pointer' : 'default',
                            color: isViewable ? '#1890ff' : 'inherit',
                            textDecoration: isViewable ? 'underline' : 'none'
                        }}
                        onClick={() => isViewable && handleViewHistory(record)}
                    >
                        {contact}
                    </strong>
                );
            },
        },
        {
            title: t('status') || 'Статус',
            width: 150,
            dataIndex: 'Result',
            key: 'Result',
            render: (status) => {
                const statusInfo = CONTACT_STATUSES[status] || CONTACT_STATUSES.other;
                const label = t(statusInfo.labelKey) || statusInfo.labelKey;
                return <Badge color={statusInfo.color} text={label} />;
            },
        },
        {
            title: t('dateAdded') || 'Дата добавления',
            dataIndex: 'Added',
            key: 'Added',
            width: 150,
            render: (date) => date || '-',
        },
        {
            title: t('dateUpdated') || 'Дата обновления',
            dataIndex: 'Updated',
            key: 'Updated',
            width: 150,
            render: (date) => date || '-',
        },
        {
            title: t('actions') || 'Действия',
            key: 'actions',
            width: 120,
            render: (record) => (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {(record.Result === 'answered' || record.Result === 'success') && (
                        <MessageOutlined
                            style={{
                                color: '#1890ff',
                                cursor: 'pointer',
                                fontSize: '16px'
                            }}
                            onClick={() => handleViewHistory(record)}
                            title={t('viewHistory') || 'Просмотр истории диалога'}
                        />
                    )}
                    <DeleteOutlined
                        style={{
                            color: '#ff4d4f',
                            cursor: 'pointer',
                            fontSize: '16px'
                        }}
                        onClick={() => handleDeleteContact(record)}
                        title={t('deleteContact') || 'Удалить контакт'}
                    />
                </div>
            ),
        }
    ];

    if (loading) {
        return (
            <div className="create-model-container">
                <div className="loading-container">
                    <Spin size="large" />
                    <div className="loading-text">{t('loadingData') || 'Загрузка данных...'}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="create-model-container">
            <div className="section-title create-model-header">
                <ContactsOutlined />
                {t('serviceContactsManagement') || 'Управление контактами сервиса'}
                {contacts && contacts.length > 0 && (
                    <div className="status-indicator success">
                        <span>✓ {t('contactsCount', { count: contacts.length }) || `Контактов: ${contacts.length}`}</span>
                    </div>
                )}
            </div>
            <div className="section-description">
                {t('serviceContactsManagementDesc') || 'Просмотр и управление контактами, обработанными сервисом'}
            </div>

            {/* Кнопка добавления */}
            <div style={{ marginBottom: 16, display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    size="large"
                    onClick={handleAddContact}
                >
                    {t('addContact') || 'Добавить контакт'}
                </Button>
                <Upload
                    accept=".txt,.csv"
                    beforeUpload={handleFileUpload}
                    showUploadList={false}
                >
                    <Tooltip title={
                        <div style={{ fontSize: '12px', lineHeight: '1.5' }}>
                            <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>{t('contactExamples') || 'Примеры контактов:'}</div>
                            <div style={{ marginLeft: '12px', color: '#aaa' }}>
                                +79991234567<br/>
                                89991234567<br/>
                                +1-555-0123<br/>
                                +34-91-123-4567<br/>
                                @hello_world_123<br/>
                                @john.doe.2024
                            </div>
                        </div>
                    }>
                        <Button
                            icon={<UploadOutlined />}
                            size="large"
                        >
                            {t('uploadContactsList') || 'Загрузить список контактов'}
                        </Button>
                    </Tooltip>
                </Upload>
                <Button
                    danger
                    icon={<DeleteOutlined />}
                    size="large"
                    onClick={handleDeleteAll}
                    disabled={!contacts || contacts.length === 0}
                >
                    {t('deleteAllContacts') || 'Удалить все контакты'}
                </Button>
            </div>

            {/* Таблица контактов */}
            {contacts && contacts.length > 0 ? (
                <Table
                    columns={columns}
                    dataSource={contacts}
                    rowKey={(record, index) => `${record.Contact}-${index}`}
                    pagination={{
                        current: currentPage,
                        pageSize: pageSize,
                        showSizeChanger: true,
                        pageSizeOptions: ['10', '20', '50', '100'],
                        total: contacts.length,
                        onChange: (page, pageSize) => {
                            setCurrentPage(page);
                            setPageSize(pageSize);
                        },
                    }}
                    bordered
                    size="small"
                    rowClassName={getContactRowClasses}
                />
            ) : (
                <div className="form-section model-name-section" style={{ textAlign: 'center', padding: '40px' }}>
                    <ContactsOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
                    <div className="section-title">{t('noContactsYet') || 'Контактов пока нет'}</div>
                    <div className="section-description">
                        {t('addFirstContactDesc') || 'Добавьте первый контакт, нажав кнопку "Добавить контакт"'}
                    </div>
                </div>
            )}

            {/* Кнопка сохранения с уведомлением */}
            <Card
                style={{
                    marginTop: 24,
                    borderLeft: hasChanges ? '4px solid #faad14' : 'none'
                }}
            >
                <Row align="middle" justify="space-between">
                    <Col>
                        <Space>
                            {hasChanges ? (
                                <>
                                    <ExclamationCircleOutlined style={{ color: '#faad14', fontSize: 18 }} />
                                    <Text strong>{t('changesNotSaved') || 'Изменения не сохранены'}</Text>
                                </>
                            ) : (
                                <>
                                    <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />
                                    <Text style={{ color: 'var(--text-color)' }} type="secondary">{t('allChangesSaved') || 'Все изменения сохранены'}</Text>
                                </>
                            )}
                        </Space>
                    </Col>
                    <Col>
                        <Button
                            type="primary"
                            size="large"
                            icon={<SaveOutlined />}
                            onClick={handleSaveChanges}
                            disabled={!hasChanges}
                            style={{ color: hasChanges ? 'black' : undefined }}
                        >
                            {t('saveChanges') || 'Сохранить изменения'}
                        </Button>
                    </Col>
                </Row>
            </Card>

            {/* Модальное окно добавления контакта */}
            <Modal
                title={
                    <span>
                        <PlusOutlined /> {t('addNewContact') || 'Добавить новый контакт'}
                    </span>
                }
                open={isAddModalOpen}
                onCancel={() => setIsAddModalOpen(false)}
                onOk={handleAddConfirm}
                okText={t('addContact') || 'Добавить'}
                cancelText={t('proxyUploadCancel') || 'Отмена'}
                width={500}
                okButtonProps={{ style: { color: "black" } }}
            >
                <Form
                    form={form}
                    layout="vertical"
                    style={{ marginTop: 20 }}
                    onFinish={handleAddConfirm}
                >
                    <Form.Item
                        name="Contact"
                        label={t('contact') || 'Контакт'}
                        rules={[
                            {
                                required: true,
                                message: t('pleaseEnterContact') || 'Пожалуйста, введите контакт!',
                            },
                            {
                                validator: (_, value) => {
                                    if (!value) return Promise.resolve();

                                    const trimmedValue = value.trim();

                                    if (validateContact(trimmedValue)) {
                                        return Promise.resolve();
                                    }

                                    return Promise.reject(
                                        new Error(t('invalidContactFormat') || 'Неверный формат! Введите номер телефона (10-15 цифр, с + или без) или Telegram username (начинается с @, 5-32 символа)')
                                    );
                                },
                            },
                        ]}
                    >
                        <Input
                            placeholder={t('contactPlaceholder') || 'Телефон или @username'}
                            size="large"
                        />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Модальное окно удаления контакта */}
            <Modal
                title={
                    <span style={{ color: '#ff4d4f' }}>
                        <ExclamationCircleOutlined /> {t('deleteConfirmTitle') || 'Подтверждение удаления'}
                    </span>
                }
                open={isDeleteModalOpen}
                onCancel={() => {
                    setIsDeleteModalOpen(false);
                    setSelectedContact(null);
                }}
                onOk={handleDeleteConfirm}
                okText={t('proxyDeleteButton') || 'Удалить'}
                cancelText={t('proxyUploadCancel') || 'Отмена'}
                okButtonProps={{ danger: true }}
            >
                <p>
                    {t('deleteContactConfirm', { contact: selectedContact?.Contact }) || `Вы уверены, что хотите удалить контакт ${selectedContact?.Contact}?`}
                </p>
                <p style={{ color: '#8c8c8c' }}>
                    {t('cannotBeUndone') || 'Это действие нельзя будет отменить.'}
                </p>
            </Modal>

            {/* Модальное окно удаления всех контактов */}
            <Modal
                title={
                    <span style={{ color: '#ff4d4f' }}>
                        <ExclamationCircleOutlined /> {t('deleteAllConfirmTitle') || 'Подтверждение удаления всех контактов'}
                    </span>
                }
                open={isDeleteAllModalOpen}
                onCancel={() => setIsDeleteAllModalOpen(false)}
                onOk={handleDeleteAllConfirm}
                okText={t('proxyDeleteAllButton') || 'Удалить все'}
                cancelText={t('proxyUploadCancel') || 'Отмена'}
                okButtonProps={{ danger: true }}
            >
                <p>
                    {t('deleteAllContactsConfirm') || 'Вы уверены, что хотите удалить все контакты?'}
                </p>
                <p style={{ color: '#8c8c8c' }}>
                    {t('cannotBeUndone') || 'Это действие нельзя будет отменить.'} <b>{t('deleteAllWarning') || 'Это так же удалит всю историю диалогов для контактов статус которых отличен от "Не обработан".'}</b>
                </p>
            </Modal>

            {/* Модальное окно превью контактов из файла */}
            <Modal
                title={
                    <span>
                        <UploadOutlined /> {t('contactsPreview') || 'Предварительный просмотр контактов'}
                    </span>
                }
                open={isPreviewModalOpen}
                onCancel={() => setIsPreviewModalOpen(false)}
                footer={null}
                width={600}
            >
                <div style={{ padding: '16px 24px' }}>
                    <div style={{ marginBottom: 16 }}>
                        <strong>{t('uploadStats') || 'Статистика загрузки:'}</strong>
                    </div>
                    <div>
                        {t('totalContacts', { count: uploadStats.total }) || `Всего контактов: ${uploadStats.total}`} <br />
                        {t('valid') || 'Валидных:'} {uploadStats.valid} <br />
                        {t('invalid') || 'Невалидных:'} {uploadStats.invalid} <br />
                        {t('duplicates') || 'Дубликатов:'} {uploadStats.duplicates}
                    </div>

                    <div style={{ marginTop: 24, marginBottom: 16 }}>
                        <strong>{t('preview') || 'Предварительный просмотр:'}</strong>
                    </div>

                    {/* Таблица превью контактов */}
                    <Table
                        columns={[
                            {
                                title: t('contact') || 'Контакт',
                                dataIndex: 'Contact',
                                key: 'Contact',
                                render: (contact, record) => (
                                    <span style={{ color: record.isValid ? 'inherit' : '#ff4d4f' }}>
                                        <strong>{contact}</strong>
                                        {!record.isValid && ' ⚠️'}
                                    </span>
                                ),
                            },
                            {
                                title: t('status') || 'Статус',
                                dataIndex: 'Result',
                                key: 'Result',
                                render: (status, record) => {
                                    if (!record.isValid) {
                                        return <Badge color="red" text={t('invalidFormat') || 'Невалидный формат'} />;
                                    }
                                    const statusInfo = CONTACT_STATUSES[status] || CONTACT_STATUSES.other;
                                    return <Badge color={statusInfo.color} text={t(statusInfo.labelKey) || statusInfo.labelKey} />;
                                },
                            },
                        ]}
                        dataSource={previewContacts}
                        rowKey={(record, index) => `${record.Contact}-${index}`}
                        pagination={{ pageSize: 10 }}
                        bordered
                        size="small"
                        rowClassName={(record) => record.isValid ? 'compact-row' : 'compact-row invalid-row'}
                        style={{ maxHeight: '300px', overflow: 'auto' }}
                    />

                    <div style={{ marginTop: 16, textAlign: 'right' }}>
                        <Button
                            style={{ color: 'black' }}
                            type="primary"
                            onClick={handleConfirmUpload}
                        >
                            {t('confirmUpload') || 'Подтвердить загрузку'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Модальное окно подтверждения сохранения */}
            <Modal
                title={
                    <span>
                        <ExclamationCircleOutlined /> {t('saveConfirmTitle') || 'Подтверждение сохранения'}
                    </span>
                }
                open={isSaveModalOpen}
                onCancel={() => setIsSaveModalOpen(false)}
                onOk={handleSaveConfirm}
                okText={t('proxySaveButton') || 'Сохранить'}
                cancelText={t('proxyUploadCancel') || 'Отмена'}
                okButtonProps={{ style: { color: "black" } }}
            >
                <p>
                    {t('saveChangesConfirm') || 'Вы уверены, что хотите сохранить изменения?'}
                </p>
                <p style={{ color: '#8c8c8c' }}>
                    {t('cannotBeUndone') || 'Это действие нельзя будет отменить.'}
                </p>
            </Modal>

            {/* Модальное окно просмотра истории диалога */}
            <LeadViewDialog
                contact={historyContact}
                visible={isHistoryModalOpen}
                onClose={handleCloseHistoryModal}
            />
        </div>
    );
});
