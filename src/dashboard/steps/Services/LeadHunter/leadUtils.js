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
    const response = await authFetch(`/v1/services/lead/accounts/accesstime`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        console.error(`Ошибка при получении AccessTime: ${response.status}`);
        return null;
    }
    return await response.json();
}

export const saveServiceAccessTime = async (data) => {
    const response = await authFetch(`/v1/services/lead/accounts/accesstime`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ data }),
    });

    if (!response.ok) {
        console.error("Сервер вернул ошибку:", response.status);
        return false;
    }
    return true;
}

export async function readServiceModelData() {
    const response = await authFetch('/v1/services/lead/model', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
    });

    if (!response.ok) {
        console.error(`Ошибка при получении ModelData: ${response.status}`);
        return null;
    }

    return await response.json();
}

export async function serviceCheckHuntingModels() {
    const response = await authFetch(`/v1/services/lead/hunting-model`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        console.error(`Ошибка при получении HuntingModels: ${response.status}`);
        return null;
    }
    return await response.json();
}

export async function deleteServiceModelData() {
    const response = await authFetch(`/v1/services/lead/model`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        console.error(`Ошибка при запросе DeleteModel: ${response.status}`);
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

    const response = await authFetch(`/v1/services/lead/model`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        console.error("Сервер вернул ошибку:", `${response.status}`);
        return false;
    }

    return true;
}

export async function readServiceContactsData() {
    // Пауза 500 мс перед перезагрузкой списка контактов
    await new Promise(resolve => setTimeout(resolve, 250));

    const response = await authFetch(`/v1/services/lead/contacts`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        console.error(`Ошибка при получении ContactsData: ${response.status}`);
        return null;
    }
    let result = await response.json();
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

    const response = await authFetch(`/v1/services/lead/contacts`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        console.error("saveServiceContactsData - Сервер вернул ошибку:", `${response.status}`);
        console.error("saveServiceContactsData - Response data:", await response.json());
        console.error("saveServiceContactsData - Response text:", await response.text());
        return false;
    }
    return true;
}

export async function deleteServiceContact(contactId) {
    const response = await authFetch(`/v1/services/lead/contact/${encodeURIComponent(contactId)}`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        console.error(`Ошибка при запросе DeleteContact: ${response.status}`);
        return false;
    }
    return true;
}

export async function deleteAllServiceContacts() {
    const url = `/v1/services/lead/contacts`;

    const response = await authFetch(url, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
        }
    });

    if (!response.ok) {
        console.error(`Ошибка при запросе DeleteAllContacts: ${response.status}`);
        return false;
    }
    return true;
}

export async function readServiceContactDialogData(contact) {
    const response = await authFetch(`/v1/services/lead/dialog?contact=${encodeURIComponent(contact)}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        console.error(`Ошибка при получении диалога: ${response.status}`);
        return null;
    }

    const data = await response.json();
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
    const url = `/v1/services/lead/bots`;
    const options = {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    };

    let response = await authFetch(url, options);

    if (!response.ok && (response.status === 429 || response.status === 503)) {
        await new Promise((r) => setTimeout(r, 600));
        response = await authFetch(url, options);
    }

    if (!response.ok) {
        console.error(`Ошибка при получении информации о ботах пользователя: ${response.status}`);
        return null;
    }
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
        console.error('Ответ списка ботов не является JSON');
        return null;
    }

    try {
        return await response.json();
    } catch (error) {
        console.error('Ошибка разбора ответа списка ботов:', error);
        return null;
    }
}

export const setServiceBotActive = async (botID, checked, provider) => {
    const response = await authFetch(`/v1/services/lead/bots/active`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ botid: botID, active: checked, provider: provider}),
    });

    if (!response.ok) {
        console.error('Ошибка при изменении статуса бота:', response.status);
        return Promise.reject(new Error(`Ошибка ${response.status}`));
    }
    return true;
};

export const setServiceBotNull = async (botID, checked, provider) => {
    const response = await authFetch(`/v1/services/lead/bots/null`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ botid: botID, provider: provider}),
    });

    if (!response.ok) {
        console.error('Ошибка при изменении статуса бота:', response.status);
        return Promise.reject(new Error(`Ошибка ${response.status}`));
    }
    return true;
};

export const serviceDeleteBot = async (botID, provider) => {
    const response = await authFetch(
`/v1/services/lead/bots/${encodeURIComponent(provider)}/${encodeURIComponent(botID)}`,
        {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        }
    );

    if (!response.ok) {
        console.error('Ошибка при удалении бота:', response.status);
        return Promise.reject(new Error(`Ошибка ${response.status}`));
    }
    return true;
};

export const serviceBotAuthData = async (botID, provider) => {
    const response = await authFetch(`/v1/services/lead/bots/authdata`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ botid: botID, provider: provider }),
    });

    if (!response.ok) {
        console.error('Ошибка при получении данных авторизации бота:', response.status);
        return Promise.reject(new Error(`Ошибка ${response.status}`));
    }
    return await response.json();
};

export async function checkServiceInProcess() {
    const response = await authFetch(`/v1/services/lead/status`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });
    return response.status === 200;
}

export async function stopService() {
    const response = await authFetch(`/v1/services/lead/stop`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        const errorMessage = (await response.text() && (await response.text()).trim()) || `HTTP ${response.status}`;
        console.error(`Ошибка при остановке сервиса:`, errorMessage);
        return { success: false, error: errorMessage };
    }
    return { success: true };
}

const leadWsUrl = (path) => process.env.NODE_ENV === 'development'
    ? `wss://localhost${path}`
    : path;

export const startServiceWSS = () => {
    if (typeof window === 'undefined') return null;
    const wsUrl = leadWsUrl(`/v1/ws/lead/start`);
    const wsToken = getAuthToken();
    return new WebSocket(wsUrl, [wsToken]);
}

export const serviceTgAuthWSS = () => {
    if (typeof window === 'undefined') return null;
    const wsUrl = leadWsUrl(`/v1/ws/lead/tg-auth`);
    const wsToken = getAuthToken();
    return new WebSocket(wsUrl, [wsToken]);
}

export const serviceWaAuthWSS = () => {
    if (typeof window === 'undefined') return null;
    const wsUrl = leadWsUrl(`/v1/ws/lead/wa-auth`);
    const wsToken = getAuthToken();
    return new WebSocket(wsUrl, [wsToken]);
}

export const serviceBotEventsWSS = () => {
    if (typeof window === 'undefined') return null;
    const wsUrl = leadWsUrl(`/v1/ws/lead/events`);
    const wsToken = getAuthToken();
    return new WebSocket(wsUrl, [wsToken]);
}

export async function readProxyData() {
    // Пауза 500 мс перед перезагрузкой списка контактов
    await new Promise(resolve => setTimeout(resolve, 250));

    const response = await authFetch(`/v1/services/lead/proxy`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        console.error(`Ошибка при получении списка прокси: ${response.status}`);
        return null;
    }
    return await response.json();
}

export const setServiceProxyActive = async (proxyID, checked) => {
    const response = await authFetch(`/v1/services/lead/proxy/active`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: proxyID, active: checked }),
    });

    if (!response.ok) {
        console.error('Ошибка при изменении статуса прокси:', response.status);
        return Promise.reject(new Error(`Ошибка ${response.status}`));
    }
    return true;
};

export const setServiceProxyNull = async (proxyID) => {
    const response = await authFetch(`/v1/services/lead/proxy/null`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: proxyID }),
    });

    if (!response.ok) {
        console.error('Ошибка при изменении статуса прокси:', response.status);
        return Promise.reject(new Error(`Ошибка ${response.status}`));
    }
    return true;
};

export const addServiceProxy = async (proxyAdr, proxyUsername = null, proxyPassword = null) => {
    const body = { adr: proxyAdr };
    if (proxyUsername) body.usr = proxyUsername;
    if (proxyPassword) body.pass = proxyPassword;

    const response = await authFetch(`/v1/services/lead/proxy`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        console.error('Ошибка при добавлении прокси:', response.status);
        return Promise.reject(new Error(`Ошибка ${response.status}`));
    }
    return true;
};

export const editServiceProxy = async (proxyId, proxyAdr, proxyUsername = null, proxyPassword = null) => {
    const body = { id: proxyId, adr: proxyAdr };
    if (proxyUsername) body.usr = proxyUsername;
    if (proxyPassword) body.pass = proxyPassword;

    const response = await authFetch(`/v1/services/lead/proxy/${encodeURIComponent(proxyId)}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        console.error('Ошибка при изменении прокси:', response.status);
        return Promise.reject(new Error(`Ошибка ${response.status}`));
    }
    return true;
};

export const deleteServiceProxy = async (proxyId) => {
    const response = await authFetch(`/v1/services/lead/proxy/proxy/${encodeURIComponent(proxyId)}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        console.error('Ошибка при удалении прокси:', response.status);
        return Promise.reject(new Error(`Ошибка ${response.status}`));
    }
    return true;
};

export const deleteAllServiceProxy = async () => {
    const response = await authFetch(`/v1/services/lead/proxy/proxys`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        console.error('Ошибка при удалении прокси:', response.status);
        return Promise.reject(new Error(`Ошибка ${response.status}`));
    }
    return true;
};

export const saveServiceSetting = async (setting) => {
    const response = await authFetch(`/v1/services/lead/settings`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ set: setting }),
    });

    if (!response.ok) {
        console.error('Ошибка при сохранении настроек:', response.status);
        return Promise.reject(new Error(`Ошибка ${response.status}`));
    }
    return true;
};

/**
 * Проверяет доступность сервиса
 * @returns {Promise<boolean>} true если сервис доступен, false в противном случае
 */
export async function checkServiceAvailable() {
    const response = await authFetch(
`/v1/services/lead/available`,
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        }
    );

    if (!response.ok || response.status !== 200) {
        console.error(`Сервис недоступен: ${response.status}`);
        return false;
    }

    return true;
}
