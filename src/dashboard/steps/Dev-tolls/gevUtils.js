const LAND_URL = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND) || process.env.REACT_APP_LAND;

export async function setProviderKeyGPT(token, respId, provider, key) {
    try {
        const response = await fetch(`${LAND_URL}/dev/setkeygpt`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "token": token,
                "resp_id": respId,
                "prov": provider,
                "key": key,
            })
        });
        if (!response.ok) {
            throw new Error('Ошибка при сохранении ключей GPT');
        }
        return await response.json(); // Возвращаем OK
    } catch (error) {
        console.error('Ошибка при сохранении ключей GPT:', error);
        throw error.message;
    }
}

export async function getDevData(token) {
    try {
        const response = await fetch(`${LAND_URL}/dev/getdata`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token })
        });

        if (!response.ok) {
            // Если статус ответа не 200-299, обрабатываем ошибку
            const errorData = await response.json();
            throw new Error(errorData.error || `Ошибка сервера: ${response.status}`);
        }

        // Получаем и парсим данные модели
        return await response.json();
    } catch (error) {
        console.error('Ошибка при получении dev data:', error);
        throw error.message;
    }
}

export async function setDistribMailData(token, respId, mail, pass, host, port) {
    try {
        const response = await fetch(`${LAND_URL}/dev/setdistribmail`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "token": token,
                "resp_id": respId,
                "mail": mail,
                "pass": pass,
                "host": host,
                "port": port,
            })
        });
        if (!response.ok) {
            throw new Error('Ошибка при сохранении mail данных');
        }
        return await response.json(); // Возвращаем OK
    } catch (error) {
        console.error('Ошибка при сохранении mail данных:', error);
        throw error.message;
    }
}

export async function setNewSessionKey(token) {
     try {
        const response = await fetch(`${LAND_URL}/dev/setsessionkey`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token })
        });
        if (!response.ok) {
            throw new Error('Ошибка при создании нового SessionKey');
        }
        return await response.json(); // Возвращаем OK
    } catch (error) {
        console.error('Ошибка при создании нового SessionKey:', error);
        throw error.message;
    }
}

export async function updateUserData(token, respId, name, email, pass) {
    try {
        const response = await fetch(`${LAND_URL}/dev/updateuserdata`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "token": token,
                "resp_id": respId,
                "name": name,
                "email": email,
                "pass": pass,
            })
        });
        if (!response.ok) {
            throw new Error('Ошибка при обновлении пользовательских данных');

        }
        // Результат аналогичный getDevData?
        return await response.json();
    } catch (error) {
        console.error('Ошибка при обновлении пользовательских данных:', error);
        throw error.message;
    }
}

export async function changeModelGPT(token, provider, modelId) {
    try {
        const response = await fetch(`${LAND_URL}/dev/changemodel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "token": token,
                "provider": provider,
                "model_id": Number(modelId),
            })
        });
        if (!response.ok) {
            throw new Error('Ошибка при изменении GPT модели');

        }
        // Результат аналогичный getDevData?
        return await response.json();
    } catch (error) {
        console.error('Ошибка при изменении GPT модели:', error);
        throw error.message;
    }
}

export async function restartServices(token) {
    try {
        const response = await fetch(`${LAND_URL}/dev/restartservice`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token })
        });
        if (!response.ok) {
            throw new Error('Ошибка перезапуска сервисов');
        }
        return await response.json(); // Возвращаем OK
    } catch (error) {
        console.error('Ошибка перезапуска сервисов:', error);
        throw error.message;
    }
}

export async function setBotData(token, respId, name, botToken) {
    try {
        const response = await fetch(`${LAND_URL}/dev/setbotdata`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "token": token,
                "resp_id": respId,
                "name": name,
                "bot-token": botToken,
            })
        });
        if (!response.ok) {
            throw new Error('Ошибка при сохранении данных TelegramBot');
        }
        return await response.json(); // Возвращаем OK
    } catch (error) {
        console.error('Ошибка при сохранении данных TelegramBot:', error);
        throw error.message;
    }
}

export async function setUserKeyFn(token, respId, key) {
    try {
        // Используем AbortController с таймаутом
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);

        const response = await fetch(`${LAND_URL}/dev/setuserkey`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "token": token,
                "resp_id": respId,
                "key": key,
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error('Ошибка при сохранении UserKey');
        }

        return { success: true }; // Просто возвращаем успешный результат
    } catch (error) {
        // Если ошибка связана с перезапуском сервера, считаем операцию успешной
        if (error.name === 'AbortError' ||
            error.message.includes('fetch') ||
            error.message.includes('network') ||
            error.message.includes('reset')) {
            console.warn("Сервер перезапускается после сохранения UserKey");
            return { success: true }; // Операция успешна, несмотря на разрыв соединения
        }

        console.error('Ошибка при сохранении UserKey:', error);
        throw error.message;
    }
}

export async function checkSettings(token) {
    try {
        const response = await fetch(`${LAND_URL}/dev/checksettings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `Ошибка сервера: ${response.status}` }));
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
        throw error.message || 'Неизвестная ошибка';
    }
}