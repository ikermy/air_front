import React, { useState, useImperativeHandle, forwardRef } from "react";
import {Button, Modal} from "antd";
import { useTranslation } from "react-i18next";
import { showErrorNotification, showNotification } from "../hotification/showNotification";
import {saveModelData} from "./CreateModelFormElements/modUtils";

export const UpdateModel = forwardRef(({ setButtonDisabled, modelData, form, isUploadingFiles, onModelUpdated, isButtonDisabled, selectedProvider }, ref) => {
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
        const response = await saveModelData({
            values: currentValues,
            isUpdate: true, // Явно указываем, что это обновление
            provider: selectedProvider, // Передаем провайдер
            useModelName: {
                gpttype: currentValues.gpttype ?? null,
                realtime: currentValues.realtime_gpttype ?? null,
            }
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
    };

    // Предоставляем доступ к handleConfirm через ref
    useImperativeHandle(ref, () => ({
        triggerUpdate: () => {
            void handleConfirm();
        }
    }));

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
});
