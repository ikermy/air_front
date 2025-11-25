import React, { useState } from 'react';
import { Button, Modal } from 'antd';
import { restartContainer } from '../utils/restartContainer';
import { showNotification, showErrorNotification, showWarningNotification } from '../dashboard/hotification/showNotification';

const RestartServerButton = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isRestarting, setIsRestarting] = useState(false);

    const showRestartConfirmation = () => {
        setIsModalVisible(true);
    };

    const handleCancelRestart = () => {
        setIsModalVisible(false);
    };

    const handleConfirmRestart = async () => {
        try {
            setIsRestarting(true);
            const token = localStorage.getItem("authToken");

            if (!token) {
                showWarningNotification("Ошибка авторизации", "Необходимо авторизоваться");
                setIsModalVisible(false);
                setIsRestarting(false);
                return;
            }

            await restartContainer(token);

            setIsModalVisible(false);
            setIsRestarting(false);

            showNotification(
                "Перезапуск сервера",
                "Сервер будет перезапущен. Страница автоматически обновится через 30 секунд."
            );

            // Задержка перед обновлением страницы, чтобы сервер успел перезапуститься
            setTimeout(() => {
                window.location.reload();
            }, 30000);

        } catch (error) {
            setIsRestarting(false);
            setIsModalVisible(false);
            showErrorNotification("Ошибка", `Не удалось перезапустить сервер: ${error.message}`);
        }
    };

    return (
        <>
            <Button
                type="primary"
                danger
                onClick={showRestartConfirmation}
                style={{ marginLeft: '10px' }}
            >
                Перезапустить сервер
            </Button>

            <Modal
                title="Подтверждение перезапуска"
                open={isModalVisible}
                onOk={handleConfirmRestart}
                onCancel={handleCancelRestart}
                okText="Перезапустить"
                cancelText="Отмена"
                confirmLoading={isRestarting}
            >
                <p>Вы уверены, что хотите перезапустить сервер?</p>
                <p>Все текущие соединения будут прерваны и сервис будет недоступен на некоторое время.</p>
            </Modal>
        </>
    );
};

export default RestartServerButton;
