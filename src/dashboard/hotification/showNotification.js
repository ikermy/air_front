import { notification } from "antd";
import {CheckCircleOutlined, ExclamationCircleOutlined, CloseCircleOutlined, BellOutlined} from "@ant-design/icons";

// Создаем глобальный экземпляр notification API
let globalNotificationApi = null;

// Инициализируем notification API
// const initializeNotificationApi = () => {
//     if (!globalNotificationApi) {
//         const [api] = notification.useNotification();
//         globalNotificationApi = api;
//     }
//     return globalNotificationApi;
// };

// Функция для получения notification API
const getNotificationApi = () => {
    if (globalNotificationApi) {
        return globalNotificationApi;
    }

    // Fallback к глобальному notification API если хук недоступен
    return notification;
};

export const showNotification = (title, message) => {
    const api = getNotificationApi();
    api.open({
        title,
        description: message,
        placement: "topRight",
        icon: <CheckCircleOutlined style={{ color: "var(--conected-color)" }}/>,
    });
};

export const showWarningNotification = (title, message) => {
    const api = getNotificationApi();
    api.open({
        title,
        description: message,
        placement: "topRight",
        icon: <ExclamationCircleOutlined style={{ color: "var(--warning-color)" }}/>,
    });
};

export const showErrorNotification = (title, message) => {
    const api = getNotificationApi();
    api.open({
        title,
        description: message,
        placement: "topRight",
        icon: <CloseCircleOutlined style={{ color: "var(--error-color)" }}/>,
    });
};

export const showInstantNotification = (title, message) => {
    const api = getNotificationApi();
    api.open({
        title,
        description: message,
        placement: "topRight",
        duration: 4.5, // можно увеличить время показа для важных уведомлений
        icon: <BellOutlined style={{ color: "var(--blue-color)" }}/>,
    });
};

// Хук для инициализации notification API в компонентах верхнего уровня
export const useNotificationInit = () => {
    const [api, contextHolder] = notification.useNotification();
    globalNotificationApi = api;
    return { contextHolder };
};
