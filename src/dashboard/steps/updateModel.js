import React, { useState } from "react";
import {Button, Modal} from "antd";
import { useTranslation } from "react-i18next";
import { showErrorNotification, showNotification, showWarningNotification } from "../hotification/showNotification";
import { validateAndRefreshToken } from "../../utils/easyUtils";
import {saveModelData} from "./CreateModelFormElements/modUtils";

export const UpdateModel = ({ setButtonDisabled, modelData, form, isUploadingFiles, onModelUpdated, isButtonDisabled, selectedProvider }) => {
    const { t } = useTranslation();
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
                isUpdate: true, // Явно указываем, что это обновление
                provider: selectedProvider // Передаем провайдер
            });

            if (response.status === "ok") {
                showNotification(
                    t("serviceModelUpdated") || "Модель обновлена",
                    t("serviceModelUpdateSuccess") || "Изменения успешно сохранены!"
                );
                setButtonDisabled(true);

                // Обновляем modelData в родительском компоненте
                if (onModelUpdated) {
                    onModelUpdated();
                }
            } else {
                showErrorNotification(
                    t("serviceModelUpdateError") || "Ошибка обновления",
                    t("serviceModelUpdateErrorMessage") || "Модель не обновлена!"
                );
                setButtonDisabled(false);
            }
        } else {
            showWarningNotification(
                t("serviceModelUpdateTokenError") || "Ошибка изменения модели",
                t("serviceModelUpdateTokenErrorMessage") || "Токен не обновлен!"
            );
            setButtonDisabled(false);
        }
    };

    return (
        <div>
            <Button
                type="primary"
                onClick={showModal}
                disabled={!modelData || isUploadingFiles || isButtonDisabled} // Кнопка неактивна если нет модели, загружаются файлы или нет изменений
                className="update-model-btn"
                size="large"
            >
                {t("serviceModelChangeButton") || "Изменить модель"}
            </Button>

            <Modal
                title={t("serviceModelUpdateConfirmTitle") || "Подтверждение изменений"}
                open={isModalOpen}
                onOk={handleConfirm}
                onCancel={handleCancel}
                okText={t("serviceModelUpdateConfirmButton") || "Подтвердить"}
                cancelText={t("cancelButton") || "Отмена"}
                okButtonProps={{
                    style: { color: 'black' }
                }}
                
            >
                <p>{t("serviceModelUpdateConfirmMessage") || "Вы уверены, что хотите сохранить изменения в модели?"}</p>
            </Modal>
        </div>
    );
};