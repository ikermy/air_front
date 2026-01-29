import {useEffect, useState, forwardRef, useImperativeHandle} from "react";
import {useTranslation} from 'react-i18next';
import {validateAndRefreshToken} from "../../../../utils/easyUtils";
import {readProxyData, setServiceProxyActive, addServiceProxy, editServiceProxy, deleteServiceProxy, deleteAllServiceProxy} from "./leadUtils";
import "../../../steps.css";
import "../../CreateModel.css";
import {message, Spin, Table, Badge, Switch, Button, Modal, Form, Input, Upload, Tag, Tooltip} from 'antd';
import {CloudServerOutlined, PlusOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined, UploadOutlined} from "@ant-design/icons";
import {showErrorNotification, showNotification} from "../../../hotification/showNotification";

export const LeadProxyData = forwardRef((props, ref) => {
    const { t } = useTranslation();
    const [proxyList, setProxyList] = useState(null);
    const [loading, setLoading] = useState(true);
    const [pageSize, setPageSize] = useState(20);
    const [currentPage, setCurrentPage] = useState(1);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
    const [selectedProxy, setSelectedProxy] = useState(null);
    const [form] = Form.useForm();
    const [uploadStats, setUploadStats] = useState(null);
    const [previewProxies, setPreviewProxies] = useState([]);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [isUploadLoading, setIsUploadLoading] = useState(false);

    const loadProxyData = async () => {
        const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
        if (!token) {
            message.error(t("authError") || 'Ошибка аутентификации');
            setProxyList(null);
            setLoading(false);
            return;
        }
        try {
            const data = await readProxyData(token);

            if (data && Array.isArray(data) && data.length > 0) {
                setProxyList(data);
            } else {
                setProxyList([]);
            }
        } catch (e) {
            message.error(t("proxyLoadError") || 'Ошибка загрузки данных прокси');
            setProxyList([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProxyData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Предоставляем метод обновления данных через ref
    useImperativeHandle(ref, () => ({
        refreshProxyData: () => {
            loadProxyData();
        }
    }));

    // Функция валидации формата прокси (host:port или login:password@host:port)
    const validateProxy = (proxyStr) => {
        const trimmed = proxyStr.trim();

        // Поддерживаемые форматы:
        // 1. host:port (например: 192.168.1.100:8080)
        // 2. login:password@host:port (например: user:pass@192.168.1.100:8080)

        let host, port;

        // Проверяем наличие логина и пароля (формат: login:password@host:port)
        if (trimmed.includes('@')) {
            const [credentialsPart, hostPart] = trimmed.split('@');

            // Проверяем формат credentials (login:password)
            if (!credentialsPart.includes(':')) {
                return false; // Нет двоеточия между логином и паролем
            }

            const [login, password] = credentialsPart.split(':');

            // Валидация логина и пароля
            if (!login || login.length === 0 || login.length > 64) {
                return false; // Логин не должен быть пустым или более 64 символов
            }
            if (!password || password.length === 0 || password.length > 64) {
                return false; // Пароль не должен быть пустым или более 64 символов
            }

            [host, port] = hostPart.split(':');
        } else {
            // Формат без логина и пароля
            [host, port] = trimmed.split(':');
        }

        // Проверяем наличие хоста и порта
        if (!host || !port) {
            return false;
        }

        // Проверяем формат хоста (IP адрес или доменное имя)
        const hostPattern = /^[a-zA-Z0-9.-]+$/;
        if (!hostPattern.test(host)) {
            return false;
        }

        // Проверяем формат порта (только цифры)
        if (!/^\d+$/.test(port)) {
            return false;
        }

        // Проверяем диапазон портов
        const portNum = parseInt(port, 10);
        return portNum > 0 && portNum <= 65535;
    };

    // Функция обработки загрузки файла с прокси
    const handleFileUpload = (file) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const text = e.target.result;
            // Разбиваем на строки и очищаем
            const lines = text.split(/\r?\n/)
                .map(line => line.trim())
                .filter(line => line.length > 0);

            if (lines.length === 0) {
                message.error(t("proxyEmptyFile") || 'Файл пустой или не содержит прокси');
                return;
            }

            // Создаем Set существующих прокси для быстрой проверки дубликатов
            const existingProxiesSet = new Set(
                (proxyList || []).map(p => p.addr.toLowerCase())
            );

            // Обрабатываем каждую строку
            const validProxies = [];
            const invalidProxies = [];
            let duplicatesCount = 0;

            lines.forEach(line => {
                const lowerLine = line.toLowerCase();

                if (existingProxiesSet.has(lowerLine)) {
                    duplicatesCount++;
                } else if (validateProxy(line)) {
                    validProxies.push({
                        addr: line,
                        isValid: true
                    });
                    // Добавляем в Set, чтобы избежать дубликатов внутри загружаемого файла
                    existingProxiesSet.add(lowerLine);
                } else {
                    invalidProxies.push({
                        addr: line,
                        isValid: false
                    });
                }
            });

            // Статистика
            const stats = {
                total: lines.length,
                valid: validProxies.length,
                invalid: invalidProxies.length,
                duplicates: duplicatesCount
            };

            setUploadStats(stats);
            setPreviewProxies([...validProxies, ...invalidProxies]);
            setIsPreviewModalOpen(true);
        };

        reader.onerror = () => {
            message.error(t("proxyFileReadError") || 'Ошибка чтения файла');
        };

        reader.readAsText(file);
        return false; // Предотвращаем автоматическую загрузку
    };

    // Функция подтверждения загрузки прокси
    const handleConfirmUploadProxies = async () => {
        const validProxies = previewProxies.filter(p => p.isValid);

        if (validProxies.length === 0) {
            message.warning(t("proxyNoValidProxies") || 'Нет валидных прокси для добавления');
            setIsPreviewModalOpen(false);
            return;
        }

        setIsUploadLoading(true);
        const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
        if (!token) {
            message.error(t("authError") || 'Ошибка аутентификации');
            setIsUploadLoading(false);
            return;
        }

        try {
            let successCount = 0;
            let failureCount = 0;

            // Добавляем прокси с небольшой задержкой между запросами
            for (const proxy of validProxies) {
                try {
                    // Разбираем логин и пароль из строки прокси (если они есть)
                    let proxyAddr = proxy.addr;
                    let username = null;
                    let password = null;

                    if (proxy.addr.includes('@')) {
                        const [credentialsPart, hostPart] = proxy.addr.split('@');
                        const [login, pass] = credentialsPart.split(':');
                        username = login;
                        password = pass;
                        proxyAddr = hostPart;
                    }

                    await addServiceProxy(token, proxyAddr, username, password);
                    successCount++;
                } catch (error) {
                    console.error(`Ошибка добавления прокси ${proxy.addr}:`, error);
                    failureCount++;
                }
                // Небольшая задержка для избежания перегрузки API
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // Показываем результат
            if (successCount > 0) {
                showNotification(`Успешно добавлено ${successCount} прокси`);
            }
            if (failureCount > 0) {
                showErrorNotification(`Не удалось добавить ${failureCount} прокси`);
            }

            // Обновляем список прокси
            await loadProxyData();
            setIsPreviewModalOpen(false);
            setPreviewProxies([]);
        } catch (error) {
            console.error(t("proxyLoadError") || 'Ошибка при загрузке прокси:', error);
            showErrorNotification(t("proxyLoadError") || 'Ошибка при загрузке прокси');
        } finally {
            setIsUploadLoading(false);
        }
    };

    const handleAddProxy = () => {
        form.resetFields();
        setIsAddModalOpen(true);
    };

    const handleAddConfirm = async () => {
        try {
            const values = await form.validateFields();

            // Проверка на дубликаты
            const isDuplicate = proxyList?.some(proxy =>
                proxy.addr.trim().toLowerCase() === values.addr.trim().toLowerCase()
            );

            if (isDuplicate) {
                // Показываем ошибку на поле и предупреждение
                form.setFields([
                    { name: 'addr', errors: [t("proxyDuplicate") || 'Прокси с таким адресом уже существует в списке'] }
                ]);
                message.warning(`${t("proxyDuplicate") || 'Прокси'} "${values.addr}" ${t("alreadyExists") || "уже существует в списке."}`);
                return;
            }

            const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
            if (!token) {
                message.error(t("authError") || 'Ошибка аутентификации');
                return;
            }

            // Вызов API для добавления прокси
            await addServiceProxy(token, values.addr, values.usr || null, values.pass || null);

            showNotification(t("success") || 'Успешно', t("proxyAddSuccess") || 'Прокси добавлен');
            setIsAddModalOpen(false);
            form.resetFields();

            // Обновить список прокси после добавления
            const data = await readProxyData(token);
            if (data && Array.isArray(data) && data.length > 0) {
                setProxyList(data);
            } else {
                setProxyList([]);
            }
        } catch (error) {
            console.error(t("proxyAddError") || 'Ошибка добавления прокси:', error);
            showErrorNotification(t("error") || 'Ошибка', `${t("proxyAddError") || "Ошибка при добавлении прокси:"} ${error.message}`);
        }
    };

    const handleEditProxy = (proxy) => {
        setSelectedProxy(proxy);
        setIsEditModalOpen(true);

        // Заполняем форму данными прокси
        form.setFieldsValue({
            addr: proxy.addr,
            usr: proxy.usr || '',
            pass: proxy.pass || ''
        });
    };

    const handleEditConfirm = async () => {
        try {
            const values = await form.validateFields();

            // Проверка на дубликаты (кроме самого редактируемого прокси)
            const isDuplicate = proxyList?.some(proxy =>
                proxy.id !== selectedProxy.id &&
                proxy.addr.trim().toLowerCase() === values.addr.trim().toLowerCase()
            );

            if (isDuplicate) {
                // Показываем ошибку на поле и предупреждение
                form.setFields([
                    { name: 'addr', errors: [t("proxyDuplicate") || 'Прокси с таким адресом уже существует в списке'] }
                ]);
                message.warning(`${t("proxyDuplicate") || 'Прокси'} "${values.addr}" ${t("alreadyExists") || "уже существует в списке."}`);
                return;
            }

            const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
            if (!token) {
                message.error(t("authError") || 'Ошибка аутентификации');
                return;
            }

            // Вызов API для обновления прокси
            await editServiceProxy(token, selectedProxy.id, values.addr, values.usr || null, values.pass || null);

            showNotification(t("success") || 'Успешно', t("proxyUpdateSuccess") || 'Прокси обновлен');
            setIsEditModalOpen(false);
            setSelectedProxy(null);
            form.resetFields();

            // Обновить список прокси после изменения
            const data = await readProxyData(token);
            if (data && Array.isArray(data) && data.length > 0) {
                setProxyList(data);
            } else {
                setProxyList([]);
            }
        } catch (error) {
            console.error(t("proxyUpdateError") || 'Ошибка редактирования прокси:', error);
            showErrorNotification(t("error") || 'Ошибка', `${t("proxyUpdateError") || "Ошибка при обновлении прокси:"} ${error.message}`);
        }
    };

    const handleDeleteProxy = (proxy) => {
        setSelectedProxy(proxy);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!selectedProxy) {
            message.error(t("proxyDeleteError") || 'Не выбран прокси для удаления');
            return;
        }

        const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
        if (!token) {
            message.error(t("authError") || 'Ошибка аутентификации');
            return;
        }

        try {
            // Вызов API для удаления прокси
            await deleteServiceProxy(token, selectedProxy.id);

            // Обновляем состояние прокси
            setProxyList((prevProxies) => prevProxies.filter((p) => p.id !== selectedProxy.id));

            showNotification(t("success") || 'Успешно', `${t("proxy") || "Прокси"} ${selectedProxy.addr} ${t("proxyDeleteSuccess") || "удален"}`);
        } catch (error) {
            showErrorNotification(t("error") || 'Ошибка', `${t("proxyDeleteError") || "Ошибка при удалении прокси:"} ${error.message}`);
        } finally {
            setIsDeleteModalOpen(false);
            setSelectedProxy(null);
        }
    };

    const handleDeleteAll = () => {
        if (!proxyList || proxyList.length === 0) {
            message.warning(t("proxyLoadError") || 'Список прокси пуст');
            return;
        }
        setIsDeleteAllModalOpen(true);
    };

    const handleDeleteAllConfirm = async () => {
        const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
        if (!token) {
            message.error(t("authError") || 'Ошибка аутентификации');
            setIsDeleteAllModalOpen(false);
            return;
        }

        setLoading(true);

        try {
            // Удаляем все прокси на сервере
            const result = await deleteAllServiceProxy(token);

            if (result) {
                // Очищаем список прокси после успешного удаления
                setProxyList([]);
                showNotification(t("success") || 'Успешно', t("proxyDeleteAllSuccess") || 'Все прокси удалены');
            } else {
                showErrorNotification(t("error") || 'Ошибка', t("proxyDeleteAllError") || 'Ошибка удаления всех прокси на сервере');
            }
        } catch (error) {
            console.error(t("proxyDeleteAllError") || 'Ошибка при удалении всех прокси:', error);
            showErrorNotification(t("error") || 'Ошибка', t("proxyDeleteAllError") || 'Ошибка удаления всех прокси');
        } finally {
            setLoading(false);
            setIsDeleteAllModalOpen(false);
        }
    };

    const handleToggleProxy = async (proxy, checked) => {
        const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
        if (!token) {
            message.error('Ошибка аутентификации');
            return;
        }

        try {
            // Вызов API для активации/деактивации прокси
            await setServiceProxyActive(token, proxy.id, checked);

            // Обновляем состояние прокси
            setProxyList((prevProxies) =>
                prevProxies.map((p) => (p.id === proxy.id ? { ...p, active: checked ? 1 : 0 } : p))
            );

            showNotification(t("success") || 'Успешно', `${t("proxy") || "Прокси"} ${proxy.addr} ${t("success") || "успешно"} ${checked ? (t("proxyStatusOn") || 'активирован') : (t("proxyStatusOff") || 'деактивирован')}`);
        } catch (error) {
            showErrorNotification(t("error") || 'Ошибка', `${t("error") || "Ошибка при"} ${checked ? t("proxyStatusOn") : t("proxyStatusOff") || `${checked ? 'активации' : 'деактивации'}`} ${t("proxy") || "прокси"}: ${error.message}`);
        }
    };

    const columns = [
        {
            title: '#',
            key: 'index',
            width: 30,
            render: (text, record, index) => (currentPage - 1) * pageSize + index + 1,
        },
        {
            title: t("proxyAddAddress") || 'Адрес прокси',
            dataIndex: 'addr',
            key: 'addr',
            render: (addr) => <code style={{ fontSize: '13px' }}>{addr}</code>,
        },
        {
            title: t("proxyTableType") || 'Тип',
            dataIndex: 'type',
            key: 'type',
            width: 80,
            render: (type) => <span>{type}</span>,
        },
        {
            title: t("proxyTableStatus") || 'Статус',
            key: 'valid',
            width: 90,
            render: (record) => {
                let color = 'default';
                let text = t("proxyStatusError") || 'unknown';

                if (record.type === 'error') {
                    color = 'red';
                    text = t("proxyStatusError") || 'ошибка';
                } else if (record.type && record.type !== 'error') {
                    color = 'green';
                    text = t("proxyStatusWorking") || 'рабочий';
                }

                return (
                    <Badge
                        color={color}
                        text={text}
                    />
                );
            },
        },
        {
            title: t("proxyTableActive") || 'Активность',
            key: 'active',
            width: 80,
            align: 'center',
            render: (record) => (
                <Switch
                    checked={record.active === 1}
                    onChange={(checked) => handleToggleProxy(record, checked)}
                    checkedChildren={<span style={{color: "black"}}>{t("proxyStatusOn") || "Вкл"}</span>}
                    unCheckedChildren={<span style={{color: "black"}}>{t("proxyStatusOff") || "Выкл"}</span>}
                />
            ),
        },
        {
            title: t("proxyTableCreated") || 'Создан',
            dataIndex: 'created',
            key: 'created',
            width: 150,
            render: (date) => new Date(date).toLocaleString('ru-RU'),
        },
        {
            title: t("proxyTableUpdated") || 'Создан/Обновлен',
            dataIndex: 'updated',
            key: 'updated',
            width: 150,
            render: (date) => new Date(date).toLocaleString('ru-RU'),
        },
        {
            title: t("proxyTableActions") || 'Действия',
            key: 'actions',
            width: 120,
            render: (text, record) => (
                <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                    {record.active === 1 ? (
                        <DeleteOutlined
                            style={{
                                color: '#ff4d4f',
                                cursor: 'pointer',
                                fontSize: '16px'
                            }}
                            onClick={() => handleDeleteProxy(record)}
                            title={t("proxyDeleteTooltip") || "Удалить прокси"}
                        />
                    ) : (
                        <>
                            <EditOutlined
                                style={{
                                    color: '#1890ff',
                                    cursor: 'pointer',
                                    fontSize: '16px'
                                }}
                                onClick={() => handleEditProxy(record)}
                                title={t("proxyEditTooltip") || "Редактировать прокси"}
                            />
                            <DeleteOutlined
                                style={{
                                    color: '#ff4d4f',
                                    cursor: 'pointer',
                                    fontSize: '16px'
                                }}
                                onClick={() => handleDeleteProxy(record)}
                                title="Удалить прокси"
                            />
                        </>
                    )}
                </div>
            ),
        }
    ];

    if (loading) {
    return (
        <div className="create-model-container">
            <div className="loading-container">
                <Spin size="large" />
                <div className="loading-text">{t("proxyLoadingText") || "Загрузка данных..."}</div>
            </div>
        </div>
    );
    }

    return (
        <div className="create-model-container">
            <div className="section-title create-model-header">
                <CloudServerOutlined />
                {t("proxyHeaderTitle") || "Прокси серверы"}
                {proxyList && proxyList.length > 0 && (
                    <div className="status-indicator success">
                        <span>✓ {t("proxyStatusIndicator") || "Прокси:"} {proxyList.length}</span>
                    </div>
                )}
            </div>
            <div className="section-description">
                {t("proxyDescription") || "Список proxy серверов для подключения ботов"}
            </div>

            {/* Кнопка добавления */}
            <div style={{ marginBottom: 16, display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    size="large"
                    onClick={handleAddProxy}
                >
                    {t("proxyAddButton") || "Добавить прокси"}
                </Button>
                <Upload
                    accept=".txt,.csv"
                    beforeUpload={handleFileUpload}
                    showUploadList={false}
                >
                    <Tooltip title={
                        <div style={{ fontSize: '12px', lineHeight: '1.5' }}>
                            <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>{t("proxyUploadTooltipTitle") || "Форматы прокси:"}</div>
                            <div style={{ marginBottom: '4px' }}>{t("proxyUploadTooltipWithoutAuth") || "Без логина:"}</div>
                            <div style={{ marginLeft: '12px', marginBottom: '8px', color: '#aaa' }}>
                                192.168.1.100:8080<br/>
                                10.0.0.50:3128<br/>
                                proxy.example.com:8888
                            </div>
                            <div style={{ marginBottom: '4px' }}>{t("proxyUploadTooltipWithAuth") || "С логином и паролем:"}</div>
                            <div style={{ marginLeft: '12px', color: '#aaa' }}>
                                user123:pass456@192.168.1.100:8080<br/>
                                admin:securepass@10.0.0.50:3128
                            </div>
                        </div>
                    }>
                        <Button
                            icon={<UploadOutlined />}
                            size="large"
                        >
                            {t("proxyUploadButton") || "Загрузить"}
                        </Button>
                    </Tooltip>
                </Upload>
                <Button
                    danger
                    icon={<DeleteOutlined />}
                    size="large"
                    onClick={handleDeleteAll}
                >
                    {t("proxyDeleteAllButton") || "Удалить все прокси"}
                </Button>
            </div>

            {/* Таблица прокси */}
            {proxyList && proxyList.length > 0 ? (
                <Table
                    columns={columns}
                    dataSource={proxyList}
                    rowKey={(record) => record.id}
                    pagination={{
                        current: currentPage,
                        pageSize: pageSize,
                        showSizeChanger: true,
                        pageSizeOptions: ['10', '20', '50', '100'],
                        total: proxyList.length,
                        onChange: (page, pageSize) => {
                            setCurrentPage(page);
                            setPageSize(pageSize);
                        },
                    }}
                    bordered
                    size="small"
                    rowClassName="compact-row"
                    scroll={{ x: 'max-content' }}
                />
            ) : (
                <div className="form-section model-name-section" style={{ textAlign: 'center', padding: '40px' }}>
                    <CloudServerOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
                    <div className="section-title">{t("proxyEmptyTitle") || "Прокси серверов нет"}</div>
                    <div className="section-description">
                        {t("proxyEmptyDesc") || "Добавьте первый прокси сервер, нажав кнопку"} "{t("proxyAddButton") || "Добавить прокси"}"
                    </div>
                </div>
            )}

            {/* Модальное окно добавления прокси */}
            <Modal
                title={
                    <span>
                        <PlusOutlined /> {t("proxyAddModalTitle") || "Добавить новый прокси"}
                    </span>
                }
                open={isAddModalOpen}
                onCancel={() => {
                    setIsAddModalOpen(false);
                    form.resetFields();
                }}
                onOk={handleAddConfirm}
                okText={t("proxyAddButton") || "Добавить"}
                cancelText={t("cancel") || "Отмена"}
                width={600}
                okButtonProps={{ style: { color: "black" } }}
            >
                <Form
                    form={form}
                    layout="vertical"
                    style={{ marginTop: 20 }}
                >
                    <Form.Item
                        name="addr"
                        label={t("proxyAddAddress") || "Адрес прокси"}
                        rules={[
                            {
                                required: true,
                                message: t("proxyAddAddressError") || 'Пожалуйста, введите адрес прокси!',
                            },
                            {
                                max: 255,
                                message: t("proxyAddAddressMax") || 'Адрес прокси не должен превышать 255 символов',
                            },
                            {
                                pattern: /^[a-zA-Z0-9.-]+:\d+$/,
                                message: t("proxyAddAddressPattern") || 'Формат: хост:порт (например, 123.123.123.123:4567)',
                            },
                        ]}
                    >
                        <Input
                            placeholder={t("proxyAddressPlaceholder") || "123.123.123.123:4567"}
                            size="large"
                        />
                    </Form.Item>
                    <Form.Item
                        name="usr"
                        label="Username (опционально)"
                        rules={[
                            {
                                max: 64,
                                message: 'Username не должен превышать 64 символа',
                            },
                        ]}
                    >
                        <Input
                            placeholder="username"
                            size="large"
                        />
                    </Form.Item>
                    <Form.Item
                        name="pass"
                        label="Password (опционально)"
                        rules={[
                            {
                                max: 64,
                                message: 'Password не должен превышать 64 символа',
                            },
                        ]}
                    >
                        <Input.Password
                            placeholder="password"
                            size="large"
                        />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Модальное окно редактирования прокси */}
            <Modal
                title={
                    <span>
                        <EditOutlined /> {t("proxyEditModalTitle") || "Редактировать прокси"}
                    </span>
                }
                open={isEditModalOpen}
                onCancel={() => {
                    setIsEditModalOpen(false);
                    setSelectedProxy(null);
                    form.resetFields();
                }}
                onOk={handleEditConfirm}
                okText={t("proxySaveButton") || "Сохранить"}
                cancelText={t("cancel") || "Отмена"}
                width={600}
                okButtonProps={{ style: { color: "black" } }}
            >
                <Form
                    form={form}
                    layout="vertical"
                    style={{ marginTop: 20 }}
                >
                    <Form.Item
                        name="addr"
                        label={t("proxyAddAddress") || "Адрес прокси"}
                        rules={[
                            {
                                required: true,
                                message: t("proxyAddAddressError") || 'Пожалуйста, введите адрес прокси!',
                            },
                            {
                                max: 255,
                                message: t("proxyAddAddressMax") || 'Адрес прокси не должен превышать 255 символов',
                            },
                            {
                                pattern: /^[a-zA-Z0-9.-]+:\d+$/,
                                message: t("proxyAddAddressPattern") || 'Формат: хост:порт (например, 45.144.222.118:509)',
                            },
                        ]}
                    >
                        <Input
                            placeholder={t("proxyAddressPlaceholder") || "45.144.222.118:509"}
                            size="large"
                        />
                    </Form.Item>
                    <Form.Item
                        name="usr"
                        label={t("proxyAddUsername") || "Username (опционально)"}
                        rules={[
                            {
                                max: 64,
                                message: t("proxyAddUsernameMax") || 'Username не должен превышать 64 символа',
                            },
                        ]}
                    >
                        <Input
                            placeholder="username"
                            size="large"
                        />
                    </Form.Item>
                    <Form.Item
                        name="pass"
                        label={t("proxyAddPassword") || "Password (опционально)"}
                        rules={[
                            {
                                max: 64,
                                message: t("proxyAddPasswordMax") || 'Password не должен превышать 64 символа',
                            },
                        ]}
                    >
                        <Input.Password
                            placeholder="password"
                            size="large"
                        />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Модальное окно удаления прокси */}
            <Modal
                title={
                    <span style={{ color: '#ff4d4f' }}>
                        <ExclamationCircleOutlined /> {t("proxyDeleteModalTitle") || "Подтверждение удаления"}
                    </span>
                }
                open={isDeleteModalOpen}
                onCancel={() => {
                    setIsDeleteModalOpen(false);
                    setSelectedProxy(null);
                }}
                onOk={handleDeleteConfirm}
                okText={t("proxyDeleteButton") || "Удалить"}
                cancelText={t("cancel") || "Отмена"}
                okButtonProps={{ danger: true }}
            >
                <p>
                    {t("proxyDeleteConfirmText") || "Вы уверены, что хотите удалить прокси"} <strong>{selectedProxy?.addr}</strong>?
                </p>
                <p style={{ color: '#8c8c8c' }}>
                    {t("proxyDeleteWarning") || "Это действие нельзя будет отменить."}
                </p>
            </Modal>

            {/* Модальное окно удаления всех прокси */}
            <Modal
                title={
                    <span style={{ color: '#ff4d4f' }}>
                        <ExclamationCircleOutlined /> {t("proxyDeleteAllConfirm") || "Подтверждение удаления всех прокси"}
                    </span>
                }
                open={isDeleteAllModalOpen}
                onCancel={() => setIsDeleteAllModalOpen(false)}
                onOk={handleDeleteAllConfirm}
                okText={t("proxyDeleteAllButton") || "Удалить все"}
                cancelText={t("cancel") || "Отмена"}
                okButtonProps={{ danger: true }}
            >
                <p>
                    {t("proxyDeleteAllConfirm") || "Вы уверены, что хотите удалить все прокси?"}
                </p>
                <p style={{ color: '#8c8c8c' }}>
                    {t("proxyDeleteAllWarning") || "Это действие нельзя будет отменить."}
                </p>
            </Modal>

            {/* Модальное окно предварительного просмотра и загрузки прокси */}
            <Modal
                title={t("proxyUploadModalTitle") || "Предварительный просмотр прокси"}
                open={isPreviewModalOpen}
                onCancel={() => setIsPreviewModalOpen(false)}
                footer={null}
                width={800}
            >
                <div style={{ padding: '16px 24px' }}>
                    {uploadStats && (
                        <div style={{ marginBottom: 16 }}>
                            <div>{t("total") || "Всего строк"}: {uploadStats.total}</div>
                            <div style={{ color: 'green' }}>
                                {t("validProxies") || "Валидные прокси"}: {uploadStats.valid}
                            </div>
                            <div style={{ color: 'red' }}>
                                {t("invalidProxies") || "Невалидные прокси"}: {uploadStats.invalid}
                            </div>
                            <div style={{ color: 'orange' }}>
                                {t("proxyDuplicates") || "Дубликаты"}: {uploadStats.duplicates}
                            </div>
                        </div>
                    )}

                    {/* Таблица предварительного просмотра прокси */}
                    <Table
                        dataSource={previewProxies}
                        rowKey={(record, index) => index}
                        pagination={false}
                        bordered
                        size="small"
                        scroll={{ x: 'max-content' }}
                        columns={[
                            {
                                title: t("proxyTableAddress") || 'Адрес прокси',
                                dataIndex: 'addr',
                                key: 'addr',
                                render: (text, record) => (
                                    <span style={{ color: record.isValid ? 'inherit' : 'red' }}>
                                        {text}
                                    </span>
                                )
                            },
                            {
                                title: t("proxyTableStatus") || 'Статус',
                                key: 'status',
                                render: (text, record) => (
                                    <span>
                                        {record.isValid ? (
                                            <Tag color="green">{t("proxyValid") || "Валидный"}</Tag>
                                        ) : (
                                            <Tag color="red">{t("proxyInvalid") || "Невалидный"}</Tag>
                                        )}
                                    </span>
                                )
                            }
                        ]}
                    />

                    {/* Кнопки действий */}
                    <div style={{ marginTop: 16, textAlign: 'right' }}>
                        <Button
                            onClick={() => setIsPreviewModalOpen(false)}
                            style={{ marginRight: 8 }}
                        >
                            {t("proxyUploadCancel") || "Отмена"}
                        </Button>
                        <Button
                            style={{color: "black"}}
                            type="primary"
                            loading={isUploadLoading}
                            onClick={handleConfirmUploadProxies}
                        >
                            {t("proxyUploadValidProxies") || "Загрузить валидные прокси"}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
});
