import React, {useState, useRef, useEffect} from "react";
import {Button, Modal, Input, Alert, Divider, Spin, Progress, Typography} from "antd";
import {
    ExclamationCircleOutlined,
    DeleteOutlined,
    CheckCircleOutlined
} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import {getAuthToken} from "../../utils/easyUtils";
// Токен читается напрямую из localStorage. Обновление токена не делаем здесь.
import {showErrorNotification, showNotification, showWarningNotification} from "../hotification/showNotification";

const {Text, Title} = Typography;

export const DeleteModel = ({onModelDeleted, selectedProvider}) => {
    const {t} = useTranslation();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState('');
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteProgressVisible, setDeleteProgressVisible] = useState(false);
    const [deleteMessages, setDeleteMessages] = useState([]);
    const [deleteComplete, setDeleteComplete] = useState(false);

    // Ref для WebSocket соединения
    const wsRef = useRef(null);

    // Очистка WebSocket соединения при размонтировании компонента
    useEffect(() => {
        return () => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.close();
            }
        };
    }, []);

    const showModal = () => {
        setIsModalOpen(true);
        setDeleteConfirmation('');
    };

    const handleCancel = () => {
        setIsModalOpen(false);
        setDeleteConfirmation('');
    };

    const handleConfirm = async () => {
        if (deleteConfirmation !== 'yes') {
            return;
        }

        try {
            setDeleteLoading(true);
            setIsModalOpen(false); // Закрываем модальное окно подтверждения
            setDeleteProgressVisible(true); // Показываем окно прогресса
            setDeleteMessages([]);
            setDeleteComplete(false);

            // Просто берём токен
            const token = getAuthToken();
            if (!token) {
                showWarningNotification(
                    t("serviceModelDeleteTokenError") || "Ошибка удаления модели",
                    t("serviceModelDeleteTokenErrorMessage") || "Токен не найден, необходимо повторно авторизоваться"
                );
                setDeleteLoading(false);
                setDeleteProgressVisible(false);
                return;
            }

            const wsUrl = `/v1/ws/delete-model`;
            const providerParam = selectedProvider ? `?provider=${selectedProvider}` : '';
            const wsUrlWithToken = `${wsUrl}${providerParam}`;
            wsRef.current = new WebSocket(wsUrlWithToken, [token]);

            // Обработчик открытия соединения
            wsRef.current.onopen = () => {
                setDeleteMessages(prev => [...prev, t("serviceModelDeleteConnectionEstablished") || '🔌 Соединение с сервером установлено']);
            };

            // Обработчик сообщений от сервера
            wsRef.current.onmessage = (event) => {
                // Добавляем любое сообщение от сервера в список
                setDeleteMessages(prev => [...prev, event.data]);

                try {
                    const data = JSON.parse(event.data);
                    if (data.status === 'success') {
                        setDeleteComplete(true);
                    } else if (data.error) {
                        showErrorNotification(
                            t("serviceModelDeleteError") || "Ошибка удаления",
                            `${data.error}`
                        );
                    }
                } catch (e) {
                    // Если это не JSON, это текстовое сообщение прогресса
                    // Уже добавлено в список сообщений выше
                }
            };

            // Обработчик закрытия соединения
            wsRef.current.onclose = (event) => {

                // Если соединение закрылось нормально (код 1000), значит операция завершена
                if (event.code === 1000) {
                    setDeleteMessages(prev => [...prev, t("serviceModelDeleteSuccess") || '✅ Операция удаления модели завершена успешно']);
                    setDeleteComplete(true);

                    setTimeout(() => {
                        showNotification(
                            t("serviceModelDeleteNotificationTitle") || "Модель агента",
                            t("serviceModelDeleteNotificationSuccess") || "Успешно удалена!"
                        );
                        setDeleteProgressVisible(false);

                        // Сохраняем в localStorage что модель удалена и вызываем callback
                        localStorage.setItem("userModel", false);
                        if (onModelDeleted) onModelDeleted();
                    }, 3000);
                } else {
                    setDeleteMessages(prev => [...prev, t("serviceModelDeleteErrorMessage") || '❌ Произошла ошибка при удалении модели']);
                    showErrorNotification(
                        t("serviceModelDeleteError") || "Ошибка удаления",
                        t("serviceModelDeleteNotificationError") || "Модели агента"
                    );
                }

                setDeleteLoading(false);
            };

            // Обработчик ошибок
            wsRef.current.onerror = (error) => {
                console.error('WebSocket error:', error);
                setDeleteMessages(prev => [...prev, t("serviceModelDeleteConnectionError") || '❌ Ошибка соединения с сервером']);
                showErrorNotification(
                    t("serviceModelDeleteError") || "Ошибка удаления",
                    t("serviceModelDeleteConnectionError") || "Ошибка соединения с сервером"
                );
                setDeleteLoading(false);
            };

        } catch (error) {
            showErrorNotification(
                t("serviceModelDeleteError") || "Ошибка удаления",
                t("serviceModelDeleteNotificationError") || "Модели агента"
            );
            console.error('Error deleting model:', error);
            setDeleteLoading(false);
            setDeleteProgressVisible(false);
        }
    };

    return (
        <div>
            <Button
                type="primary"
                danger
                onClick={showModal}
                size="large"
            >
                {t("serviceModelDeleteButton") || "Удалить модель"}
            </Button>

            {/* Модальное окно подтверждения удаления */}
            <Modal
                title={
                    <span style={{color: '#ff4d4f'}}>
                        <ExclamationCircleOutlined/> {t("serviceModelDeleteModalTitle") || "Подтверждение удаления модели"}
                    </span>
                }
                open={isModalOpen}
                onCancel={handleCancel}
                onOk={handleConfirm}
                confirmLoading={deleteLoading}
                okText={t("serviceModelDeleteButton") || "Удалить модель"}
                cancelText={t("cancelButton") || "Отмена"}
                okButtonProps={{danger: true}}
                width={600}

            >
                <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                    <Alert
                        message={t("serviceModelDeleteModalWarning") || "Внимание! Это действие необратимо!"}
                        type="error"
                        showIcon
                    />

                    <div>
                        <Text strong style={{color: '#ff4d4f'}}>
                            {t("serviceModelDeleteModalText1") || "Модель агента будет удалена безвозвратно без возможности восстановления."}
                        </Text>
                        <br/>
                        <Text type="secondary">
                            {t("serviceModelDeleteModalText2") || "Вся конфигурация модели, настройки и связанные данные будут потеряны."}
                        </Text>
                    </div>

                    <div>
                        <Text strong>
                            {t("serviceModelDeleteModalConfirmText") || "Для окончательного подтверждения удаления модели введите"}{' '}
                            <Text code style={{backgroundColor: '#ff4d4f', color: 'white', padding: '2px 4px'}}>
                                {t("serviceModelDeleteModalCodeText") || "yes"}
                            </Text>
                        </Text>
                        <Input
                            value={deleteConfirmation}
                            onChange={(e) => setDeleteConfirmation(e.target.value)}
                            placeholder={t("serviceModelDeleteModalInputPlaceholder") || "Введите 'yes' для окончательного подтверждения"}
                            style={{marginTop: 8}}
                            size="large"
                        />
                    </div>
                </div>
            </Modal>

            {/* Модальное окно прогресса удаления */}
            <Modal
                title={
                    <span style={{color: '#ff4d4f'}}>
                        <DeleteOutlined/> {t("serviceModelDeleteProgressTitle") || "Удаление модели агента"}
                    </span>
                }
                open={deleteProgressVisible}
                footer={null}
                closable={false}
                centered
                width={700}
                mask={{ closable: false }}

                className="delete-progress-modal"
            >
                <div className="delete-progress-container">
                    {!deleteComplete && (
                        <div className="delete-progress-header">
                            <Spin size="large"/>
                            <Title level={4} style={{margin: '16px 0', color: '#ff4d4f'}}>
                                {t("serviceModelDeleteProgressMessage") || "Выполняется удаление модели..."}
                            </Title>
                            <Text type="secondary">
                                {t("serviceModelDeleteProgressWait") || "Пожалуйста, дождитесь завершения операции. Не закрывайте это окно."}
                            </Text>
                        </div>
                    )}

                    {deleteComplete && (
                        <div className="delete-complete-header">
                            <CheckCircleOutlined style={{fontSize: '48px', color: '#52c41a'}}/>
                            <Title level={4} style={{margin: '16px 0', color: '#52c41a'}}>
                                {t("serviceModelDeleteCompleteTitle") || "Удаление модели завершено успешно!"}
                            </Title>
                            <Text type="secondary">
                                {t("serviceModelDeleteCompleteMessage") || "Модель агента удалена. Окно закроется автоматически..."}
                            </Text>
                        </div>
                    )}

                    <Divider/>

                    <div className="delete-messages-container">
                        <Text strong style={{marginBottom: '12px', display: 'block'}}>
                            {t("serviceModelDeleteLogTitle") || "Журнал операций:"}
                        </Text>

                        <div className="delete-messages-list">
                            {deleteMessages.map((msg, index) => (
                                <div key={index} className="delete-message-item">
                                    <span className="delete-message-time">
                                        {new Date().toLocaleTimeString()}
                                    </span>
                                    <Text className="delete-message-text">{msg}</Text>
                                </div>
                            ))}

                            {deleteMessages.length === 0 && !deleteComplete && (
                                <div className="delete-message-item">
                                    <Text
                                        type="secondary">{t("serviceModelDeleteLogWaiting") || "Ожидание сообщений от сервера..."}</Text>
                                </div>
                            )}
                        </div>
                    </div>

                    {deleteLoading && (
                        <div className="delete-progress-bar-container">
                            <Progress
                                percent={Math.min((deleteMessages.length / 5) * 100, 100)}
                                status="active"
                                strokeColor="#ff4d4f"
                                showInfo={true}
                                format={(percent) => `${Math.round(percent)}%`}
                            />
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
};
