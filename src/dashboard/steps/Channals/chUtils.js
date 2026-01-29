// Функция проверки доступности канала
import {validateAndRefreshToken} from "../../../utils/easyUtils";
import {formatTgubotData, formatWhatsBotData} from "../../../widget/utils";


const LAND_URL = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND) || process.env.REACT_APP_LAND;

export async function chAvailable(chType) {
    try {
        const response = await fetch(`${LAND_URL}/available/${chType}`, {
            method: 'GET',
        });
        return response.ok;
    } catch (error) {
        console.error('Ошибка при проверке доступности:', error);
        return false;
    }
}

const showSimpleAuth = process.env.REACT_APP_SHOW_SIMPLE_AUTH === "false";

export const checkSubscription = async () => {
    if (showSimpleAuth) {
        // Фактическая проверка при взаимодействии осуществляется на сервере, ткчто это безопасно
        return true;
    }
    const token = await validateAndRefreshToken(localStorage.getItem("authToken"))
    if (token != null) {
        try {
            const response = await fetch(`${LAND_URL}/subscription?token=${encodeURIComponent(token)}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                // credentials: 'include', // Куки будут отправлены
            });

            if (!response.ok) {
                // If response is not ok, parse the error message
                const errorData = await response.json();
                console.error("SUBSCR_ERROR", errorData.error);
                return false;
            }

            return true;
        } catch (error) {
            console.error("SUBSCR_EXCEPTION", error);
            return false;
        }
    } else {
        return false
    }
};

// Функция для удаления канала пользователя
export async function deleteChannelData(token, channelType) {
    try {
        const response = await fetch(`${LAND_URL}/channel?token=${token}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: channelType
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ошибка при удалении канала');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Ошибка при удалении канала:', error);
        throw error;
    }
}

export async function getBotName(token, chName) {
    await new Promise(resolve => setTimeout(resolve, 250));
    try {
        const params = new URLSearchParams({ token, name: chName });
        const url = `${LAND_URL}/channel/name?${params.toString()}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(errorData.error || 'Ошибка чтения имени бота');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Ошибка чтения имени бота:', error);
        throw error;
    }
}

export const getWidgetCode = async (token) => {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await fetch(`${LAND_URL}/widget/code?token=${token}`, {
                method: "GET",
                headers: {"Content-Type": "application/json"},
            });
            const data = await response.json();
            if (response.ok) {
                resolve(data.widgetCode);
            } else {
                reject(data.message || "Failed to fetch widget code");
            }
        } catch (error) {
            reject(error);
        }
    });
};

export const readChannelData = async (token) => {
    try {
        // Проверка наличия токена
        if (!token) {
            throw new Error('Токен не предоставлен');
        }

        const response = await fetch(`${LAND_URL}/channel?token=${encodeURIComponent(token)}`, {
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

export const saveChannelData = async (channelType, data, uids, isEnabled, token) => {
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

        const response = await fetch(`${LAND_URL}/channel?token=${token}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
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
            return false
        }

        const result = await response.json();
        return response.ok && result.message === "ok";
    } catch (error) {
        console.error("Ошибка при сохранении канала:", error);
        return false;
    }
}

export async function restartActiveChannels(token, onMessage) {
    return new Promise((resolve, reject) => {
        try {
            const LAND_WSS = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND_WSS) || process.env.REACT_APP_LAND_WSS;
            const wsUrl = `${LAND_WSS}/ws/restart`;
            const wsUrlWithToken = `${wsUrl}?token=${encodeURIComponent(token)}`;

            const ws = new WebSocket(wsUrlWithToken);

            // Обработчик открытия соединения
            ws.onopen = () => {
                const msg = '🔌 Соединение с сервером установлено';
                if (onMessage) onMessage(msg);
            };

            // Обработчик сообщений от сервера
            ws.onmessage = (event) => {
                // Отправляем любое сообщение от сервера в callback
                if (onMessage) onMessage(event.data);

                try {
                    const data = JSON.parse(event.data);
                    if (data.status === 'success') {
                        // Не резолвим здесь, ждём закрытия соединения
                    } else if (data.error) {
                        reject(new Error(data.error));
                        ws.close();
                    }
                } catch (e) {
                    // Если это не JSON, это текстовое сообщение прогресса
                    // Уже отправлено в callback выше
                }
            };

            // Обработчик закрытия соединения
            ws.onclose = (event) => {
                // Если соединение закрылось нормально (код 1000), значит операция завершена
                if (event.code === 1000) {
                    const msg = '✅ Перезапуск сервисов завершен успешно';
                    if (onMessage) onMessage(msg);
                    resolve({ status: 'ok' });
                } else {
                    const msg = '❌ Произошла ошибка при перезапуске сервисов';
                    if (onMessage) onMessage(msg);
                    reject(new Error('Ошибка при перезапуске сервисов'));
                }
            };

            // Обработчик ошибок
            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                const msg = '❌ Ошибка соединения с сервером';
                if (onMessage) onMessage(msg);
                reject(new Error('Ошибка соединения с сервером'));
            };

        } catch (error) {
            console.error('Ошибка перезапуска активных каналов:', error);
            reject(error);
        }
    });
}
