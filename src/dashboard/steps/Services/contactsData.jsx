import {useEffect, useState} from "react";
import {validateAndRefreshToken} from "../../../utils/easyUtils";
import {
    deleteServiceContact,
    readServiceContactsData,
    saveServiceContactsData,
    deleteAllServiceContact,
} from "./serviceUtils";
import "../../steps.css";
import "../../../dashboard/steps/CreateModel.css";
import {message, Spin, Button, Table, Badge, Modal, Form, Input, Upload} from 'antd';
import {ContactsOutlined, PlusOutlined, DeleteOutlined, ExclamationCircleOutlined, UploadOutlined, MessageOutlined} from "@ant-design/icons";
import {showErrorNotification, showNotification} from "../../hotification/showNotification";
import {ServiceViewDialogHistory} from "./ServiceViewDialogHistory";

const CONTACT_STATUSES = {
    unprocessed: { label: 'Не обработан', color: 'default' },
    processed: { label: 'Обработан', color: 'blue' },
    absent: { label: 'Отсутствует', color: 'orange' },
    unanswered: { label: 'Не ответил', color: 'volcano' },
    answered: { label: 'Ответил', color: 'green' },
    success: { label: 'Успешно', color: 'cyan' },
    banned: { label: 'Заблокирован', color: 'red' },
    blocked: { label: 'Заблокировал', color: 'magenta' },
    other: { label: 'Другое', color: 'purple' }
};

export function ServiceContactsData() {
    const [contacts, setContactsData] = useState(null);
    const [loading, setLoading] = useState(true);
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

    useEffect(() => {
        const loadContactsData = async () => {
            const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
            if (!token) {
                message.error('Ошибка аутентификации');
                setContactsData(null);
                setLoading(false);
                return;
            }
            try {
                const data = await readServiceContactsData(token);
                if (data && Array.isArray(data) && data.length > 0) {
                    setContactsData(data);
                } else {
                    setContactsData([]);
                }
            } catch (e) {
                message.error('Ошибка загрузки данных контактов');
                setContactsData([]);
            } finally {
                setLoading(false);
            }
        };

        loadContactsData();
    }, []);

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
                message.warning('Такой контакт уже существует');
                return;
            }

            // Добавляем контакт в таблицу
            setContactsData(prevContacts => [
                ...(prevContacts || []),
                { Contact: normalizedContact, Result: 'unprocessed' }
            ]);

            setIsAddModalOpen(false);
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
            message.error('Не выбран контакт для удаления');
            return;
        }

        const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
        if (!token) {
            message.error('Ошибка аутентификации');
            setIsDeleteModalOpen(false);
            setSelectedContact(null);
            return;
        }

        setLoading(true);

        try {
            // Удаляем контакт на сервере
            const result = await deleteServiceContact(token, selectedContact.Contact);

            if (result) {
                // Удаляем контакт из локального состояния только после успешного удаления на сервере
                setContactsData(prevContacts =>
                    prevContacts.filter(c => c.Contact !== selectedContact.Contact)
                );

                showNotification(`Контакт ${selectedContact.Contact} удален`);
            } else {
                showErrorNotification('Ошибка удаления контакта на сервере');
            }
        } catch (error) {
            console.error('Ошибка при удалении контакта:', error);
            showErrorNotification('Ошибка удаления контакта');
        } finally {
            setLoading(false);
            setIsDeleteModalOpen(false);
            setSelectedContact(null);
        }
    };

    const handleDeleteAll = () => {
        if (!contacts || contacts.length === 0) {
            message.warning('Список контактов пуст');
            return;
        }
        setIsDeleteAllModalOpen(true);
    };

    const handleDeleteAllConfirm = async () => {
        const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
        if (!token) {
            message.error('Ошибка аутентификации');
            setIsDeleteAllModalOpen(false);
            return;
        }

        setLoading(true);

        try {
            // Удаляем все контакты на сервере
            const result = await deleteAllServiceContact(token);

            if (result) {
                // Очищаем список контактов только после успешного удаления на сервере
                setContactsData([]);
                showNotification('Все контакты удалены');
            } else {
                showErrorNotification('Ошибка удаления всех контактов на сервере');
            }
        } catch (error) {
            console.error('Ошибка при удалении всех контактов:', error);
            showErrorNotification('Ошибка удаления всех контактов');
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
                message.error('Файл пустой или не содержит контактов');
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
        return false; // Предотвращаем автоматическую загрузку
    };

    const handleConfirmUpload = async () => {
        // Фильтруем только валидные контакты
        const validContacts = previewContacts.filter(c => c.isValid);

        if (validContacts.length === 0) {
            message.warning('Нет валидных контактов для добавления');
            setIsPreviewModalOpen(false);
            return;
        }

        // Добавляем контакты в локальное состояние
        setContactsData(prevContacts => [
            ...(prevContacts || []),
            ...validContacts.map(c => ({ Contact: c.Contact, Result: c.Result }))
        ]);

        message.success(`Успешно добавлено ${validContacts.length} контактов`);
        setIsPreviewModalOpen(false);
        setPreviewContacts([]);
    };

    const handleSaveChanges = () => {
        setIsSaveModalOpen(true);
    };

    const handleSaveConfirm = async () => {
        const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
        if (!token) {
            message.error('Ошибка аутентификации');
            setIsSaveModalOpen(false);
            return;
        }

        setLoading(true);

        try {
            const res = await saveServiceContactsData(token, contacts);

            if (res) {
                showNotification("Данные контактов успешно сохранены");
                setIsSaveModalOpen(false);
            } else {
                showErrorNotification("Ошибка сохранения данных контактов");
            }
        } catch (e) {
            console.error('Ошибка сохранения:', e);
            showErrorNotification("Ошибка сохранения данных контактов");
        } finally {
            setLoading(false);
        }
    };

    const handleViewHistory = (contact) => {
        setHistoryContact(contact);
        setIsHistoryModalOpen(true);
    };

    const handleCloseHistoryModal = () => {
        setIsHistoryModalOpen(false);
        setHistoryContact(null);
    };

    const validateContact = (contact) => {
        // Проверка на телефон (цифры, может начинаться с +)
        const phoneRegex = /^[+]?[0-9]{10,15}$/;
        // Проверка на username (начинается с @, от 5 до 32 символов)
        const usernameRegex = /^@[a-zA-Z0-9_]{5,32}$/;

        return phoneRegex.test(contact) || usernameRegex.test(contact);
    };

    // Функция нормализации контакта для сравнения и хранения
    const normalizeContact = (contact) => {
        // Если это телефон (начинается с + или содержит только цифры), убираем +
        if (/^[+]?[0-9]+$/.test(contact)) {
            return contact.replace(/^\+/, '');
        }
        // Для username возвращаем как есть
        return contact;
    };

    const columns = [
        {
            title: '#',
            key: 'index',
            width: 60,
            render: (text, record, index) => (currentPage - 1) * pageSize + index + 1,
        },
        {
            title: 'Контакт',
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
            title: 'Статус',
            width: 150,
            dataIndex: 'Result',
            key: 'Result',
            render: (status) => {
                const statusInfo = CONTACT_STATUSES[status] || CONTACT_STATUSES.other;
                return <Badge color={statusInfo.color} text={statusInfo.label} />;
            },
        },
        {
            title: 'Дата добавления',
            dataIndex: 'Added',
            key: 'Added',
            width: 150,
            render: (date) => date || '-',
        },
        {
            title: 'Дата обновления',
            dataIndex: 'Updated',
            key: 'Updated',
            width: 150,
            render: (date) => date || '-',
        },
        {
            title: 'Действия',
            key: 'actions',
            width: 120,
            render: (text, record) => (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {record.Result === 'answered' && (
                        <MessageOutlined
                            style={{
                                color: '#1890ff',
                                cursor: 'pointer',
                                fontSize: '16px'
                            }}
                            onClick={() => handleViewHistory(record)}
                            title="Просмотр истории диалога"
                        />
                    )}
                    <DeleteOutlined
                        style={{
                            color: '#ff4d4f',
                            cursor: 'pointer',
                            fontSize: '16px'
                        }}
                        onClick={() => handleDeleteContact(record)}
                        title="Удалить контакт"
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
                    <div className="loading-text">Загрузка данных...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="create-model-container">
            <div className="section-title create-model-header">
                <ContactsOutlined />
                Управление контактами сервиса
                {contacts && contacts.length > 0 && (
                    <div className="status-indicator success">
                        <span>✓ Контактов: {contacts.length}</span>
                    </div>
                )}
            </div>
            <div className="section-description">
                Просмотр и управление контактами, обработанными сервисом
            </div>

            {/* Кнопка добавления */}
            <div style={{ marginBottom: 16, display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    size="large"
                    onClick={handleAddContact}
                >
                    Добавить контакт
                </Button>
                <Upload
                    accept=".txt,.csv"
                    beforeUpload={handleFileUpload}
                    showUploadList={false}
                >
                    <Button
                        icon={<UploadOutlined />}
                        size="large"
                    >
                        Загрузить список контактов
                    </Button>
                </Upload>
                <Button
                    danger
                    icon={<DeleteOutlined />}
                    size="large"
                    onClick={handleDeleteAll}
                    disabled={!contacts || contacts.length === 0}
                >
                    Удалить все контакты
                </Button>
                <Button
                    type="primary"
                    size="large"
                    onClick={handleSaveChanges}
                    style={{ marginLeft: 'auto' }}
                >
                    Сохранить изменения
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
                    rowClassName="compact-row"
                />
            ) : (
                <div className="form-section model-name-section" style={{ textAlign: 'center', padding: '40px' }}>
                    <ContactsOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
                    <div className="section-title">Контактов пока нет</div>
                    <div className="section-description">
                        Добавьте первый контакт, нажав кнопку "Добавить контакт"
                    </div>
                </div>
            )}

            {/* Модальное окно добавления контакта */}
            <Modal
                title={
                    <span>
                        <PlusOutlined /> Добавить новый контакт
                    </span>
                }
                open={isAddModalOpen}
                onCancel={() => setIsAddModalOpen(false)}
                onOk={handleAddConfirm}
                okText="Добавить"
                cancelText="Отмена"
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
                        label="Контакт"
                        rules={[
                            {
                                required: true,
                                message: 'Пожалуйста, введите контакт!',
                            },
                            {
                                validator: (_, value) => {
                                    if (!value) return Promise.resolve();

                                    const trimmedValue = value.trim();

                                    if (validateContact(trimmedValue)) {
                                        return Promise.resolve();
                                    }

                                    return Promise.reject(
                                        new Error('Неверный формат! Введите номер телефона (10-15 цифр, с + или без) или Telegram username (начинается с @, 5-32 символа)')
                                    );
                                },
                            },
                        ]}
                    >
                        <Input
                            placeholder="Телефон или @username"
                            size="large"
                        />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Модальное окно удаления контакта */}
            <Modal
                title={
                    <span style={{ color: '#ff4d4f' }}>
                        <ExclamationCircleOutlined /> Подтверждение удаления
                    </span>
                }
                open={isDeleteModalOpen}
                onCancel={() => {
                    setIsDeleteModalOpen(false);
                    setSelectedContact(null);
                }}
                onOk={handleDeleteConfirm}
                okText="Удалить"
                cancelText="Отмена"
                okButtonProps={{ danger: true }}
            >
                <p>
                    Вы уверены, что хотите удалить контакт{' '}
                    <strong>{selectedContact?.Contact}</strong>?
                </p>
                <p style={{ color: '#8c8c8c' }}>
                    Это действие нельзя будет отменить.
                </p>
            </Modal>

            {/* Модальное окно удаления всех контактов */}
            <Modal
                title={
                    <span style={{ color: '#ff4d4f' }}>
                        <ExclamationCircleOutlined /> Подтверждение удаления всех контактов
                    </span>
                }
                open={isDeleteAllModalOpen}
                onCancel={() => setIsDeleteAllModalOpen(false)}
                onOk={handleDeleteAllConfirm}
                okText="Удалить все"
                cancelText="Отмена"
                okButtonProps={{ danger: true }}
            >
                <p>
                    Вы уверены, что хотите удалить все контакты?
                </p>
                <p style={{ color: '#8c8c8c' }}>
                    Это действие нельзя будет отменить. <b>Это так же удалит всю историю диалогов</b> для контактов статус которых отличен от "Не обработан".
                </p>
            </Modal>

            {/* Модальное окно превью контактов из файла */}
            <Modal
                title={
                    <span>
                        <UploadOutlined /> Предварительный просмотр контактов
                    </span>
                }
                open={isPreviewModalOpen}
                onCancel={() => setIsPreviewModalOpen(false)}
                footer={null}
                width={600}
            >
                <div style={{ padding: '16px 24px' }}>
                    <div style={{ marginBottom: 16 }}>
                        <strong>Статистика загрузки:</strong>
                    </div>
                    <div>
                        Всего контактов: {uploadStats.total} <br />
                        Валидных: {uploadStats.valid} <br />
                        Невалидных: {uploadStats.invalid} <br />
                        Дубликатов: {uploadStats.duplicates}
                    </div>

                    <div style={{ marginTop: 24, marginBottom: 16 }}>
                        <strong>Предварительный просмотр:</strong>
                    </div>

                    {/* Таблица превью контактов */}
                    <Table
                        columns={[
                            {
                                title: 'Контакт',
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
                                title: 'Статус',
                                dataIndex: 'Result',
                                key: 'Result',
                                render: (status, record) => {
                                    if (!record.isValid) {
                                        return <Badge color="red" text="Невалидный формат" />;
                                    }
                                    const statusInfo = CONTACT_STATUSES[status] || CONTACT_STATUSES.other;
                                    return <Badge color={statusInfo.color} text={statusInfo.label} />;
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
                            Подтвердить загрузку
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Модальное окно подтверждения сохранения */}
            <Modal
                title={
                    <span>
                        <ExclamationCircleOutlined /> Подтверждение сохранения
                    </span>
                }
                open={isSaveModalOpen}
                onCancel={() => setIsSaveModalOpen(false)}
                onOk={handleSaveConfirm}
                okText="Сохранить"
                cancelText="Отмена"
                okButtonProps={{ style: { color: "black" } }}
            >
                <p>
                    Вы уверены, что хотите сохранить изменения?
                </p>
                <p style={{ color: '#8c8c8c' }}>
                    Это действие нельзя будет отменить.
                </p>
            </Modal>

            {/* Модальное окно просмотра истории диалога */}
            <ServiceViewDialogHistory
                contact={historyContact}
                visible={isHistoryModalOpen}
                onClose={handleCloseHistoryModal}
            />
        </div>
    );
}
