import { authFetch } from '../utils/easyUtils';

export const getUserDetails = async () => {
    try {
        const response = await authFetch(`/v1/user/details`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            },
        });

        if (!response.ok) {
            return { status: "error" };
        }

        const data = await response.json();

        return {
            status: "ok",
            ...data,
        };
    } catch (error) {
        console.error("Ошибка при получении данных пользователя:", error);
        return { status: "error" };
    }
};