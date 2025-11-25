import {validateAndRefreshToken} from "../../../utils/easyUtils";
import {showErrorNotification, showNotification} from "../../hotification/showNotification";

export const deleteFile = async (fileId) => {
    const LAND_URL = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND) || process.env.REACT_APP_LAND;

    try {
        const token = await validateAndRefreshToken(localStorage.getItem("authToken"));

        if (!token) {
            showErrorNotification("Ошибка удаления", "Токен не обновлен!");
            return { status: "error" };
        }

        const requestData = {
            token: token,
            file_id: fileId
        };

        const response = await fetch(`${LAND_URL}/mod-filedel`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify(requestData),
        });

        const result = await response.json();

        if (response.ok && result.status === "ok") {
            showNotification("Файл удален", "Файл успешно удален из системы");
            return { status: "ok" };
        } else {
            showErrorNotification("Ошибка удаления", "Не удалось удалить файл");
            return { status: "error" };
        }

    } catch (error) {
        console.error("Ошибка при удалении файла:", error);
        showErrorNotification("Ошибка удаления", "Произошла ошибка при удалении файла");
        return { status: "error" };
    }
};
