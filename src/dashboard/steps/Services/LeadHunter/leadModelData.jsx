import {useEffect, useState} from "react";
import {useTranslation} from 'react-i18next';
import {Button, Form, Input, message, Spin, Modal, Alert, Typography, Select, Tooltip} from "antd";
import {RobotOutlined, ExclamationCircleOutlined} from "@ant-design/icons";
import {
    deleteServiceModelData,
    readServiceModelData,
    createServiceModelData,
    serviceCheckHuntingModels
} from "./leadUtils";
import "../../../steps.css";
import "../../CreateModel.css";
import {showErrorNotification, showNotification} from "../../../hotification/showNotification";
import {getProviderInfo} from "../../CreateModelFormElements/providersConfig";

const { TextArea } = Input;


export function ServiceModelData({ isServiceRunning: isServiceRunningProp }) {
    const { t } = useTranslation();
    const [modelData, setModelData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isButtonDisabled, setButtonDisabled] = useState(true);
    const [form] = Form.useForm();
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState("");
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [huntingModels, setHuntingModels] = useState(null);
    const [selectedModelId, setSelectedModelId] = useState(null);
    const { Text } = Typography;

    const isServiceRunning = isServiceRunningProp || false;

    useEffect(() => {
        const loadModelData = async () => {
            try {
                const data = await readServiceModelData();

                if (data && Object.keys(data).length > 0) {
                    setModelData(data);

                    const huntingData = await serviceCheckHuntingModels();
                    if (huntingData && Array.isArray(huntingData) && huntingData.length > 0) {
                        const currentModel = huntingData.find(
                            m => m.provider.toLowerCase() === data.provider.toLowerCase() &&
                                 m.model_name === data.name
                        );
                        if (currentModel) {
                            setSelectedModelId(currentModel.model_id);
                        }
                    }

                    form.setFieldsValue({
                        name: data.name || "",
                        start_msg: data.start_msg || "",
                        tg_group: data.tg_group || "",
                    });
                } else {

                    const huntingData = await serviceCheckHuntingModels();
                    if (huntingData && Array.isArray(huntingData) && huntingData.length > 0) {
                        setHuntingModels(huntingData);
                        if (huntingData.length === 1) {
                            setSelectedModelId(huntingData[0].model_id);
                            setButtonDisabled(true);
                        }
                    } else {
                        setHuntingModels([]);
                    }
                    setModelData(null);
                }
            } catch (e) {
                message.error(t("serviceModelLoadError") || 'Ошибка загрузки данных модели');
                setModelData(null);
            } finally {
                setLoading(false);
            }
        };

        loadModelData();
    }, [form, t]);

    const handleValuesChange = (changedValues, allValues) => {
        if (modelData) {
            const hasChanges = Object.keys(allValues).some((key) => {
                return modelData[key] !== allValues[key];
            });
            setButtonDisabled(!hasChanges);
        } else {
            const hasSelectedModel = selectedModelId !== null;
            const hasStartMsg = allValues.start_msg && allValues.start_msg.trim().length > 0;
            const hasTgGroup = allValues.tg_group && allValues.tg_group.trim().length > 0;

            setButtonDisabled(!(hasSelectedModel && hasStartMsg && hasTgGroup));
        }
    };

    const handleModelSelect = (modelId) => {
        setSelectedModelId(modelId);
        const formValues = form.getFieldsValue();
        const hasStartMsg = formValues.start_msg && formValues.start_msg.trim().length > 0;
        const hasTgGroup = formValues.tg_group && formValues.tg_group.trim().length > 0;
        setButtonDisabled(!(hasStartMsg && hasTgGroup));
    };

    const onFinish = async (values) => {
        if (!selectedModelId) {
            showErrorNotification(t("error") || "Ошибка", t("serviceModelNotSelected") || "Не выбрана модель для создания/обновления сервиса");
            return;
        }

        const start = values.start_msg || "";
        const tg = values.tg_group || "";

        try {
            const success = await createServiceModelData(start, tg, selectedModelId);

            if (success) {
                showNotification(modelData ? (t("serviceModelUpdated") || "Модель обновлена") : (t("serviceModelCreated") || "Модель создана"));

                const newData = await readServiceModelData();
                setModelData(newData);

                setHuntingModels(null);
                form.setFieldsValue({
                    start_msg: newData.start_msg || start,
                    tg_group: newData.tg_group || tg,
                });
                setButtonDisabled(true);
            } else {
                showErrorNotification(t("serviceModelSaveError") || "Ошибка при сохранении модели");
            }
        } catch (err) {
            console.error(t("serviceModelSaveError") || 'Ошибка при создании/обновлении модели', err);
            showErrorNotification(t("serviceModelSaveError") || "Ошибка при создании/обновлении модели");
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
        try {
            const response = await deleteServiceModelData();
            if (!response) {
                setDeleteLoading(false);
                console.error(t("serviceModelDeleteError") || "Ошибка при удалении модели:", response?.status);
                showErrorNotification(t("serviceModelDeleteError") || "Ошибка удаления модели");
                return;
            }
            setIsDeleteModalOpen(false);
            setDeleteConfirmation("");
            showNotification(t("serviceModelDeleted") || "Модель успешно удалена");
            form.resetFields();
            setModelData(null);
            setSelectedModelId(null);


            const huntingData = await serviceCheckHuntingModels();
            if (huntingData && Array.isArray(huntingData) && huntingData.length > 0) {
                setHuntingModels(huntingData);
                if (huntingData.length === 1) {
                    setSelectedModelId(huntingData[0].model_id);
                }
            } else {
                setHuntingModels([]);
            }
        } catch (err) {
            setDeleteLoading(false);
            setIsDeleteModalOpen(false);
            setDeleteConfirmation("");
            console.error(t("serviceModelDeleteError") || 'Ошибка удаления модели');
            showErrorNotification(t("serviceModelDeleteError") || "Ошибка удаления модели");
        } finally {
            setDeleteLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="create-model-container">
                <div className="loading-container">
                    <Spin size="large" />
                    <div className="loading-text">{t("serviceModelLoadingData") || "Загрузка данных..."}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="create-model-container">
            <div className="section-title create-model-header">
                <RobotOutlined/>
                {modelData ? (t("serviceModelEditTitle") || 'Редактирование модели сервиса') : (t("serviceModelCreateTitle") || 'Создание модели сервиса')}
                {modelData && (
                    <div className="status-indicator success">
                        <span>✓ {t("serviceModelActive") || "Модель активна"}</span>
                    </div>
                )}
            </div>
            <div className="section-description">
                {modelData
                    ? (t("serviceModelEditDesc") || 'Внесите изменения в настройки вашей модели сервиса')
                    : huntingModels === null
                        ? (t("serviceModelLoadingData") || 'Загрузка данных...')
                        : huntingModels.length === 0
                            ? (t("serviceModelNoHunting") || 'У вас нет моделей с поддержкой Lead Hunter')
                            : (t("serviceModelSelectModel") || 'Выберите модель для создания сервиса')
                }
            </div>

            {!modelData && huntingModels && huntingModels.length > 0 && (
                <div className="form-section model-name-section" style={{marginBottom: '24px'}}>
                    <div className="section-title">
                        📝 {t("serviceModelSelectionTitle") || "Выбор модели для сервиса"}
                    </div>
                    <div className="section-description">
                        {huntingModels.length === 1
                            ? (t("serviceModelFoundOne") || 'Найдена одна модель с поддержкой Lead Hunter')
                            : `${t("serviceModelFoundMany") || "Найдено моделей с поддержкой Lead Hunter:"} ${huntingModels.length}. ${t("serviceModelSelectOne") || "Выберите одну для создания сервиса."}`
                        }
                    </div>
                    <Select
                        size="large"
                        placeholder={t("serviceModelSelectPlaceholder") || "Выберите модель"}
                        style={{ width: '100%', marginTop: '12px' }}
                        value={selectedModelId}
                        onChange={handleModelSelect}
                        disabled={huntingModels.length === 1}
                        virtual={false}
                        popupMatchSelectWidth={false}
                        optionLabelProp={false}
                        getPopupContainer={(trigger) => trigger.parentElement}
                    >
                        {huntingModels && huntingModels.length > 0 && (
                            huntingModels.map((model) => (
                                <Select.Option key={model.model_id} value={model.model_id}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {getProviderInfo(model.provider).logo && (
                                                    <img
                                                        src={getProviderInfo(model.provider).logo}
                                                        alt={getProviderInfo(model.provider).name}
                                                        style={{
                                                            width: '20px',
                                                            height: '20px',
                                                            objectFit: 'contain',
                                                            flexShrink: 0
                                                        }}
                                                    />
                                                )}
                                                <span style={{
                                                    fontWeight: '500',
                                                    color: getProviderInfo(model.provider).color,
                                                    marginRight: '8px'
                                                }}>
                                                    {getProviderInfo(model.provider).name}
                                                </span>
                                                <span style={{
                                                    fontSize: '14px',
                                                    color: '#666',
                                                    marginLeft: '4px'
                                                }}>
                                                     {model.model_name}
                                                </span>
                                    </div>
                                </Select.Option>
                            ))
                        )}
                    </Select>
                </div>
            )}

            {/* Отображение провайдера */}
            {modelData && modelData.provider && (
                <div className="form-section model-name-section" style={{marginBottom: '24px'}}>
                    <div className="section-title">
                        🖋 {t("serviceModelProviderTitle") || "Провайдер AI"}
                    </div>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: `2px solid ${getProviderInfo(modelData.provider).color}`,
                        gap: '12px'
                    }}>
                        {getProviderInfo(modelData.provider).logo && (
                            <img
                                src={getProviderInfo(modelData.provider).logo}
                                alt={getProviderInfo(modelData.provider).name}
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    objectFit: 'contain'
                                }}
                            />
                        )}
                        <div style={{flex: 1}}>
                            <div style={{
                                fontSize: '18px',
                                fontWeight: '600',
                                color: getProviderInfo(modelData.provider).color,
                                marginBottom: '8px',
                                lineHeight: '1.2'
                            }}>
                                {getProviderInfo(modelData.provider).name}
                            </div>
                            {modelData.name && (
                                <div style={{
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    marginBottom: '6px',
                                    lineHeight: '1.3'
                                }}>
                                    {modelData.name}
                                </div>
                            )}
                            <div style={{
                                fontSize: '12px',
                                color: '#999',
                                lineHeight: '1.4'
                            }}>
                                {t("serviceModelSupportsHunting") || "Модель поддерживает режим Lead Hunter"}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {(modelData || selectedModelId) && (
                <Form
                    form={form}
                    name="serviceModel"
                    onFinish={onFinish}
                    onValuesChange={handleValuesChange}
                    layout="vertical"
                >

                <div className="form-section model-name-section">
                    <div className="section-title">
                        🚀 {t("serviceModelStartTitle") || "Стартовое сообщение"}
                    </div>
                    <div className="section-description">
                        {t("serviceModelStartDesc") || "Сообщение, которое пользователь увидит в начале диалога."}
                    </div>

                    <Form.Item
                        name="start_msg"
                        label={t("serviceModelStartLabel") || "Стартовое сообщение"}
                        rules={!modelData ? [
                            {
                                required: true,
                                message: t("serviceModelStartRequired") || "Пожалуйста, введите стартовое сообщение!",
                            },
                            {
                                whitespace: true,
                                message: t("serviceModelStartEmpty") || "Стартовое сообщение не может быть пустым!",
                            },
                        ] : []}
                    >
                        <TextArea
                            placeholder={t("serviceModelStartDefaultPlaceholder") || "Привет! Это стартовое сообщение"}
                            autoSize={{ minRows: 3, maxRows: 10 }}
                            size="large"
                        />
                    </Form.Item>
                </div>

                <div className="form-section model-name-section">
                    <div className="section-title">
                        📦 {t("serviceModelGroupTitle") || "Целевая группа Telegram"}
                    </div>
                    <div className="section-description">
                        {t("serviceModelGroupDesc") || "Имя публичной группы (t.me/...) в Telegram для пересылки лидов соответствующим условиям модели."}
                    </div>

                    <Form.Item
                        name="tg_group"
                        label={t("serviceModelGroupLabel") || "Telegram группа"}
                        rules={!modelData ? [
                            {
                                required: true,
                                message: t("serviceModelGroupRequired") || "Пожалуйста, введите Telegram группу!",
                            },
                            {
                                whitespace: true,
                                message: t("serviceModelGroupEmpty") || "Telegram группа не может быть пустой!",
                            },
                            {
                                pattern: /^@?[a-zA-Z0-9_]{5,}$/,
                                message: t("serviceModelGroupInvalid") || "Введите корректное имя группы (например: @my_group или my_group)",
                            },
                        ] : []}
                    >
                        <Input
                            placeholder={t("serviceModelGroupDefaultPlaceholder") || "@my_group"}
                            size="large"
                        />
                    </Form.Item>
                </div>

                <div className="create-model-buttons">
                    <Button
                        type="primary"
                        htmlType="submit"
                        disabled={isButtonDisabled}
                        size="large"
                    >
                        <RobotOutlined />
                        {modelData ? (t("serviceModelChangeButton") || 'Изменить модель') : (t("serviceModelCreateButton") || 'Создать модель')}
                    </Button>

                    {modelData && (
                        <Tooltip
                            title={isServiceRunning ? (t("serviceModelDeleteDisabledRunning") || "Нельзя удалить модель пока сервис работает. Сначала остановите сервис.") : ""}
                            placement="top"
                        >
                            <Button
                                type="primary"
                                danger
                                size="large"
                                onClick={handleDelete}
                                disabled={isServiceRunning}
                            >
                                {t("serviceModelDeleteButton") || "Удалить модель"}
                            </Button>
                        </Tooltip>
                    )}
                </div>
            </Form>
            )}

            <Modal
                title={
                    <span style={{ color: '#ff4d4f' }}>
                        <ExclamationCircleOutlined /> {t("serviceModelDeleteModalTitle") || "Подтверждение удаления модели"}
                    </span>
                }
                open={isDeleteModalOpen}
                onCancel={() => setIsDeleteModalOpen(false)}
                onOk={handleDeleteConfirm}
                confirmLoading={deleteLoading}
                okText={t("serviceModelDeleteButton") || "Удалить модель"}
                cancelText={t("cancel") || "Отмена"}
                okButtonProps={{ danger: true }}
                width={600}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <Alert
                        message={t("serviceModelDeleteModalWarning") || "Внимание! Это действие необратимо!"}
                        type="error"
                        showIcon
                    />
                    <div>
                        <Text strong style={{ color: '#ff4d4f' }}>
                            {t("serviceModelDeleteModalText1") || "Данные будут удалены безвозвратно без возможности восстановления."}
                        </Text>
                        <br />
                        <Text type="secondary">
                            {t("serviceModelDeleteModalText2") || "Настройки модели и связанные данные будут потеряны."}
                        </Text>
                    </div>
                    <div>
                        <Text strong>
                            {t("serviceModelDeleteModalConfirmText") || "Для окончательного подтверждения удаления модели введите"}{' '}
                            <Text code style={{ backgroundColor: '#ff4d4f', color: 'white', padding: '2px 4px' }}>
                                {t("serviceModelDeleteModalCodeText") || "yes"}
                            </Text>
                        </Text>
                        <Input
                            value={deleteConfirmation}
                            onChange={(e) => setDeleteConfirmation(e.target.value)}
                            placeholder={t("serviceModelDeleteModalInputPlaceholder") || "Введите 'yes' для окончательного подтверждения"}
                            style={{ marginTop: 8 }}
                            size="large"
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
}
