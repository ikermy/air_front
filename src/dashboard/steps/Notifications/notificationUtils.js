import {formatTgubotData, formatWhatsBotData} from "../../../widget/utils/formatting";
import {authFetch} from "../../../utils/easyUtils";

export const deleteNotifChanel = async (chanel) => {
    try {
        const response = await authFetch(`/v1/nota`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({chan: chanel}),
        });

        return response.ok;
    } catch (error) {
        console.error("Ошибка при удалении канала:", error);
        return false
    }
}

export const getMail = async () => {
    try {
        const response = await authFetch(`/v1/nota/mail`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
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

export const saveNotifEvent = async (start, end, target) => {
    try {
        const response = await authFetch(`/v1/nota/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({start, end, target}),
        });

        if (!response.ok) {
            console.error("Сервер вернул ошибку:", response.status);
            return {success: false, active_channels: false}
        }

        const result = await response.json();
        return {
            success: true,
            active_channels: result.active_channels || false
        }

    } catch (error) {
        console.error("Ошибка при сохранении канала:", error);
        return {success: false, active_channels: false}
    }
}

export const sendVerifCode = async (telegramId, pin) => {
    try {
        const response = await authFetch(`/v1/nota/code`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({id: telegramId, pin: String(pin)}),
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

export const readNotificationsData = async () => {
    try {
        const response = await authFetch(`/v1/nota`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

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

        return await response.json();
    } catch (error) {
        console.error('Ошибка при получении каналов:', error);
        throw error;
    }
}

export const saveNotificationsData = async (channelType, data, uids, isEnabled) => {
    try {
        var finalData
        switch (channelType) {
            case "tgubot":
                finalData = formatTgubotData(data, uids);
                break;
            case "whatsbot":
                finalData = formatWhatsBotData(data, uids);
                break;
            default:
                finalData = data
        }

        const response = await authFetch(`/v1/nota`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({type: channelType, data: finalData, enabled: isEnabled}),
        });


        if (!response.ok) {
            console.error("Сервер вернул ошибку:", response.status);
            return {success: false, active_channels: false}
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
            if (response.status === 200) {
                return {
                    success: true,
                    active_channels: false
                }
            }
            return {success: false, active_channels: false}
        }

        return {
            success: response.status === 200 || result.message === "ok",
            active_channels: result.active_channels || false
        }
    } catch (error) {
        console.error("Ошибка при сохранении канала:", error);
        return {success: false, active_channels: false}
    }
}
