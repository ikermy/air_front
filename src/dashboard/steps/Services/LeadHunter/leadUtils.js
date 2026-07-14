import {authFetch, getAuthToken} from '../../../../utils/easyUtils';


// Универсальная обертка над fetch: возвращает { ok, status, data, text }
async function request(url, options = {}) {
    try {
        const res = await authFetch(url, options);
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

export async function readServiceAccessTime() {
    const { ok, status, data } = await request(`/v1/services/accounts/accesstime`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!ok) {
        console.error(`Ошибка при получении AccessTime: ${status}`);
        return null;
    }
    return data;
}

export const saveServiceAccessTime = async (data) => {
    const { ok, status } = await request(`/v1/services/accounts/accesstime`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ data }),
    });

    if (!ok) {
        console.error("Сервер вернул ошибку:", status);
        return false;
    }
    return true;
}

export async function readServiceModelData() {
    const { ok, status, data } = await request(`/v1/services/model`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!ok) {
        console.error(`Ошибка при получении ModelData: ${status}`);
        return null;
    }
    return data;
}

export async function serviceCheckHuntingModels() {
    const { ok, status, data } = await request(`/v1/services/hunting-model`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!ok) {
        console.error(`Ошибка при получении HuntingModels: ${status}`);
        return null;
    }
    return data;
}

export async function deleteServiceModelData() {
    const { ok, status } = await request(`/v1/services/model`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!ok) {
        console.error(`Ошибка при запросе DeleteModel: ${status}`);
        return false;
    }
    return true;
}

/**
 * Создание/обновление сервисной модели
 */
export async function createServiceModelData(start, tg, modelId = null) {
    const body = { start, tg };
    if (modelId !== null && modelId !== undefined) {
        body.model_id = Number(modelId);
    }

    const { ok, status, data } = await request(`/v1/services/model`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(body),
    });

    if (!ok) {
        console.error("Сервер вернул ошибку:", status, data);
        return false;
    }

    return true;
}

export async function readServiceContactsData() {
    // Пауза 500 мс перед перезагрузкой списка контактов
    await new Promise(resolve => setTimeout(resolve, 250));

    const { ok, status, data } = await request(`/v1/services/contacts`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
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

    const normalized = result.map(item => {
        if (!item || typeof item !== 'object') return null;

        return {
            Contact: item.Contact || item.contact || '',
            Result: item.Result || item.result || 'pending',
            Added: item.Added || item.added || null,
            Updated: item.Updated || item.updated || null,
            ...item
        };
    });

    return normalized.filter(item => {
        return item && typeof item.Contact === 'string' && item.Contact.length > 0 && !item.Contact.includes('{') && !item.Contact.includes('"');
    });
}

export async function saveServiceContactsData(contacts) {
    const contactsList = contacts?.map(c => c.Contact) || [];
    const payload = { contacts: contactsList };

    const { ok, status, data, text } = await request(`/v1/services/contacts`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
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

export async function deleteServiceContact(contactId) {
    const { ok, status } = await request(`/v1/services/contact/${encodeURIComponent(contactId)}`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!ok) {
        console.error(`Ошибка при запросе DeleteContact: ${status}`);
        return false;
    }
    return true;
}

export async function deleteAllServiceContacts() {
    const url = `/v1/services/contacts`;

    const { ok, status } = await request(url, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
        }
    });

    if (!ok) {
        console.error(`Ошибка при запросе DeleteAllContacts: ${status}`);
        return false;
    }
    return true;
}

export async function readServiceContactDialogData(contact) {
    const { ok, status, data } = await request(`/v1/services/dialog?contact=${encodeURIComponent(contact)}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!ok) {
        console.error(`Ошибка при получении диалога: ${status}`);
        return null;
    }

    if (data == null) {
        console.warn('readServiceContactDialogData: пустой ответ', data);
        return null;
    }

    let messages = null;
    let meta = null;
    if (Array.isArray(data)) {
        messages = data;
        meta = {};
    } else if (data && typeof data === 'object') {
        messages = data.Messages;
        meta = { ...data };
        delete meta.Messages;
    } else {
        console.warn('readServiceContactDialogData: неожиданный формат data', data);
        return null;
    }

    if (!messages) {
        return { ...meta, Messages: [] };
    }

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

export async function readServiceAllBotInfo() {
    const url = `/v1/services/bots`;
    const options = {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    };

    let { ok, status, data } = await request(url, options);

    if (!ok && (status === 429 || status === 503)) {
        await new Promise((r) => setTimeout(r, 600));
        ({ ok, status, data } = await request(url, options));
    }

    if (!ok) {
        console.error(`Ошибка при получении информации о ботах пользователя: ${status}`);
        return null;
    }
    return data;
}

export const setServiceBotActive = async (botID, checked, provider) => {
    const { ok, status } = await request(`/v1/services/dogs/bots/active`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ botid: botID, active: checked, provider: provider}),
    });

    if (!ok) {
        console.error('Ошибка при изменении статуса бота:', status);
        return Promise.reject(new Error(`Ошибка ${status}`));
    }
    return true;
};

export const serviceDeleteBot = async (botID, provider) => {
    const { ok, status } = await request(
`/v1/services/dogs/bots/${encodeURIComponent(provider)}/${encodeURIComponent(botID)}`,
        {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        }
    );

    if (!ok) {
        console.error('Ошибка при удалении бота:', status);
        return Promise.reject(new Error(`Ошибка ${status}`));
    }
    return true;
};

export const serviceBotAuthData = async (botID, provider) => {
    const { ok, status, data } = await request(`/v1/services/dogs/bots/authdata`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ botid: botID, provider: provider }),
    });

    if (!ok) {
        console.error('Ошибка при получении данных авторизации бота:', status);
        return Promise.reject(new Error(`Ошибка ${status}`));
    }
    return data;
};

export async function checkServiceInProcess() {
    const { status } = await request(`/v1/services/status`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });
    return status === 200;
}

export const startServiceWSS = () => {
    if (typeof window === 'undefined') return null;
    const wsUrl = `/v1/ws/leed-hunter/start`;
    const wsToken = getAuthToken();
    return new WebSocket(wsUrl, [wsToken]);
}

export async function stopService() {
    const { ok, status, text } = await request(`/v1/services/stop`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!ok) {
        const errorMessage = (text && text.trim()) || `HTTP ${status}`;
        console.error(`Ошибка при остановке сервиса:`, errorMessage);
        return { success: false, error: errorMessage };
    }
    return { success: true };
}

export const serviceTgAuthWSS = () => {
    if (typeof window === 'undefined') return null;
    const wsUrl = `/v1/ws/tg-auth`;
    const wsToken = getAuthToken();
    return new WebSocket(wsUrl, [wsToken]);
}

export const serviceWaAuthWSS = () => {
    if (typeof window === 'undefined') return null;
    const wsUrl = `/v1/ws/wa-auth`;
    const wsToken = getAuthToken();
    return new WebSocket(wsUrl, [wsToken]);
}

export const serviceBotEventsWSS = () => {
    if (typeof window === 'undefined') return null;
    const wsUrl = `/v1/ws/service-events`;
    const wsToken = getAuthToken();
    return new WebSocket(wsUrl, [wsToken]);
}

export async function readProxyData() {
    // Пауза 500 мс перед перезагрузкой списка контактов
    await new Promise(resolve => setTimeout(resolve, 250));

    const { ok, status, data } = await request(`/v1/services/proxy`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!ok) {
        console.error(`Ошибка при получении списка прокси: ${status}`);
        return null;
    }
    return data;
}

export const setServiceProxyActive = async (proxyID, checked) => {
    const { ok, status } = await request(`/v1/services/proxy/active`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: proxyID, active: checked }),
    });

    if (!ok) {
        console.error('Ошибка при изменении статуса прокси:', status);
        return Promise.reject(new Error(`Ошибка ${status}`));
    }
    return true;
};

export const addServiceProxy = async (proxyAdr, proxyUsername = null, proxyPassword = null) => {
    const body = { adr: proxyAdr };
    if (proxyUsername) body.usr = proxyUsername;
    if (proxyPassword) body.pass = proxyPassword;

    const { ok, status } = await request(`/v1/services/proxy`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!ok) {
        console.error('Ошибка при добавлении прокси:', status);
        return Promise.reject(new Error(`Ошибка ${status}`));
    }
    return true;
};

export const editServiceProxy = async (proxyId, proxyAdr, proxyUsername = null, proxyPassword = null) => {
    const body = { id: proxyId, adr: proxyAdr };
    if (proxyUsername) body.usr = proxyUsername;
    if (proxyPassword) body.pass = proxyPassword;

    const { ok, status } = await request(`/v1/services/proxy/${encodeURIComponent(proxyId)}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!ok) {
        console.error('Ошибка при изменении прокси:', status);
        return Promise.reject(new Error(`Ошибка ${status}`));
    }
    return true;
};

export const deleteServiceProxy = async (proxyId) => {
    const { ok, status } = await request(`/v1/services/proxy/proxy/${encodeURIComponent(proxyId)}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!ok) {
        console.error('Ошибка при удалении прокси:', status);
        return Promise.reject(new Error(`Ошибка ${status}`));
    }
    return true;
};

export const deleteAllServiceProxy = async () => {
    const { ok, status } = await request(`/v1/services/proxy/proxys`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!ok) {
        console.error('Ошибка при удалении прокси:', status);
        return Promise.reject(new Error(`Ошибка ${status}`));
    }
    return true;
};

export const saveServiceSetting = async (setting) => {
    const { ok, status } = await request(`/v1/services/settings`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
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
 * @returns {Promise<boolean>} true если сервис доступен, false в противном случае
 */
export async function checkServiceAvailable() {
    const { ok, status } = await request(
`/v1/services/availabl`,
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        }
    );

    if (!ok || status !== 200) {
        console.error(`Сервис недоступен: ${status}`);
        return false;
    }

    return true;
}
