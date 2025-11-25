import {formatTgubotData, formatWhatsBotData} from "../../widget/utils";

// const LAND_URL = process.env.REACT_APP_LAND;
const LAND_URL = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND) || process.env.REACT_APP_LAND;

export const saveChannelData = async (type, channelType, data, uids, isEnabled, token) => {
    try {
        let url
        switch (type) {
            case "channels":
                url = `${LAND_URL}/channel`
                break
            case "notifications":
                url = `${LAND_URL}/notifications`
                break
            default:
                console.error("Неподдерживаемый тип:", type)
                return false
        }

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

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                token: token,
                type: channelType,
                data: finalData,
                enabled: isEnabled
            }),
        });

        if (!response.ok) {
            console.error("Сервер вернул ошибку:", response.status);
            return false
        }

        const result = await response.json();
        return response.ok && result.message === "ok";
    } catch (error) {
        console.error("Ошибка при сохранении канала:", error);
        return false;
    }
}

