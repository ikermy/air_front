import {formatTgubotData, formatWhatsBotData} from "../../../widget/utils";

const LAND_URL = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND) || process.env.REACT_APP_LAND;

export const deleteNotifChanel = async (token, chanel) => {
    try {
        const response = await fetch(`${LAND_URL}/nota?token=${token}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                chan: chanel,
            }),
        });

        if (!response.ok) {
            console.error("Сервер вернул ошибку:", response.status);
            return false
        } else {
            return true
        }

    } catch (error) {
        console.error("Ошибка при удалении канала:", error);
        return false
    }
}

export const getMail = async (token) => {
    try {
        const response = await fetch(`${LAND_URL}/nota/mail?token=${encodeURIComponent(token)}`, {
            method: "GET",
            headers: {"Content-Type": "application/json"},
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Ошибка при получении email:", error);
        throw error;
    }
};

export const saveNotifEvent = async (token, start, end, target) => {
    try {
        const response = await fetch(`${LAND_URL}/nota/events?token=${token}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                start: start,
                end: end,
                target: target,
            }),
        });

        if (!response.ok) {
            console.error("Сервер вернул ошибку:", response.status);
            return { success: false, active_channels: false }
        }

        const result = await response.json();
        return {
            success: true,
            active_channels: result.active_channels || false
        }

    } catch (error) {
        console.error("Ошибка при сохранении канала:", error);
        return { success: false, active_channels: false }
    }
}

export const sendVerifCode = async (token, telegramId, pin) => {
    try {
        const response = await fetch(`${LAND_URL}/nota/code?token=${token}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                id: telegramId,
                pin: String(pin)
            }),
        });

        if (!response.ok) {
            console.error("Сервер вернул ошибку:", response.status);
            return
        }

        const result = await response.json();
        return response.ok && result.send === "ok";
    } catch (error) {
        console.error("Ошибка при сохранении канала:", error);
    }
}

export const readNotificationsData = async (token) => {
    try {
        // Проверка наличия токена
        if (!token) {
            throw new Error('Токен не предоставлен');
        }

        const response = await fetch(`${LAND_URL}/nota?token=${encodeURIComponent(token)}`, {
            method: "GET",
            headers: {"Content-Type": "application/json"},
        });

        // Проверка ответа
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Недействительный токен авторизации');
            } else if (response.status === 429) {
                throw new Error('Слишком много запросов, попробуйте позже');
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Ошибка получения каналов');
            }
        }

        // Получение данных из ответа
        return await response.json();
    } catch (error) {
        console.error('Ошибка при получении каналов:', error);
        throw error;
    }
}

export const saveNotificationsData = async (channelType, data, uids, isEnabled, token) => {
    console.log("saveNotificationsData called with:", {channelType, data, uids, isEnabled, token});
    try {
        var finalData
        switch (channelType) {
            case "tgubot":
                // Используем функцию форматирования для tgubot
                finalData = formatTgubotData(data, uids);
                break;
            case "whatsbot":
                // Для WhatsApp бота просто сериализуем данные
                // finalData = JSON.stringify(data);
                finalData = formatWhatsBotData(data, uids);
                break;
            default:
                // Для остальных типов каналов просто используем данные как есть
                finalData = data
        }

        const response = await fetch(`${LAND_URL}/nota`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                'Authorization': `Bearer ${token}`
            },
            credentials: "include",
            body: JSON.stringify({
                type: channelType,
                data: finalData,
                enabled: isEnabled
            }),
        });

        if (!response.ok) {
            console.error("Сервер вернул ошибку:", response.status);
            return { success: false, active_channels: false }
        }

        let result;

        try {
            const text = await response.text();
            console.log("response text:", text);

            if (!text || text.trim() === '') {
                console.warn("Пустой ответ от сервера, считаем успешным");
                return {
                    success: true,
                    active_channels: false
                }
            }

            result = JSON.parse(text);

        } catch (parseError) {
            console.error("Ошибка парсинга JSON:", parseError);
            // Если не удалось распарсить, но статус 200, считаем успешным
            if (response.status === 200) {
                return {
                    success: true,
                    active_channels: false
                }
            }
            return { success: false, active_channels: false }
        }

        return {
            success: response.status === 200 || result.message === "ok",
            active_channels: result.active_channels || false
        }
    } catch (error) {
        console.error("Ошибка при сохранении канала:", error);
        return { success: false, active_channels: false }
    }
}
