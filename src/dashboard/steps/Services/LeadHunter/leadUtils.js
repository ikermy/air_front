import {validateAndRefreshToken} from "../../../../utils/easyUtils";

const LAND_URL = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND) || process.env.REACT_APP_LAND;

// Универсальная обертка над fetch: возвращает { ok, status, data, text }
async function request(url, options = {}) {
    try {
        const res = await fetch(url, options);
        const contentType = res.headers.get('content-type') || '';
        let data = null;
        let text = null;
        if (contentType.includes('application/json')) {
            try { data = await res.json(); } catch { data = null; }
        } else {
            try { text = await res.text(); } catch { text = null; }
        }
        return { ok: res.ok, status: res.status, data, text, res };
    } catch (err) {
        return { ok: false, status: 0, data: null, text: (err && err.message) || 'network error', error: err };
    }
}

export async function readServiceAccessTime(token) {
    const { ok, status, data } = await request(`${LAND_URL}/services/accounts/accesstime?token=${encodeURIComponent(token)}`, {
        method: "GET",
        headers: {"Content-Type": "application/json"},
    });
    if (!ok) {
        console.error(`Ошибка при получении AccessTime: ${status}`);
        return null;
    }
    return data;
}

export const saveServiceAccessTime = async (token, data) => {
    const { ok, status } = await request(`${LAND_URL}/services/accounts/accesstime?token=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ data }),
    });
    if (!ok) {
        console.error("Сервер вернул ошибку:", status);
        return false;
    }
    return true;
}

export async function readServiceModelData(token) {
    await new Promise(resolve => setTimeout(resolve, 250));

    const { ok, status, data } = await request(`${LAND_URL}/services/model?token=${encodeURIComponent(token)}`, {
        method: "GET",
        headers: {"Content-Type": "application/json"},
    });
    if (!ok) {
        console.error(`Ошибка при получении ModelData: ${status}`);
        return null;
    }
    return data;
}

export async function serviceCheckHuntingModels(token) {
    // Пауза 500 мс перед перезагрузкой списка контактов
    await new Promise(resolve => setTimeout(resolve, 250));

    const { ok, status, data } = await request(`${LAND_URL}/services/hunting-model?token=${encodeURIComponent(token)}`, {
        method: "GET",
        headers: {"Content-Type": "application/json"},
    });
    if (!ok) {
        console.error(`Ошибка при получении HuntingModels: ${status}`);
        return null;
    }
    return data;
}

export async function deleteServiceModelData(token) {
    const { ok, status } = await request(`${LAND_URL}/services/model?token=${encodeURIComponent(token)}`, {
        method: "DELETE",
        headers: {"Content-Type": "application/json"},
    });
    if (!ok) {
        console.error(`Ошибка при запросе DeleteModel: ${status}`);
        return false;
    }
    return true;
}

/**
 * Создание/обновление сервисной модели
 * @param {string} token - Токен авторизации
 * @param {string} start - Стартовое сообщение
 * @param {string} tg - Telegram группа
 * @param {number|null} modelId - ID модели из hunting models (только при создании новой)
 * @returns {Promise<boolean>}
 */
export async function createServiceModelData(token, start, tg, modelId = null) {
    const body = { start, tg };

    // Если передан modelId, добавляем его для привязки новой модели
    if (modelId !== null && modelId !== undefined) {
        body.model_id = Number(modelId);
    }

    const { ok, status, data } = await request(`${LAND_URL}/services/model?token=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
    });

    if (!ok) {
        console.error("Сервер вернул ошибку:", status, data);
        return false;
    }

    return true;
}

export async function readServiceContactsData(token) {
    // Пауза 500 мс перед перезагрузкой списка контактов
    await new Promise(resolve => setTimeout(resolve, 250));

    const { ok, status, data } = await request(`${LAND_URL}/services/contacts?token=${encodeURIComponent(token)}`, {
        method: "GET",
        headers: {"Content-Type": "application/json"},
    });
    if (!ok) {
        console.error(`Ошибка при получении ContactsData: ${status}`);
        return null;
    }
    let result = data;
    if (typeof result === 'string') {
        try { result = JSON.parse(result); } catch (e) {
            console.error('Ошибка при парсинге строки JSON:', e);
            return [];
        }
    }
    if (!Array.isArray(result)) {
        console.error('Данные контактов не являются массивом:', result);
        return [];
    }

    // Нормализуем ключи: приводим к формату с заглавной буквы
    const normalized = result.map(item => {
        if (!item || typeof item !== 'object') return null;

        return {
            Contact: item.Contact || item.contact || '',
            Result: item.Result || item.result || 'pending',
            Added: item.Added || item.added || null,
            Updated: item.Updated || item.updated || null,
            // Сохраняем остальные поля как есть
            ...item
        };
    });

    const filtered = normalized.filter(item => {
        return item && typeof item.Contact === 'string' && item.Contact.length > 0 && !item.Contact.includes('{') && !item.Contact.includes('"');
    });
    return filtered;
}

export async function saveServiceContactsData(token, contacts) {
    const contactsList = contacts?.map(c => c.Contact) || [];

    const payload = { contacts: contactsList };

    const { ok, status, data, text } = await request(`${LAND_URL}/services/contacts?token=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
    });

    if (!ok) {
        console.error("saveServiceContactsData - Сервер вернул ошибку:", status);
        console.error("saveServiceContactsData - Response data:", data);
        console.error("saveServiceContactsData - Response text:", text);
        return false;
    }
    return true;
}

export async function deleteServiceContact(token, contactId) {
    const { ok, status } = await request(`${LAND_URL}/services/contact/${encodeURIComponent(contactId)}?token=${encodeURIComponent(token)}`, {
        method: "DELETE",
        headers: {"Content-Type": "application/json"},
    });
    if (!ok) {
        console.error(`Ошибка при запросе DeleteContact: ${status}`);
        return false;
    }
    return true;
}

export async function deleteAllServiceContacts(token) {
    const url = `${LAND_URL}/services/contacts?token=${encodeURIComponent(token)}`;

    const { ok, status } = await request(url, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" } // необязательно
    });

    if (!ok) {
        console.error(`Ошибка при запросе DeleteAllContacts: ${status}`);
        return false;
    }
    return true;
}

export async function readServiceContactDialogData(token, contact) {
    const { ok, status, data } = await request(`${LAND_URL}/services/dialog?token=${encodeURIComponent(token)}&contact=${encodeURIComponent(contact)}`, {
        method: "GET",
        headers: {"Content-Type": "application/json"},
    });
    if (!ok) {
        console.error(`Ошибка при получении диалога: ${status}`);
        return null;
    }

    // Если data == null — ничего нет
    if (data == null) {
        console.warn('readServiceContactDialogData: пустой ответ', data);
        return null;
    }

    // Определяем sourceMessages: сервер может вернуть массив строк или объекта { Messages: [...] }
    let messages = null;
    let meta = null;
    if (Array.isArray(data)) {
        messages = data;
        meta = {};
    } else if (data && typeof data === 'object') {
        messages = data.Messages;
        meta = { ...data };
        delete meta.Messages; // метаданные без Messages
    } else {
        console.warn('readServiceContactDialogData: неожиданный формат data', data);
        return null;
    }

    if (!messages) {
        // Если нет поля Messages или пустой массив — вернём объект с пустыми Messages
        return { ...meta, Messages: [] };
    }

    // Если Messages — строка JSON, попытаемся распарсить в массив
    if (typeof messages === 'string') {
        try {
            messages = JSON.parse(messages);
        } catch (e) {
            console.error('readServiceContactDialogData: не удалось распарсить Messages из строки:', e);
            messages = [];
        }
    }

    if (!Array.isArray(messages)) {
        console.warn('readServiceContactDialogData: Messages не массив после попытки парсинга', messages);
        return { ...meta, Messages: [] };
    }

    const parsedMessages = messages.map((m) => {
        let obj = m;
        if (typeof m === 'string') {
            try {
                obj = JSON.parse(m);
            } catch (e) {
                console.warn('readServiceContactDialogData: пропускаем некорректную строку сообщения:', m);
                return null;
            }
        }

        if (obj && typeof obj === 'object') {
            if (obj.creator !== undefined && obj.message) {
                const content = (typeof obj.message === 'string') ? obj.message : (obj.message.message || '');
                const creator = obj.creator;
                const type = (creator === 1) ? 'assistant' : 'user';
                const uname = obj.uname || obj.username || null;
                const timestamp = obj.timestamp || obj.time || null;
                return { content, type, uname, timestamp };
            }

            if (obj.content !== undefined && obj.type !== undefined) {
                return { content: obj.content, type: obj.type, uname: obj.uname || null, timestamp: obj.timestamp || null };
            }

            const contentField = obj.message?.message || obj.text || obj.content || obj.body || '';
            const typeField = obj.type || (obj.from === 'agent' ? 'assistant' : (obj.creator === 1 ? 'assistant' : 'user'));
            const unameField = obj.uname || obj.username || null;
            const ts = obj.timestamp || obj.time || null;
            return { content: contentField || '', type: typeField || 'user', uname: unameField, timestamp: ts };
        }

        return null;
    }).filter(Boolean);

    return { ...meta, Messages: parsedMessages };
}

export async function readServiceAllBotInfo(token) {
    const doFetch = () => request(`${LAND_URL}/services/bots?token=${encodeURIComponent(token)}`, {
        method: "GET",
        headers: {"Content-Type": "application/json"},
    });
    let { ok, status, data } = await doFetch();
    if (!ok && (status === 429 || status === 503)) {
        await new Promise((r) => setTimeout(r, 600));
        ({ ok, status, data } = await doFetch());
    }
    if (!ok) {
        console.error(`Ошибка при получении информации о ботах пользователя: ${status}`);
        return null;
    }
    return data;
}

export const setServiceBotActive = async (token, botID, checked, provider) => {
    const { ok, status } = await request(`${LAND_URL}/services/dogs/bots/active?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botid: botID, active: checked, provider: provider}),
    });
    if (!ok) {
        console.error('Ошибка при изменении статуса бота:', status);
        return Promise.reject(new Error(`Ошибка ${status}`));
    }
    return true;
};

export const serviceDeleteBot = async (token, botID, provider) => {
    const { ok, status } = await request(
        `${LAND_URL}/services/dogs/bots/${encodeURIComponent(provider)}/${encodeURIComponent(botID)}?token=${encodeURIComponent(token)}`,
        {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
        }
    );
    if (!ok) {
        console.error('Ошибка при удалении бота:', status);
        return Promise.reject(new Error(`Ошибка ${status}`));
    }
    return true;
};

export const serviceBotAuthData = async (token, botID, provider) => {
    const { ok, status, data } = await request(`${LAND_URL}/services/dogs/bots/authdata?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botid: botID, provider: provider }),
    });
    if (!ok) {
        console.error('Ошибка при получении данных авторизации бота:', status);
        return Promise.reject(new Error(`Ошибка ${status}`));
    }
    return data;
};

export async function checkServiceInProcess(token) {
    const { status } = await request(`${LAND_URL}/services/status?token=${encodeURIComponent(token)}`, {
        method: "GET",
        headers: {"Content-Type": "application/json"},
    });
    return status === 200;
}

export const startServiceWSS = (token) => {
    const LAND_WSS = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND_WSS) || process.env.REACT_APP_LAND_WSS;
    const wsUrl = `${LAND_WSS}/ws/start?token=${encodeURIComponent(token)}`;
    return new WebSocket(wsUrl);
}

export async function stopService(token) {
    const { ok, status, text } = await request(`${LAND_URL}/services/stop?token=${encodeURIComponent(token)}`, {
        method: "GET",
        headers: {"Content-Type": "application/json"},
    });
    if (!ok) {
        const errorMessage = (text && text.trim()) || `HTTP ${status}`;
        console.error(`Ошибка при остановке сервиса:`, errorMessage);
        return { success: false, error: errorMessage };
    }
    return { success: true };
}

export const serviceTgAuthWSS = (token) => {
    const LAND_WSS = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND_WSS) || process.env.REACT_APP_LAND_WSS;
    const wsUrl = `${LAND_WSS}/ws/tgauth?token=${encodeURIComponent(token)}`;
    return new WebSocket(wsUrl);
}

export const serviceWaAuthWSS = (token) => {
    const LAND_WSS = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND_WSS) || process.env.REACT_APP_LAND_WSS;
    const wsUrl = `${LAND_WSS}/ws/waauth?token=${encodeURIComponent(token)}`;
    return new WebSocket(wsUrl);
}

export const serviceBotEventsWSS = (token) => {
    const LAND_WSS = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND_WSS) || process.env.REACT_APP_LAND_WSS;
    const wsUrl = `${LAND_WSS}/ws/srv_events?token=${encodeURIComponent(token)}`;
    return new WebSocket(wsUrl);
}

export async function readProxyData(token) {
    // Пауза 500 мс перед перезагрузкой списка контактов
    await new Promise(resolve => setTimeout(resolve, 250));

    const { ok, status, data } = await request(`${LAND_URL}/services/proxy?token=${encodeURIComponent(token)}`, {
        method: "GET",
        headers: {"Content-Type": "application/json"},
    });
    if (!ok) {
        console.error(`Ошибка при получении списка прокси: ${status}`);
        return null;
    }
    return data;
}

export const setServiceProxyActive = async (token, proxyID, checked) => {
    const { ok, status } = await request(`${LAND_URL}/services/proxy/active?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: proxyID, active: checked }),
    });
    if (!ok) {
        console.error('Ошибка при изменении статуса прокси:', status);
        return Promise.reject(new Error(`Ошибка ${status}`));
    }
    return true;
};

export const addServiceProxy = async (token, proxyAdr, proxyUsername = null, proxyPassword = null) => {
    const body = {
        adr: proxyAdr
    };

    // Добавляем username и password только если они указаны
    if (proxyUsername) body.usr = proxyUsername;
    if (proxyPassword) body.pass = proxyPassword;

    const { ok, status } = await request(`${LAND_URL}/services/proxy?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!ok) {
        console.error('Ошибка при добавлении прокси:', status);
        return Promise.reject(new Error(`Ошибка ${status}`));
    }
    return true;
};

export const editServiceProxy = async (token, proxyId, proxyAdr, proxyUsername = null, proxyPassword = null) => {
    const body = {
        id: proxyId,
        adr: proxyAdr
    };

    // Добавляем username и password только если они указаны
    if (proxyUsername) body.usr = proxyUsername;
    if (proxyPassword) body.pass = proxyPassword;

    const { ok, status } = await request(`${LAND_URL}/services/proxy/${encodeURIComponent(proxyId)}?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!ok) {
        console.error('Ошибка при изменении прокси:', status);
        return Promise.reject(new Error(`Ошибка ${status}`));
    }
    return true;
};

export const deleteServiceProxy = async (token, proxyId) => {
    const { ok, status } = await request(`${LAND_URL}/services/proxy/proxy/${encodeURIComponent(proxyId)}?token=${encodeURIComponent(token)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
    });
    if (!ok) {
        console.error('Ошибка при удалении прокси:', status);
        return Promise.reject(new Error(`Ошибка ${status}`));
    }
    return true;
};

export const deleteAllServiceProxy = async (token) => {
    const { ok, status } = await request(`${LAND_URL}/services/proxy/proxys?token=${encodeURIComponent(token)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
    });
    if (!ok) {
        console.error('Ошибка при удалении прокси:', status);
        return Promise.reject(new Error(`Ошибка ${status}`));
    }
    return true;
};

export const saveServiceSetting = async (token, setting) => {
    const { ok, status } = await request(`${LAND_URL}/services/settings?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ set: setting }),
    });
    if (!ok) {
        console.error('Ошибка при сохранении настроек:', status);
        return Promise.reject(new Error(`Ошибка ${status}`));
    }
    return true;
};

/**
 * Проверяет доступность сервиса
 * @param {string} token - Токен авторизации
 * @returns {Promise<boolean>} true если сервис доступен, false в противном случае
 */
export async function checkServiceAvailable(token) {
    const { ok, status } = await request(
        `${LAND_URL}/services/available?token=${encodeURIComponent(token)}`,
        {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        }
    );

    if (!ok || status !== 200) {
        console.error(`Сервис недоступен: ${status}`);
        return false;
    }

    return true;
}
