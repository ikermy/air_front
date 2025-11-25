import React, { useState } from "react";
import {Button, Modal} from "antd";
import { showErrorNotification, showNotification, showWarningNotification } from "../hotification/showNotification";
import { validateAndRefreshToken } from "../../utils/easyUtils";
import { saveModelData } from "./saveModelData";

export const UpdateModel = ({ setButtonDisabled, modelData, form, isUploadingFiles }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const showModal = () => {
        setIsModalOpen(true);
    };

    const handleCancel = () => {
        setIsModalOpen(false);
    };

    const handleConfirm = async () => {
        setIsModalOpen(false);

        // Получаем актуальные значения формы в момент подтверждения
        const currentValues = form.getFieldsValue(true);

        const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
        if (token !== null) {
            const response = await saveModelData({
                token,
                // modelData,
                values: currentValues,
                isUpdate: true // Явно указываем, что это обновление
            });

            if (response.status === "ok") {
                showNotification("Модель обновлена", "Изменения успешно сохранены!");
                setButtonDisabled(true);
            } else {
                showErrorNotification("Ошибка обновления", "Модель не обновлена!");
                setButtonDisabled(false);
            }
        } else {
            showWarningNotification("Ошибка изменения модели", "Токен не обновлен!");
            setButtonDisabled(false);
        }
    };

    return (
        <div>
            <Button
                type="primary"
                onClick={showModal}
                disabled={!modelData || isUploadingFiles} // Кнопка неактивна если нет модели или загружаются файлы
                className="update-model-btn"
                size="large"
            >
                Изменить модель
            </Button>

            <Modal
                title="Подтверждение изменений"
                open={isModalOpen}
                onOk={handleConfirm}
                onCancel={handleCancel}
                okText="Подтвердить"
                cancelText="Отмена"
                okButtonProps={{
                    style: { color: 'black' }
                }}
            >
                <p>Вы уверены, что хотите сохранить изменения в модели?</p>
            </Modal>
        </div>
    );
};