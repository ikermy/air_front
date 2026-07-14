import { authFetch } from "../../../utils/easyUtils";

export async function getDevData() {
    try {
        const response = await authFetch(`/v1/dev/get-data`, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            // Если статус ответа не 200-299, обрабатываем ошибку
            const errorData = await response.json().catch(() => ({error: `Ошибка сервера: ${response.status}`}));
            throw new Error(errorData.error || `Ошибка сервера: ${response.status}`);
        }

        // Получаем и парсим данные модели
        return await response.json();
    } catch (error) {
        console.error('Ошибка при получении dev data:', error);
        throw error;
    }
}

export async function setDistribMailData(respId, mail, pass, host, port) {
    try {
        const response = await authFetch(`/v1/dev/set-distrib-mail`, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                "resp_id": respId,
                "mail": mail,
                "pass": pass,
                "host": host,
                "port": port,
            })
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({error: `Ошибка сервера: ${response.status}`}));
            throw new Error(errorData.error || `Ошибка сервера: ${response.status}`);
        }
        return await response.json(); // Возвращаем OK
    } catch (error) {
        console.error('Ошибка при сохранении mail данных:', error);
        throw error;
    }
}

export async function setNewSessionKey() {
    try {
        const response = await authFetch(`/v1/dev/set-session-key`, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
            },
        });
        if (!response.ok) {
            throw new Error('Ошибка при создании нового SessionKey');
        }
        return await response.json(); // Возвращаем OK
    } catch (error) {
        console.error('Ошибка при создании нового SessionKey:', error);
        throw error;
    }
}

export async function setGAuthData(respId, url, id, sec) {
    try {
        const response = await authFetch(`/v1/dev/set-gauth`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                "resp_id": respId,
                "url": url,
                "id": id,
                "sec": sec,
            })
        });
        if (response.status === 401) {
            throw new Error('Недостаточно прав доступа');
        }
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({error: `Ошибка сервера: ${response.status}`}));
            throw new Error(errorData.error || `Ошибка сервера: ${response.status}`);
        }
        return true;
    } catch (error) {
        console.error('Ошибка при сохранении данных Google Auth:', error);
        throw error;
    }
}

export async function setCarpinteroData(respId, botToken, botName) {
    try {
        const response = await authFetch(`/v1/dev/set-carpintero`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                "resp_id": respId,
                "bot-token": botToken,
                "bot-name": botName,
            })
        });
        if (response.status === 401) {
            throw new Error('Недостаточно прав доступа');
        }
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({error: `Ошибка сервера: ${response.status}`}));
            throw new Error(errorData.error || `Ошибка сервера: ${response.status}`);
        }
        return true;
    } catch (error) {
        console.error('Ошибка при сохранении данных Carpintero:', error);
        throw error;
    }
}

export async function setOperBotData(respId, botToken, botName) {
    try {
        const response = await authFetch(`/v1/dev/set-operbot`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                "resp_id": respId,
                "bot-token": botToken,
                "bot-name": botName,
            })
        });
        if (response.status === 401) {
            throw new Error('Недостаточно прав доступа');
        }
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({error: `Ошибка сервера: ${response.status}`}));
            throw new Error(errorData.error || `Ошибка сервера: ${response.status}`);
        }
        return true;
    } catch (error) {
        console.error('Ошибка при сохранении данных OperBot:', error);
        throw error;
    }
}

export async function getSvcKey() {
    try {
        const response = await authFetch(`/v1/dev/get-service-key`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        if (response.status === 401) throw new Error('Невалидный токен');
        if (response.status === 403) throw new Error('Недостаточно прав');
        if (response.status === 404) throw new Error('Ключ не настроен — используйте генерацию нового ключа');
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({error: `Ошибка сервера: ${response.status}`}));
            throw new Error(errorData.error || `Ошибка сервера: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Ошибка при получении svc key:', error);
        throw error;
    }
}

export async function generateSvcKey() {
    try {
        const response = await authFetch(`/v1/dev/generate-service-key`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        if (response.status === 401) throw new Error('Невалидный токен');
        if (response.status === 403) throw new Error('Недостаточно прав');
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({error: `Ошибка сервера: ${response.status}`}));
            throw new Error(errorData.error || `Ошибка сервера: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Ошибка при генерации svc key:', error);
        throw error;
    }
}

export async function checkSettings() {
    try {
        const response = await authFetch(`/v1/dev/check-settings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({error: `Ошибка сервера: ${response.status}`}));
            throw new Error(errorData.error || `Ошибка сервера: ${response.status}`);
        }

        const textData = await response.text();
        try {
            const data = JSON.parse(textData);
            return data;
        } catch (jsonError) {
            throw new Error('Некорректный JSON-ответ от сервера');
        }
    } catch (error) {
        console.error('Ошибка при получении dev settings:', error);
        throw error;
    }
}