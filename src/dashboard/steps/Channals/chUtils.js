// Функция проверки доступности канала
import {formatTgubotData, formatWhatsBotData} from "../../../widget/utils/formatting";
import {getAuthToken, refreshToken, authFetch} from "../../../utils/easyUtils";


export async function chAvailable(chType) {
    const encoded = encodeURIComponent(chType);
    const url = `/v1/channel/available/${encoded}`;

    try {
        const response = await authFetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
        });

        if (!response.ok) {
            // Попробуем вытащить JSON с ошибкой
            let errMsg = response.statusText;
            try {
                const errData = await response.json();
                if (errData && errData.error) {
                    errMsg = errData.error;
                }
            } catch (_) {}
            console.error(`Ошибка при проверке канала ${chType}:`, response.status, errMsg);
            return false;
        }

        // При 200 сервер возвращает {"available": true}
        const data = await response.json();
        return !!data.available;
    } catch (error) {
        console.error(`Ошибка при проверке канала ${chType}:`, error);
        return false;
    }
}

// const showSimpleAuth = false;

export const checkSubscription = async () => {
    // if (showSimpleAuth) {
    //     // Фактическая проверка при взаимодействии осуществляется на сервере, ткчто это безопасно
    //     return true;
    // }

    try {
        const response = await authFetch(`/v1/auth/check-subscription`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("SUBSCR_ERROR", errorData.error);
            return false;
        }

        return true;
    } catch (error) {
        console.error("SUBSCR_EXCEPTION", error);
        return false;
    }
};

// Функция для удаления канала пользователя
export async function deleteChannelData(channelType) {
    try {
        const response = await authFetch(`/v1/channel`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ type: channelType })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Ошибка при удалении канала');
        }

        const data = await response.json();

        // Очищаем кэш после успешного удаления
        invalidateChannelDataCache();

        return data;
    } catch (error) {
        console.error('Ошибка при удалении канала:', error);
        throw error;
    }
}

export async function getBotName(chName) {
    try {
        const params = new URLSearchParams({ name: chName });
        const url = `/v1/channel/name?${params.toString()}`;

        const response = await authFetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
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

export const getWidgetCode = async (payload) => {
    try {
        const requestPayload = {
            ...payload,
            allowedUrls: payload.allowedUrls || payload.allowedUrls || [],
        };

        const response = await authFetch(`/v1/widget/code`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestPayload),
        });

        const data = await response.json().catch(() => ({}));
        if (response.ok) {
            return data.widgetCode;
        } else {
            const error = new Error(data.message || "Failed to fetch widget code");
            error.status = response.status;
            throw error;
        }
    } catch (error) {
        throw error;
    }
};

// Кэш для предотвращения дублирования запросов
let readChannelDataCache = null;
let readChannelDataCacheTimestamp = 0;
let readChannelDataPendingRequest = null;
const CACHE_DURATION = 5000; // 5 секунд

export const readChannelData = async () => {
    try {
        // Проверка кэша
        const now = Date.now();
        if (readChannelDataCache && (now - readChannelDataCacheTimestamp) < CACHE_DURATION) {
            console.log('Возвращаем данные из кэша');
            return readChannelDataCache;
        }

        // Если уже есть активный запрос, ждём его завершения (дедупликация)
        if (readChannelDataPendingRequest) {
            console.log('Ожидаем завершения существующего запроса');
            return await readChannelDataPendingRequest;
        }

        // Создаём новый запрос
        readChannelDataPendingRequest = (async () => {
            try {
                const response = await authFetch(`/v1/channel`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                });

                // Проверка ответа
                if (!response.ok) {
                    if (response.status === 401) {
                        throw new Error('Недействительный токен авторизации');
                    } else if (response.status === 429) {
                        throw new Error('Слишком много запросов, попробуйте позже');
                    } else {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.error || 'Ошибка получения каналов');
                    }
                }

                // Получение данных из ответа
                const data = await response.json();

                // Сохраняем в кэш
                readChannelDataCache = data;
                readChannelDataCacheTimestamp = Date.now();

                return data;
            } finally {
                // Очищаем pending request после завершения
                readChannelDataPendingRequest = null;
            }
        })();

        return await readChannelDataPendingRequest;
    } catch (error) {
        console.error('Ошибка при получении каналов:', error);
        throw error;
    }
}

// Функция для очистки кэша (используется после изменения данных каналов)
export const invalidateChannelDataCache = () => {
    readChannelDataCache = null;
    readChannelDataCacheTimestamp = 0;
    readChannelDataPendingRequest = null;
};

export const saveChannelData = async (channelType, data, uids, isEnabled) => {
    try {
        var finalData
        switch (channelType) {
            case "tgubot":
                // Используем функцию форматирования для tgubot
                finalData = formatTgubotData(data, uids);
                break;
            case "whatsbot":
                // Для WhatsApp бота просто сериализуем данные
                finalData = formatWhatsBotData(data, uids);
                break;
            default:
                // Backend ожидает поле data именно строкового типа.
                // Объект конфигурации Widget предварительно сериализуем в JSON.
                finalData = typeof data === "string" ? data : JSON.stringify(data ?? {});
        }

        const response = await authFetch(`/v1/channel`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
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
            return false;
        }

        const result = await response.json().catch(() => ({}));

        // Очищаем кэш после успешного сохранения
        if (response.ok && result.message === "ok") {
            invalidateChannelDataCache();
        }

        return response.ok && result.message === "ok";
    } catch (error) {
        console.error("Ошибка при сохранении канала:", error);
        return false;
    }
}

export async function restartActiveChannels(onMessage) {
    // Получаем актуальный токен
    let validToken = getAuthToken();

    if (!validToken) {
        // Пробуем обновить если нет STA
        validToken = await refreshToken();
        if (!validToken) {
            throw new Error('Сессия недействительна и не удалось получить токен');
        }
    }

    return new Promise((resolve, reject) => {
        try {
            const wsUrl = `/v1/ws/restart`;
            const ws = new WebSocket(wsUrl, [validToken]);

            ws.onopen = () => {
                // уведомим caller что соединение установлено
                if (typeof onMessage === 'function') onMessage('🔌 Соединение с сервером установлено');
            };

            ws.onmessage = (ev) => {
                const msg = typeof ev.data === 'string' ? ev.data : JSON.stringify(ev.data);
                if (typeof onMessage === 'function') onMessage(msg);

                // Если сервер сигнализирует об окончании перезапуска — резолвим промис
                if (msg && (msg.includes('Перезапуск сервисов завершен') || msg.includes('Перезапуск сервисов завершен успешно') || msg.includes('restart completed') || msg.includes('✅ Перезапуск')) ) {
                    // даём время на получение последних сообщений и закрываем ws
                    setTimeout(() => {
                        try { ws.close(1000, 'completed'); } catch (e) {}
                    }, 500);
                }
            };

            ws.onclose = (event) => {
                if (typeof onMessage === 'function') onMessage(`📝 Соединение закрыто (код: ${event.code})`);
                // Если закрытие нормальное — считаем задачу выполненной
                if (event.code === 1000) {
                    resolve();
                } else {
                    // Для других кодов завершаем так же, но с предупреждением
                    resolve();
                }
            };

            ws.onerror = (err) => {
                console.error('restartActiveChannels ws error:', err);
                try { ws.close(); } catch (e) {}
                reject(new Error('Ошибка WebSocket при перезапуске сервисов'));
            };
        } catch (error) {
            reject(error);
        }
    });
 }
