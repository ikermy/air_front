import {useEffect, useState} from "react";
import {validateAndRefreshToken} from "../../../utils/easyUtils";
import {Button, Form, Input, message, Spin, Modal, Alert, Typography} from "antd";
import {RobotOutlined, UserOutlined, ExclamationCircleOutlined} from "@ant-design/icons";
import {deleteServiceModelData, readServiceModelData, createServiceModelData} from "./serviceUtils";
import "../../steps.css";
import "../../../dashboard/steps/CreateModel.css";
import {showErrorNotification, showNotification} from "../../hotification/showNotification";

const { TextArea } = Input;

export function ServiceModelData() {
    const [modelData, setModelData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isButtonDisabled, setButtonDisabled] = useState(true);
    const [form] = Form.useForm();
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState("");
    const [deleteLoading, setDeleteLoading] = useState(false);
    const { Text } = Typography;

    useEffect(() => {
        const loadModelData = async () => {
            const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
            if (!token) {
                message.error('Ошибка аутентификации');
                setModelData(null);
                setLoading(false);
                return;
            }
            try {
                const data = await readServiceModelData(token);

                if (data && Object.keys(data).length > 0) {
                    setModelData(data);

                    form.setFieldsValue({
                        name: data.name || "",
                        prompt: data.prompt || "",
                        start_msg: data.start_msg || "",
                        target_msg: data.target_msg || "",
                        tg_group: data.tg_group || "",
                    });
                } else {
                    setModelData(null);
                }
            } catch (e) {
                message.error('Ошибка загрузки данных модели');
                setModelData(null);
            } finally {
                setLoading(false);
            }
        };

        loadModelData();
    }, [form]);

    // Обработчик изменений формы
    const handleValuesChange = (changedValues, allValues) => {
        if (modelData) {
            // Для существующей модели - проверяем изменения
            const hasChanges = Object.keys(allValues).some((key) => {
                return modelData[key] !== allValues[key];
            });
            setButtonDisabled(!hasChanges);
        } else {
            // Для новой модели - проверяем наличие обязательных полей
            const hasName = allValues.name && allValues.name.trim().length > 0;
            const hasPrompt = allValues.prompt && allValues.prompt.trim().length > 0;
            setButtonDisabled(!(hasName && hasPrompt));
        }
    };

    const onFinish = async (values) => {
        // Собираю данные формы и отправляю на сервер для создания/обновления модели
        const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
        if (!token) {
            message.error('Ошибка аутентификации');
            return;
        }

        const mname = values.name ? values.name.trim() : "";
        const start = values.start_msg || "";
        const target = values.target_msg || "";
        const tg = values.tg_group || "";
        const mprompt = values.prompt ? values.prompt.trim() : "";

        try {
            const success = await createServiceModelData(token, mname, start, target, tg, mprompt);
            if (success) {
                showNotification(modelData ? "Модель обновлена" : "Модель создана");
                // Обновляем данные модели в UI
                const newData = await readServiceModelData(token);
                setModelData(newData);
                form.setFieldsValue({
                    name: mname,
                    prompt: mprompt,
                    start_msg: start,
                    target_msg: target,
                    tg_group: tg,
                });
                setButtonDisabled(true);
            } else {
                showErrorNotification("Ошибка при сохранении модели");
            }
        } catch (err) {
            console.error('Ошибка при создании/обновлении модели', err);
            showErrorNotification("Ошибка при сохранении модели");
        }
    };

    const handleDelete = () => {
        setIsDeleteModalOpen(true);
        setDeleteConfirmation("");
    };

    const handleDeleteConfirm = async () => {
        if (deleteConfirmation !== 'yes') {
            return;
        }
        setDeleteLoading(true);
        const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
        if (!token) {
            setDeleteLoading(false);
            console.error('Ошибка аутентификации');
            showErrorNotification("Ошибка удаления модели");
            return;
        }
        try {
            const response = await deleteServiceModelData(token);
            if (!response) {
                setDeleteLoading(false);
                console.error("Ошибка при удалении модели:", response?.status);
                showErrorNotification("Ошибка удаления модели");
                return;
            }
            setIsDeleteModalOpen(false);
            showNotification("Модель успешно удалена");
            form.resetFields();
            setModelData(null);
        } catch (err) {
            setDeleteLoading(false);
            setIsDeleteModalOpen(false);
            console.error('Ошибка удаления модели');
            showErrorNotification("Ошибка удаления модели");
        } finally {
            setDeleteLoading(false);
        }
    };

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
                <RobotOutlined/>
                {modelData ? 'Редактирование модели сервиса' : 'Создание модели сервиса'}
                {modelData && (
                    <div className="status-indicator success">
                        <span>✓ Модель активна</span>
                    </div>
                )}
            </div>
            <div className="section-description">
                {modelData
                    ? 'Внесите изменения в настройки вашей модели сервиса'
                    : 'Настройте параметры для создания модели сервиса'
                }
            </div>

            <Form
                form={form}
                name="serviceModel"
                onFinish={onFinish}
                onValuesChange={handleValuesChange}
                layout="vertical"
            >
                {/* Секция имени модели */}
                <div className="form-section model-name-section">
                    <div className="section-title">
                        <UserOutlined />
                        Основная информация
                    </div>
                    <div className="section-description">
                        Имя модели помогает идентифицировать сервис в системе.
                    </div>

                    <Form.Item
                        name="name"
                        label="Название модели"
                        rules={[
                            {
                                required: true,
                                message: "Пожалуйста, введите имя модели!",
                            },
                            {
                                pattern: /^[a-zA-Zа-яё0-9\s\-_]+$/,
                                message: "Имя модели может содержать только буквы, цифры, дефис и пробелы!",
                            },
                        ]}
                    >
                        <Input
                            prefix={<UserOutlined />}
                            placeholder="Например: Мой сервис"
                            size="large"
                        />
                    </Form.Item>
                </div>

                {/* Секция промпта */}
                <div className="form-section model-name-section">
                    <div className="section-title">
                        💬 Системный промпт
                    </div>
                    <div className="section-description">
                        Основные инструкции, которые определяют поведение модели.
                    </div>

                    <Form.Item
                        name="prompt"
                        label="Промпт модели"
                        rules={[
                            {
                                required: true,
                                message: "Пожалуйста, введите промпт!",
                            },
                        ]}
                    >
                        <TextArea
                            placeholder="Введите системный промпт..."
                            autoSize={{ minRows: 6, maxRows: 20 }}
                            size="large"
                        />
                    </Form.Item>
                </div>

                {/* Секция стартового сообщения */}
                <div className="form-section model-name-section">
                    <div className="section-title">
                        🚀 Стартовое сообщение
                    </div>
                    <div className="section-description">
                        Сообщение, которое пользователь увидит в начале диалога.
                    </div>

                    <Form.Item
                        name="start_msg"
                        label="Стартовое сообщение"
                    >
                        <TextArea
                            placeholder="Привет! Это стартовое сообщение"
                            autoSize={{ minRows: 3, maxRows: 10 }}
                            size="large"
                        />
                    </Form.Item>
                </div>

                {/* Секция целевого сообщения */}
                <div className="form-section model-name-section">
                    <div className="section-title">
                        🎯 Сообщение при достижении цели
                    </div>
                    <div className="section-description">
                        Сообщение, которое отправляется при достижении целевого действия.
                    </div>

                    <Form.Item
                        name="target_msg"
                        label="Целевое сообщение"
                    >
                        <TextArea
                            placeholder="Я передам ваш контакт коллегам, они с вами свяжутся!"
                            autoSize={{ minRows: 3, maxRows: 10 }}
                            size="large"
                        />
                    </Form.Item>
                </div>

                {/* Секция Telegram группы */}
                <div className="form-section model-name-section">
                    <div className="section-title">
                        📱 Целевая группа Telegram
                    </div>
                    <div className="section-description">
                        Имя публичной группы (t.me/...) в Telegram для для пересылки лидов соответствующих условиям модели.
                    </div>

                    <Form.Item
                        name="tg_group"
                        label="Telegram группа"
                    >
                        <Input
                            placeholder="@my_group"
                            size="large"
                        />
                    </Form.Item>
                </div>

                {/* Кнопки действий */}
                <div className="create-model-buttons">
                    <Button
                        type="primary"
                        htmlType="submit"
                        disabled={isButtonDisabled}
                        size="large"
                    >
                        <RobotOutlined />
                        {modelData ? 'Изменить модель' : 'Создать модель'}
                    </Button>

                    {modelData && (
                        <Button
                            type="primary"
                            danger
                            size="large"
                            onClick={handleDelete}
                        >
                            Удалить модель
                        </Button>
                    )}
                </div>
            </Form>

            {/* Модальное окно подтверждения удаления */}
            <Modal
                title={
                    <span style={{ color: '#ff4d4f' }}>
                        <ExclamationCircleOutlined /> Подтверждение удаления модели
                    </span>
                }
                open={isDeleteModalOpen}
                onCancel={() => setIsDeleteModalOpen(false)}
                onOk={handleDeleteConfirm}
                confirmLoading={deleteLoading}
                okText="Удалить модель"
                cancelText="Отмена"
                okButtonProps={{ danger: true }}
                width={600}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <Alert
                        message="Внимание! Это действие необратимо!"
                        type="error"
                        showIcon
                    />
                    <div>
                        <Text strong style={{ color: '#ff4d4f' }}>
                            Модель ассистента будет удалена безвозвратно без возможности восстановления.
                        </Text>
                        <br />
                        <Text type="secondary">
                            Вся конфигурация модели, настройки и связанные данные будут потеряны.
                        </Text>
                    </div>
                    <div>
                        <Text strong>
                            Для окончательного подтверждения удаления модели введите{' '}
                            <Text code style={{ backgroundColor: '#ff4d4f', color: 'white', padding: '2px 4px' }}>
                                yes
                            </Text>
                        </Text>
                        <Input
                            value={deleteConfirmation}
                            onChange={(e) => setDeleteConfirmation(e.target.value)}
                            placeholder="Введите 'yes' для окончательного подтверждения"
                            style={{ marginTop: 8 }}
                            size="large"
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
}