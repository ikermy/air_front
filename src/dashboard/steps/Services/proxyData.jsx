import {useEffect, useState, forwardRef, useImperativeHandle} from "react";
import {validateAndRefreshToken} from "../../../utils/easyUtils";
import {readProxyData, setServiceProxyActive, addServiceProxy, editServiceProxy, deleteServiceProxy} from "./serviceUtils";
import "../../steps.css";
import "../../../dashboard/steps/CreateModel.css";
import {message, Spin, Table, Badge, Switch, Button, Modal, Form, Input} from 'antd';
import {CloudServerOutlined, PlusOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined} from "@ant-design/icons";
import {showErrorNotification, showNotification} from "../../hotification/showNotification";

export const ProxyData = forwardRef((props, ref) => {
    const [proxyList, setProxyList] = useState(null);
    const [loading, setLoading] = useState(true);
    const [pageSize, setPageSize] = useState(20);
    const [currentPage, setCurrentPage] = useState(1);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedProxy, setSelectedProxy] = useState(null);
    const [form] = Form.useForm();

    const loadProxyData = async () => {
        const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
        if (!token) {
            message.error('Ошибка аутентификации');
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
            message.error('Ошибка загрузки данных прокси');
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

    const handleAddProxy = () => {
        form.resetFields();
        setIsAddModalOpen(true);
    };

    const handleAddConfirm = async () => {
        try {
            const values = await form.validateFields();

            const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
            if (!token) {
                message.error('Ошибка аутентификации');
                return;
            }

            // Вызов API для добавления прокси
            await addServiceProxy(token, values.addr, values.hex);

            showNotification('Успешно', 'Прокси добавлен');
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
            console.error('Ошибка добавления прокси:', error);
            showErrorNotification('Ошибка', `Ошибка при добавлении прокси: ${error.message}`);
        }
    };

    const handleEditProxy = (proxy) => {
        setSelectedProxy(proxy);
        setIsEditModalOpen(true);

        // Заполняем форму данными прокси
        form.setFieldsValue({
            addr: proxy.addr,
            hex: proxy.hex
        });
    };

    const handleEditConfirm = async () => {
        try {
            const values = await form.validateFields();

            const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
            if (!token) {
                message.error('Ошибка аутентификации');
                return;
            }

            // Вызов API для обновления прокси
            await editServiceProxy(token, selectedProxy.id, values.addr, values.hex);

            showNotification('Успешно', 'Прокси обновлен');
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
            console.error('Ошибка редактирования прокси:', error);
            showErrorNotification('Ошибка', `Ошибка при обновлении прокси: ${error.message}`);
        }
    };

    const handleDeleteProxy = (proxy) => {
        setSelectedProxy(proxy);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!selectedProxy) {
            message.error('Не выбран прокси для удаления');
            return;
        }

        const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
        if (!token) {
            message.error('Ошибка аутентификации');
            return;
        }

        try {
            // Вызов API для удаления прокси
            await deleteServiceProxy(token, selectedProxy.id);

            // Обновляем состояние прокси
            setProxyList((prevProxies) => prevProxies.filter((p) => p.id !== selectedProxy.id));

            showNotification('Успешно', `Прокси ${selectedProxy.addr} удален`);
        } catch (error) {
            showErrorNotification('Ошибка', `Ошибка при удалении прокси: ${error.message}`);
        } finally {
            setIsDeleteModalOpen(false);
            setSelectedProxy(null);
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

            showNotification('Успешно', `Прокси ${proxy.addr} успешно ${checked ? 'активирован' : 'деактивирован'}`);
        } catch (error) {
            showErrorNotification('Ошибка', `Ошибка при ${checked ? 'активации' : 'деактивации'} прокси: ${error.message}`);
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
            title: 'Адрес прокси',
            dataIndex: 'addr',
            key: 'addr',
            render: (addr) => <code style={{ fontSize: '13px' }}>{addr}</code>,
        },
        {
            title: 'Статус',
            key: 'valid',
            width: 100,
            render: (text, record) => (
                <Badge
                    color={record.valid === 1 ? 'green' : 'red'}
                    text={record.valid === 1 ? 'рабочий' : 'ошибка'}
                />
            ),
        },
        {
            title: 'Активность',
            key: 'active',
            width: 100,
            align: 'center',
            render: (text, record) => (
                <Switch
                    checked={record.active === 1}
                    onChange={(checked) => handleToggleProxy(record, checked)}
                    checkedChildren={<span style={{color: "black"}}>Вкл</span>}
                    unCheckedChildren={<span style={{color: "black"}}>Выкл</span>}
                />
            ),
        },
        {
            title: 'Создан',
            dataIndex: 'created',
            key: 'created',
            width: 180,
            render: (date) => new Date(date).toLocaleString('ru-RU'),
        },
        {
            title: 'Обновлен',
            dataIndex: 'updated',
            key: 'updated',
            width: 180,
            render: (date) => new Date(date).toLocaleString('ru-RU'),
        },
        {
            title: 'Действия',
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
                            title="Удалить прокси"
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
                                title="Редактировать прокси"
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
                    <div className="loading-text">Загрузка данных...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="create-model-container">
            <div className="section-title create-model-header">
                <CloudServerOutlined />
                Прокси серверы MTProxy
                {proxyList && proxyList.length > 0 && (
                    <div className="status-indicator success">
                        <span>✓ Прокси: {proxyList.length}</span>
                    </div>
                )}
            </div>
            <div className="section-description">
                Список MTProxy серверов для подключения ботов Telegram
            </div>

            {/* Кнопка добавления */}
            <div style={{ marginBottom: 16, display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    size="large"
                    onClick={handleAddProxy}
                >
                    Добавить прокси
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
                    <div className="section-title">Прокси серверов нет</div>
                    <div className="section-description">
                        Добавьте первый прокси сервер, нажав кнопку "Добавить прокси"
                    </div>
                </div>
            )}

            {/* Модальное окно добавления прокси */}
            <Modal
                title={
                    <span>
                        <PlusOutlined /> Добавить новый прокси
                    </span>
                }
                open={isAddModalOpen}
                onCancel={() => {
                    setIsAddModalOpen(false);
                    form.resetFields();
                }}
                onOk={handleAddConfirm}
                okText="Добавить"
                cancelText="Отмена"
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
                        label="Адрес прокси"
                        rules={[
                            {
                                required: true,
                                message: 'Пожалуйста, введите адрес прокси!',
                            },
                            {
                                pattern: /^[a-zA-Z0-9.-]+:\d+$/,
                                message: 'Формат: хост:порт (например, 123.123.123.123:4567)',
                            },
                        ]}
                    >
                        <Input
                            placeholder="123.123.123.123:4567"
                            size="large"
                        />
                    </Form.Item>
                    <Form.Item
                        name="hex"
                        label="Hex ключ"
                        rules={[
                            {
                                required: true,
                                message: 'Пожалуйста, введите ключ!',
                            },
                            {
                                pattern: /^[a-zA-Z0-9+/=_-]{16,88}$/,
                                message: 'Ключ должен быть в формате hex (до 64 символов) или base64 (до 88 символов)',
                            },
                        ]}
                    >
                        <Input
                            placeholder="EERighJJvXrFGRMCIMJdCQ или abcdef1234567890"
                            size="large"
                        />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Модальное окно редактирования прокси */}
            <Modal
                title={
                    <span>
                        <EditOutlined /> Редактировать прокси
                    </span>
                }
                open={isEditModalOpen}
                onCancel={() => {
                    setIsEditModalOpen(false);
                    setSelectedProxy(null);
                    form.resetFields();
                }}
                onOk={handleEditConfirm}
                okText="Сохранить"
                cancelText="Отмена"
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
                        label="Адрес прокси"
                        rules={[
                            {
                                required: true,
                                message: 'Пожалуйста, введите адрес прокси!',
                            },
                            {
                                pattern: /^[a-zA-Z0-9.-]+:\d+$/,
                                message: 'Формат: хост:порт (например, 45.144.222.118:509)',
                            },
                        ]}
                    >
                        <Input
                            placeholder="45.144.222.118:509"
                            size="large"
                        />
                    </Form.Item>
                    <Form.Item
                        name="hex"
                        label="Hex ключ"
                        rules={[
                            {
                                required: true,
                                message: 'Пожалуйста, введите ключ!',
                            },
                            {
                                pattern: /^[a-zA-Z0-9+/=_-]{16,88}$/,
                                message: 'Ключ должен быть в формате hex (до 64 символов) или base64 (до 88 символов)',
                            },
                        ]}
                    >
                        <Input
                            placeholder="EERighJJvXrFGRMCIMJdCQ или abcdef1234567890"
                            size="large"
                        />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Модальное окно удаления прокси */}
            <Modal
                title={
                    <span style={{ color: '#ff4d4f' }}>
                        <ExclamationCircleOutlined /> Подтверждение удаления
                    </span>
                }
                open={isDeleteModalOpen}
                onCancel={() => {
                    setIsDeleteModalOpen(false);
                    setSelectedProxy(null);
                }}
                onOk={handleDeleteConfirm}
                okText="Удалить"
                cancelText="Отмена"
                okButtonProps={{ danger: true }}
            >
                <p>
                    Вы уверены, что хотите удалить прокси{' '}
                    <strong>{selectedProxy?.addr}</strong>?
                </p>
                <p style={{ color: '#8c8c8c' }}>
                    Это действие нельзя будет отменить.
                </p>
            </Modal>
        </div>
    );
});
