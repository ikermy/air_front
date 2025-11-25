const LAND_URL = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND) || process.env.REACT_APP_LAND;

export async function readServiceAccessTime(token) {
    try {
        const response = await fetch(`${LAND_URL}/srv_readaccesstime?token=${encodeURIComponent(token)}`, {
            method: "GET",
            headers: {"Content-Type": "application/json"},
        });

        if (!response.ok) {
            console.error(`Ошибка при получении AccessTime: ${response.status}`);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('Ошибка при запросе AccessTime:', error);
        return null;
    }
}

export const saveServiceAccessTime = async (token, data) => {
    try {
        const response = await fetch(`${LAND_URL}/srv_updateaccesstime`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                token: token,
                data: data,
            }),
        });

        if (!response.ok) {
            console.error("Сервер вернул ошибку:", response.status);
            return false
        } else {
            return true
        }

    } catch (error) {
        console.error("Ошибка при сохранении AccessTime:", error);
        return false
    }
}

export async function readServiceModelData(token) {
    try {
        const response = await fetch(`${LAND_URL}/srv_model?token=${encodeURIComponent(token)}`, {
            method: "GET",
            headers: {"Content-Type": "application/json"},
        });

        if (!response.ok) {
            console.error(`Ошибка при получении ModelData: ${response.status}`);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('Ошибка при запросе ModelData:', error);
        return null;
    }
}

export async function deleteServiceModelData(token) {
    try {
        const response = await fetch(`${LAND_URL}/srv_deletemodel?token=${encodeURIComponent(token)}`, {
            method: "DELETE",
            headers: {"Content-Type": "application/json"},
        });

        if (!response.ok) {
            console.error(`Ошибка при запросе DeleteModel: ${response.status}`);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Ошибка при запросе DeleteModel:', error);
        return false;
    }
}

export async function createServiceModelData(token, mname, start, target, tg, mprompt) {
    try {
        const response = await fetch(`${LAND_URL}/srv_createmodel`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                token: token,
                mname: mname,
                start: start,
                target: target,
                tg: tg,
                mprompt: mprompt
            }),
        });

        if (!response.ok) {
            console.error("Сервер вернул ошибку:", response.status);
            return false;
        }

        const result = await response.json();
        // Если внешний сервис вернёт { send: "ok" }, учитываем это, иначе считаем успешным при response.ok
        if (result && result.send === "ok") return true;
        return true;
    } catch (error) {
        console.error("Ошибка при сохранении модели:", error);
        return false;
    }
}

export async function readServiceContactsData(token) {
    try {
        const response = await fetch(`${LAND_URL}/srv_contacts?token=${encodeURIComponent(token)}`, {
            method: "GET",
            headers: {"Content-Type": "application/json"},
        });

        if (!response.ok) {
            console.error(`Ошибка при получении ContactsData: ${response.status}`);
            return null;
        }

        let data = await response.json();

        // Проверяем, если данные пришли как строка (двойная сериализация), парсим еще раз
        if (typeof data === 'string') {
            try {
                data = JSON.parse(data);
            } catch (e) {
                console.error('Ошибка при парсинге строки JSON:', e);
                return [];
            }
        }

        // Проверяем, что это массив
        if (!Array.isArray(data)) {
            console.error('Данные контактов не являются массивом:', data);
            return [];
        }

        // Фильтруем только валидные объекты с полями Contact и Result
        const validContacts = data.filter(item => {
            return item &&
                   typeof item === 'object' &&
                   typeof item.Contact === 'string' &&
                   item.Contact.length > 0 &&
                   !item.Contact.includes('{') && // Исключаем битые записи с JSON внутри
                   !item.Contact.includes('"');
        });

        return validContacts;
    } catch (error) {
        console.error('Ошибка при запросе ContactsData:', error);
        return null;
    }
}

export async function saveServiceContactsData(token, contacts) {
    try {
        // Преобразуем массив объектов в массив строк (только Contact)
        const contactsList = contacts?.map(c => c.Contact) || [];

        const response = await fetch(`${LAND_URL}/srv_contacts`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                token: token,
                contacts: contactsList,
            }),
        });

        if (!response.ok) {
            console.error("Сервер вернул ошибку:", response.status);
            return false;
        }

        return true;
    } catch (error) {
        console.error("Ошибка при сохранении контактов:", error);
        return false;
    }
}


export async function deleteServiceContact(token, contact) {
    try {
        const response = await fetch(`${LAND_URL}/srv_contacts?token=${encodeURIComponent(token)}&contact=${encodeURIComponent(contact)}`, {
            method: "DELETE",
            headers: {"Content-Type": "application/json"},
        });

        if (!response.ok) {
            console.error(`Ошибка при запросе DeleteContact: ${response.status}`);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Ошибка при запросе DeleteContact:', error);
        return false;
    }
}

export async function deleteAllServiceContact(token, contact) {
    try {
        const response = await fetch(`${LAND_URL}/srv_allcontacts?token=${encodeURIComponent(token)}`, {
            method: "DELETE",
            headers: {"Content-Type": "application/json"},
        });

        if (!response.ok) {
            console.error(`Ошибка при запросе DeleteAllContact: ${response.status}`);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Ошибка при запросе DeleteAllContact:', error);
        return false;
    }
}

export async function readServiceContactDialogData(token, contact) {
    try {
        const response = await fetch(`${LAND_URL}/srv_dialog?token=${encodeURIComponent(token)}&contact=${encodeURIComponent(contact)}`, {
            method: "GET",
            headers: {"Content-Type": "application/json"},
        });

        if (!response.ok) {
            console.error(`Ошибка при получении ModelData: ${response.status}`);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('Ошибка при запросе ModelData:', error);
        return null;
    }
}

export async function readServiceTgUserBotInfo(token) {
    try {
        const doFetch = () => fetch(`${LAND_URL}/srv_tgbotsinfo?token=${encodeURIComponent(token)}`, {
            method: "GET",
            headers: {"Content-Type": "application/json"},
        });

        let response = await doFetch();

        // Авто-ретрай при rate-limit/temporary unavailable
        if (response && (response.status === 429 || response.status === 503)) {
            await new Promise((r) => setTimeout(r, 600));
            response = await doFetch();
        }

        if (!response || !response.ok) {
            console.error(`Ошибка при получении информации о ботах пользователя: ${response && response.status}`);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('Ошибка при запросе информации о ботах пользователя:', error);
        return null;
    }
}

export const setServiceTgBotActive = async (token, botID, checked) => {
    try {
        const response = await fetch(`${LAND_URL}/srv_tgbotsetactive`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token: token,
                botid: botID,
                active: checked
            }),
        });

        if (!response.ok) {
            throw new Error(`Ошибка ${response.status}`);
        }

        return true;
    } catch (error) {
        console.error('Ошибка при изменении статуса бота:', error);
        throw error;
    }
};

export const serviceDeleteTgUserBot = async (token, botID) => {
    try {
        const response = await fetch(`${LAND_URL}/srv_tgbotdelete`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token: token,
                botid: botID,
            }),
        });

        if (!response.ok) {
            throw new Error(`Ошибка ${response.status}`);
        }

        return true;
    } catch (error) {
        console.error('Ошибка при удалении бота:', error);
        throw error;
    }
};

export const serviceTgUserBotAuthData = async (token, botID) => {
    try {
        const response = await fetch(`${LAND_URL}/srv_tgbotauthdata`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token: token,
                botid: botID,
            }),
        });

        if (!response.ok) {
            throw new Error(`Ошибка ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Ошибка при удалении бота:', error);
        throw error;
    }
};

export async function checkServiceInProcess(token) {
    try {
        const response = await fetch(`${LAND_URL}/srv_status?token=${encodeURIComponent(token)}`, {
            method: "GET",
            headers: {"Content-Type": "application/json"},
        });

        // Строго проверяем статус 200
        return response.status === 200;
    } catch (error) {
        console.error('Ошибка при запросе статуса сервиса:', error);
        return false;
    }
}

export const startServiceWSS = (token) => {
    const LAND_WSS = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND_WSS) || process.env.REACT_APP_LAND_WSS;
    const wsUrl = `${LAND_WSS}/ws/start?token=${encodeURIComponent(token)}`;

    return new WebSocket(wsUrl);
}

export async function stopService(token) {
    try {
        const response = await fetch(`${LAND_URL}/srv_stop?token=${encodeURIComponent(token)}`, {
            method: "GET",
            headers: {"Content-Type": "application/json"},
        });

        if (!response.ok) {
            // Сервер возвращает текст ошибки напрямую, а не JSON
            const errorText = await response.text();
            const errorMessage = errorText.trim() || `HTTP ${response.status}`;
            console.error(`Ошибка при остановке сервиса:`, errorMessage);
            return { success: false, error: errorMessage };
        }

        // При успехе сервер возвращает пустой ответ со статусом 200
        return { success: true };
    } catch (error) {
        console.error('Ошибка при запросе остановки сервиса:', error);
        return { success: false, error: error.message };
    }
}

export const serviceTgAuthWSS = (token) => {
    const LAND_WSS = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND_WSS) || process.env.REACT_APP_LAND_WSS;
    const wsUrl = `${LAND_WSS}/ws/tgauth?token=${encodeURIComponent(token)}`;

    return new WebSocket(wsUrl);
}

export const serviceBotEventsWSS = (token) => {
    const LAND_WSS = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND_WSS) || process.env.REACT_APP_LAND_WSS;
    const wsUrl = `${LAND_WSS}/ws/srv_events?token=${encodeURIComponent(token)}`;

    return new WebSocket(wsUrl);
}

export async function readProxyData(token) {
    try {
        const response = await fetch(`${LAND_URL}/srv_proxydata?token=${encodeURIComponent(token)}`, {
            method: "GET",
            headers: {"Content-Type": "application/json"},
        });

        if (!response.ok) {
            console.error(`Ошибка при получении списка прокси: ${response.status}`);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('Ошибка при запросе списка прокси:', error);
        return null;
    }
}

export const setServiceProxyActive = async (token, proxyID, checked) => {
    try {
        const response = await fetch(`${LAND_URL}/srv_proxysetactive`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token: token,
                id: proxyID,
                active: checked
            }),
        });

        if (!response.ok) {
            throw new Error(`Ошибка ${response.status}`);
        }

        return true;
    } catch (error) {
        console.error('Ошибка при изменении статуса прокси:', error);
        throw error;
    }
};

export const addServiceProxy = async (token, proxyAdr, proxyHex) => {
    try {
        const response = await fetch(`${LAND_URL}/srv_proxydata`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token: token,
                adr: proxyAdr,
                hex: proxyHex
            }),
        });

        if (!response.ok) {
            throw new Error(`Ошибка ${response.status}`);
        }

        return true;
    } catch (error) {
        console.error('Ошибка при добавлении прокси:', error);
        throw error;
    }
};

export const editServiceProxy = async (token, proxyId, proxyAdr, proxyHex) => {
    try {
        const response = await fetch(`${LAND_URL}/srv_proxydataedit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token: token,
                id: proxyId,
                adr: proxyAdr,
                hex: proxyHex
            }),
        });

        if (!response.ok) {
            throw new Error(`Ошибка ${response.status}`);
        }

        return true;
    } catch (error) {
        console.error('Ошибка при изменении прокси:', error);
        throw error;
    }
};

export const deleteServiceProxy = async (token, proxyId) => {
    try {
        const response = await fetch(`${LAND_URL}/srv_proxydata`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token: token,
                id: proxyId,
            }),
        });

        if (!response.ok) {
            throw new Error(`Ошибка ${response.status}`);
        }

        return true;
    } catch (error) {
        console.error('Ошибка при изменении прокси:', error);
        throw error;
    }
};

export const saveServiceSetting = async (token, setting) => {
    try {
        const response = await fetch(`${LAND_URL}/srv_tgbotsetsetting`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token: token,
                set: setting,
            }),
        });

        if (!response.ok) {
            throw new Error(`Ошибка ${response.status}`);
        }

        return true;
    } catch (error) {
        console.error('Ошибка при сохранении настроек:', error);
        throw error;
    }
};