const LAND_URL = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND) || process.env.REACT_APP_LAND;

/**
 * Проверка доступности сервиса CRM (публичный endpoint)
 * Gateway: /crm/health → CRM: /health
 * @returns {Promise<{ok: boolean, status: number, data?: any, error?: string}>}
 */
export async function healthCheck() {
    try {
        const response = await fetch(`${LAND_URL}/crm/health`, {
            method: "GET",
            headers: {"Content-Type": "application/json"},
        });

        if (!response.ok) {
            console.error(`Ошибка при проверке health: ${response.status}`);
            return { ok: false, status: response.status };
        }

        let data = null;
        try {
            data = await response.json();
        } catch (jsonError) {
            console.warn('Не удалось распарсить JSON ответ:', jsonError);
            // Если нет JSON, но статус 200 - всё равно считаем успешным
        }

        const result = { ok: true, status: response.status, data };

        return result;
    } catch (error) {
        console.error('Ошибка при проверке health:', error);
        return { ok: false, error: error.message };
    }
}

/**
 * Получение конфигурации CRM текущего пользователя
 * UserID извлекается из токена на Gateway и передается через X-User-ID
 * Gateway: /crm/api/configs/:crm_type → CRM: /configs/:crm_type
 * @param {string} token - JWT токен авторизации
 * @param {string} crmType - Тип CRM (например, "amocrm")
 * @returns {Promise<{success: boolean, config?: Object, error?: string}>}
 */
export async function getCRMConfig(token, crmType = 'amocrm') {
    try {
        const response = await fetch(`${LAND_URL}/crm/api/configs/${crmType}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(`Ошибка при получении конфигурации CRM: ${response.status}`, errorData);
            return { success: false, error: errorData.message || `HTTP ${response.status}` };
        }

        const result = await response.json();

        // Парсим credentials если это строка
        let parsedCredentials = {};
        try {
            parsedCredentials = typeof result.credentials === 'string'
                ? JSON.parse(result.credentials)
                : result.credentials || {};
        } catch (e) {
            console.warn('Не удалось распарсить credentials:', e);
        }

        return {
            success: true,
            config: {
                crmType: result.crm_type,
                name: result.name,
                subdomain: result.subdomain,
                credentials: parsedCredentials,
                isActive: result.is_active,
                createdAt: result.created_at,
                updatedAt: result.updated_at
            }
        };
    } catch (error) {
        console.error('Ошибка при получении конфигурации CRM:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Включение/выключение CRM конфигурации
 * Gateway: /crm/api/configs/:crm_type/active → CRM: /configs/:crm_type/active
 * @param {string} token - JWT токен авторизации
 * @param {string} crmType - Тип CRM (например, "amocrm")
 * @param {boolean} isActive - Новое состояние активности
 * @returns {Promise<{success: boolean, message?: string, isActive?: boolean, error?: string}>}
 */
export async function toggleCRMActive(token, crmType = 'amocrm', isActive) {
    try {
        const response = await fetch(`${LAND_URL}/crm/api/configs/${crmType}/active`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                is_active: isActive
            })
        });

        // Обработка различных статусов ответа
        if (response.status === 400) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Некорректный запрос:', errorData);
            return {
                success: false,
                error: errorData.error || 'Некорректный запрос',
                details: errorData.details
            };
        }

        if (response.status === 404) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Конфигурация не найдена:', errorData);
            return {
                success: false,
                error: errorData.error || 'Конфигурация CRM не найдена'
            };
        }

        if (response.status === 500) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Ошибка сервера:', errorData);
            return {
                success: false,
                error: errorData.error || 'Ошибка сервера при обновлении статуса',
                details: errorData.details
            };
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(`Ошибка при изменении статуса CRM: ${response.status}`, errorData);
            return {
                success: false,
                error: errorData.error || errorData.message || `HTTP ${response.status}`
            };
        }

        // Успешный ответ (200)
        const result = await response.json();

        return {
            success: true,
            message: result.message || 'Статус конфигурации обновлен',
            isActive: result.is_active,
            crmType: result.crm_type
        };
    } catch (error) {
        console.error('Ошибка при изменении статуса CRM:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Удаление CRM-конфигурации по типу
 * Gateway: /crm/api/configs/:crm_type → CRM: /configs/:crm_type
 * @param {string} token - JWT токен авторизации
 * @param {string} crmType - Тип CRM (например, "amocrm")
 * @returns {Promise<{success: boolean, error?: string, details?: string}>}
 */
export async function deleteCRMConfig(token, crmType = 'amocrm') {
    try {
        const response = await fetch(`${LAND_URL}/crm/api/configs/${crmType}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        if (response.status === 400) {
            const errorData = await response.json().catch(() => ({}));
            return { success: false, error: errorData.error || 'некорректный запрос', details: errorData.details };
        }
        if (response.status === 404) {
            const errorData = await response.json().catch(() => ({}));
            return { success: false, error: errorData.error || 'конфигурация не найдена' };
        }
        if (response.status === 500) {
            const errorData = await response.json().catch(() => ({}));
            return { success: false, error: errorData.error || 'ошибка удаления конфигурации', details: errorData.details };
        }
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return { success: false, error: errorData.error || errorData.message || `HTTP ${response.status}` };
        }

        // 200 OK без тела
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Сохранение конфигурации amocrm (Шаг 1 OAuth)
 * Gateway: /crm/api/configs/amocrm → CRM: /configs/amocrm
 * @param {string} token - JWT токен авторизации
 * @param {Object} configData - Данные конфигурации
 * @param {string} configData.name - Название конфигурации
 * @param {string} configData.subdomain - Поддомен amocrm
 * @param {string} configData.clientId - ID интеграции
 * @param {string} configData.clientSecret - Секретный ключ
 * @returns {Promise<{success: boolean, config?: Object, error?: string}>}
 */
export async function saveAmoCRMConfig(token, configData) {
    try {
        const response = await fetch(`${LAND_URL}/crm/api/configs/amocrm`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                name: configData.name || 'amocrm',
                subdomain: configData.subdomain,
                credentials: {
                    client_id: configData.clientId,
                    client_secret: configData.clientSecret,
                    redirect_url: configData.url
                },
                is_active: false
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(`Ошибка при сохранении конфигурации: ${response.status}`, errorData);
            return { success: false, error: errorData.error || `HTTP ${response.status}` };
        }

        const result = await response.json();

        return { success: true, config: result.config };
    } catch (error) {
        console.error('Ошибка при сохранении конфигурации:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Получение URL для авторизации amocrm (Шаг 2 OAuth)
 * Gateway: /crm/api/oauth/amocrm/auth → CRM: /oauth/amocrm/auth
 * @param {string} token - JWT токен авторизации
 * @param {string} redirectUrl - URL для callback (опционально)
 * @returns {Promise<{success: boolean, auth_url?: string, state?: string, error?: string}>}
 */
export async function getAmoCRMAuthURL(token, redirectUrl = null) {
    try {
        const body = redirectUrl ? { redirect_url: redirectUrl } : {};

        const response = await fetch(`${LAND_URL}/crm/api/oauth/amocrm/auth`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(`Ошибка при получении auth URL: ${response.status}`, errorData);
            return { success: false, error: errorData.error || `HTTP ${response.status}` };
        }

        const result = await response.json();

        return {
            success: true,
            auth_url: result.auth_url,
            state: result.state,
            expires_in: result.expires_in
        };
    } catch (error) {
        console.error('Ошибка при получении auth URL:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Обмен кода авторизации на токены (Шаг 4 OAuth)
 * Gateway: /crm/api/oauth/amocrm/exchange → CRM: /oauth/amocrm/exchange
 * @param {string} token - JWT токен авторизации
 * @param {string} code - Код авторизации
 * @param {string} state - State для проверки
 * @returns {Promise<{success: boolean, expires_at?: number, error?: string}>}
 */
export async function exchangeAmoCRMCode(token, code, state) {
    try {
        const response = await fetch(`${LAND_URL}/crm/api/oauth/amocrm/exchange`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                code: code,
                state: state
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(`Ошибка при обмене кода: ${response.status}`, errorData);
            return { success: false, error: errorData.error || `HTTP ${response.status}` };
        }

        const result = await response.json();

        return {
            success: true,
            expires_at: result.expires_at,
            message: result.message
        };
    } catch (error) {
        console.error('Ошибка при обмене кода:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Тест соединения с amocrm
 * Gateway: /crm/api/configs/amocrm/test → CRM: /configs/amocrm/test
 * @param {string} token - JWT токен авторизации
 * @param {string} crmType - Тип CRM (по умолчанию 'amocrm')
 * @returns {Promise<{success: boolean, message?: string, error?: string, details?: any}>}
 */
export async function testAmoCRMConnection(token, crmType = 'amocrm') {
    try {
        const response = await fetch(`${LAND_URL}/crm/api/configs/${crmType}/test`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
                success: false,
                error: errorData.error || errorData.message || `HTTP ${response.status}`,
                details: errorData.details
            };
        }

        const result = await response.json().catch(() => ({}));
        return {
            success: true,
            message: result.message || 'Соединение с amocrm успешно',
            account: result.account || null,
            details: result.details || result
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Получение списка кастомных полей контактов amocrm
 * Gateway: /crm/api/contacts/amocrm/custom-fields → CRM: /contacts/amocrm/custom-fields
 * @param {string} token - JWT токен авторизации
 * @param {string} crmType - Тип CRM (по умолчанию 'amocrm')
 * @returns {Promise<{success: boolean, custom_fields?: Array<{id: number, name: string, code: string, field_type: string}>, error?: string}>}
 */
export async function getAmoCRMCustomFields(token, crmType = 'amocrm') {
    try {
        const response = await fetch(`${LAND_URL}/crm/api/contacts/${crmType}/custom-fields`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(`Ошибка при получении кастомных полей: ${response.status}`, errorData);
            return {
                success: false,
                error: errorData.error || errorData.message || `HTTP ${response.status}`
            };
        }

        const result = await response.json();

        // Сервер может вернуть custom_fields как массив или как объект с полем fields
        let fields = [];
        if (Array.isArray(result.custom_fields)) {
            fields = result.custom_fields;
        } else if (result.custom_fields && Array.isArray(result.custom_fields.fields)) {
            fields = result.custom_fields.fields;
        }

        return {
            success: result.success || true,
            custom_fields: fields
        };
    } catch (error) {
        console.error('Ошибка при получении кастомных полей:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Получение списка воронок (pipelines) amocrm с их статусами
 * Gateway: /crm/api/pipelines/:crm_type → CRM: /pipelines/:crm_type
 * @param {string} token - JWT токен авторизации
 * @param {string} crmType - Тип CRM (по умолчанию 'amocrm')
 * @returns {Promise<{success: boolean, pipelines?: Array<{id:number,name:string,statuses:Array<{id:number,name:string,color?:string,sort?:number,type?:number,is_editable?:boolean}>}>, default_pipeline_id?: number|null, error?: string}>}
 */
export async function getAmoCRMPipelines(token, crmType = 'amocrm') {
    try {
        const response = await fetch(`${LAND_URL}/crm/api/pipelines/${crmType}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(`Ошибка при получении воронок: ${response.status}`, errorData);
            return {
                success: false,
                error: errorData.error || errorData.message || `HTTP ${response.status}`
            };
        }

        const result = await response.json().catch(() => ({}));
        // Ожидаем структуру result.pipelines._embedded.pipelines
        const rawPipelines = result?.pipelines?._embedded?.pipelines || [];

        const normalized = rawPipelines.map(p => {
            const statuses = p?._embedded?.statuses || [];
            return {
                id: p.id,
                name: p.name,
                statuses: statuses.map(s => ({
                    id: s.id,
                    name: s.name,
                    color: s.color,
                    sort: s.sort,
                    type: s.type,
                    is_editable: s.is_editable
                }))
            };
        });

        return {
            success: true,
            pipelines: normalized,
            default_pipeline_id: result?.default_pipeline_id || null
        };
    } catch (error) {
        console.error('Ошибка при получении воронок:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Открыть popup окно авторизации и получить код (postMessage flow)
 * @param {string} authURL
 * @param {string} state
 * @returns {Promise<{success:boolean, code?:string, error?:string, state?:string}>}
 */
export async function openAmoCRMAuthWindow(authURL, state) {
    return new Promise((resolve) => {
        const popup = window.open(authURL, 'amocrm Authorization', 'width=600,height=700,scrollbars=yes');
        if (!popup) {
            resolve({ success: false, error: 'Не удалось открыть окно (popup заблокирован)' });
            return;
        }
        let codeReceived = false;
        let checkClosed = null; // Объявляем заранее для использования в messageHandler

        const timeout = setTimeout(() => {
            if (!codeReceived) {
                try { popup.close(); } catch (e) {}
                if (checkClosed) clearInterval(checkClosed);
                window.removeEventListener('message', messageHandler);
                resolve({ success: false, error: 'Истек срок ожидания (20 минут)' });
            }
        }, 20 * 60 * 1000);

        const messageHandler = (event) => {
            if (codeReceived) {
                return;
            }

            const data = event.data || {};

            // Обработка успешной авторизации от нашего сервера (новый способ)
            if (data.type === 'amocrm_auth_success' && data.success) {
                codeReceived = true;
                clearTimeout(timeout);
                if (checkClosed) clearInterval(checkClosed);
                window.removeEventListener('message', messageHandler);
                // Окно закроется автоматически сервером через 2 секунды
                resolve({ success: true, autoCompleted: true, expires_at: data.expires_at, state });
                return;
            }

            // Проверяем origin только для старых способов авторизации
            const isamocrm = event.origin === 'https://www.amocrm.ru';
            if (!isamocrm) {
                return;
            }

            // Обработка кода авторизации от amocrm (старый способ)
            if (data.code) {
                codeReceived = true;
                clearTimeout(timeout);
                if (checkClosed) clearInterval(checkClosed);
                setTimeout(() => { try { popup.close(); } catch (e) {} }, 100);
                window.removeEventListener('message', messageHandler);
                resolve({ success: true, code: data.code, state });
            } else if (data.error) {
                codeReceived = true;
                clearTimeout(timeout);
                if (checkClosed) clearInterval(checkClosed);
                try { popup.close(); } catch (e) {}
                window.removeEventListener('message', messageHandler);
                resolve({ success: false, error: data.error });
            }
        };
        window.addEventListener('message', messageHandler, false);

        // Присваиваем значение переменной, объявленной выше
        checkClosed = setInterval(() => {
            if (popup.closed) {
                clearInterval(checkClosed);
                if (!codeReceived) {
                    // Даём дополнительную секунду на случай, если postMessage ещё в пути
                    setTimeout(() => {
                        if (!codeReceived) {
                            clearTimeout(timeout);
                            window.removeEventListener('message', messageHandler);
                            resolve({ success: false, error: 'Окно авторизации закрыто пользователем' });
                        }
                    }, 1000);
                }
            }
        }, 500);
    });
}

/**
 * Получить конфиг amocrm (raw) – уже есть getCRMConfig, но эта обёртка возвращает boolean.
 * @param {string} token
 * @returns {Promise<boolean>}
 */
export async function isAmoCRMAuthorized(token) {
    const res = await getCRMConfig(token, 'amocrm');
    return !!(res.success && res.config && res.config.isActive);
}


/**
 * Полный OAuth процесс (сохранить конфиг -> получить auth URL -> popup -> exchange code)
 * Возвращает access_token / expires_at если сервер их отдает.
 * @param {string} token
 * @param {{name:string, subdomain:string, clientId:string, clientSecret:string}} configData
 */
export async function authorizeAmoCRM(token, configData) {
    // Шаг 1: save config
    const save = await saveAmoCRMConfig(token, configData);
    if (!save.success) return { success: false, error: `Шаг 1: ${save.error}` };
    // Шаг 2: auth URL
    // добавляю задержку в 500 мс чтобы избежать блокировки запросов на сервере
    await new Promise(resolve => setTimeout(resolve, 500));
    const urlRes = await getAmoCRMAuthURL(token);
    if (!urlRes.success) return { success: false, error: `Шаг 2: ${urlRes.error}` };
    // Шаг 3: popup
    const popupRes = await openAmoCRMAuthWindow(urlRes.auth_url, urlRes.state);
    if (!popupRes.success) return { success: false, error: `Шаг 3: ${popupRes.error}` };

    // Если авторизация завершена автоматически сервером, пропускаем exchange
    if (popupRes.autoCompleted) {
        return {
            success: true,
            expires_at: popupRes.expires_at,
            message: 'amocrm успешно авторизована'
        };
    }

    // Шаг 4: exchange (только если есть код авторизации)
    const exch = await exchangeAmoCRMCode(token, popupRes.code, popupRes.state);
    if (!exch.success) return { success: false, error: `Шаг 4: ${exch.error}` };
    return { success: true, expires_at: exch.expires_at, message: exch.message };
}

/**
 * Сохранение поля источника перехода amocrm
 * Gateway: /crm/api/configs/:crm_type/marusia-source-field → CRM: /configs/:crm_type/marusia-source-field
 * @param {string} token - JWT токен авторизации
 * @param {number} fieldId - ID поля источника перехода
 * @param {string} crmType - Тип CRM (например, "amocrm")
 * @returns {Promise<{success: boolean, error?: string, message?: string}>}
 */
export async function saveAmoCRMSourceField(token, fieldId, crmType = 'amocrm') {
    try {
        const response = await fetch(`${LAND_URL}/crm/api/configs/${crmType}/marusia-source-field`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ field_id: fieldId })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
                success: false,
                error: errorData.error || errorData.message || `HTTP ${response.status}`
            };
        }

        const result = await response.json().catch(() => ({}));
        return {
            success: result.success || true,
            message: result.message || 'Поле источника перехода сохранено'
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Установка настроек лида по умолчанию (pipeline + статус) для amocrm конфигурации
 * Gateway: /crm/api/configs/:crm_type/default-pipeline → CRM: /configs/:crm_type/default-pipeline
 * Сервер ожидает: { pipeline_id: number, status_id: number }
 * @param {string} token - JWT токен авторизации
 * @param {number} pipelineId - ID выбранной воронки
 * @param {number} statusId - ID выбранного статуса воронки
 * @param {string} crmType - Тип CRM (по умолчанию 'amocrm')
 * @returns {Promise<{success: boolean, message?: string, error?: string}>}
 */
export async function saveAmoCRMDefaultPipeline(token, pipelineId, statusId, crmType = 'amocrm') {
    try {
        const response = await fetch(`${LAND_URL}/crm/api/configs/${crmType}/default-lead-settings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ pipeline_id: pipelineId, status_id: statusId })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(`Ошибка установки настроек лида по умолчанию: ${response.status}`, errorData);
            return {
                success: false,
                error: errorData.error || errorData.message || `HTTP ${response.status}`
            };
        }

        const result = await response.json().catch(() => ({}));
        return {
            success: result.success || true,
            message: result.message || 'Настройки лида (pipeline + статус) успешно сохранены'
        };
    } catch (error) {
        console.error('Ошибка при установке настроек лида по умолчанию:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Получение настроек каналов CRM (channels) для текущей конфигурации
 * Gateway: /crm/api/configs/:crm_type/channels → CRM: /configs/:crm_type/channels (GET)
 * @param {string} token - JWT токен авторизации
 * @param {string} crmType - Тип CRM (по умолчанию 'amocrm')
 * @returns {Promise<{success: boolean, settings?: {
 *   Assist?: string,
 *   User?: string,
 *   Meta?: string,
 *   Voice?: string,
 *   File?: string,
 *   LeadName?: string,
 *   Tags?: string[],
 *   CreateNewContact?: boolean,
 *   CreateNewLead?: boolean,
 *   ChatMessages?: boolean,
 *   MetaExist?: boolean,
 *   Telegram?: number,
 *   Instagram?: number,
 *   Widget?: number,
 *   AltContact?: boolean
 * }, error?: string}>}
 */
export async function getCRMChannelSettings(token, crmType = 'amocrm') {
    if (!token) return { success: false, error: 'Токен не передан' };
    try {
        const response = await fetch(`${LAND_URL}/crm/api/configs/${crmType}/channels`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
                success: false,
                error: errorData.error || errorData.message || `HTTP ${response.status}`
            };
        }
        const result = await response.json().catch(() => ({}));
        return {
            success: !!result.success,
            settings: result.settings || null
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Сохранение/обновление настроек каналов CRM (channels)
 * Gateway: /crm/api/configs/:crm_type/channels → CRM: /configs/:crm_type/channels (POST)
 * Сервер ожидает структуру CRMChannelSettings:
 * {
 *   Assist: string,
 *   User: string,
 *   Meta: string,
 *   Voice: string,
 *   File: string,
 *   LeadName: string,
 *   Tags: string[],
 *   CreateNewContact: boolean,
 *   CreateNewLead: boolean,
 *   ChatMessages: boolean,
 *   MetaExist: boolean,
 *   Telegram: number,
 *   Instagram: number,
 *   Widget: number,
 *   AltContact: boolean
 * }
 * @param {string} token - JWT токен авторизации
 * @param {Object} settings - Настройки каналов
 * @param {string} crmType - Тип CRM (по умолчанию 'amocrm')
 * @returns {Promise<{success: boolean, message?: string, error?: string}>}
 */
export async function saveCRMChannelSettings(token, settings, crmType = 'amocrm') {
    if (!token) return { success: false, error: 'Токен не передан' };
    if (!settings || typeof settings !== 'object') return { success: false, error: 'Некорректные настройки' };
    // Нормализуем Tags
    const normalized = {
        Assist: settings.Assist || '',
        User: settings.User || '',
        Meta: settings.Meta || '',
        Voice: settings.Voice || '',
        File: settings.File || '',
        LeadName: settings.LeadName || '',
        Tags: Array.isArray(settings.Tags) ? settings.Tags : [],
        CreateNewContact: !!settings.CreateNewContact,
        CreateNewLead: !!settings.CreateNewLead,
        ChatMessages: !!settings.ChatMessages,
        MetaExist: !!settings.MetaExist,
        Telegram: settings.Telegram || 0,
        Instagram: settings.Instagram || 0,
        Widget: settings.Widget || 0,
        AltContact: !!settings.AltContact
    };
    try {
        const response = await fetch(`${LAND_URL}/crm/api/configs/${crmType}/channels`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(normalized)
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
                success: false,
                error: errorData.error || errorData.message || `HTTP ${response.status}`
            };
        }
        const result = await response.json().catch(() => ({}));
        return {
            success: !!result.success,
            message: result.message || 'Настройки каналов сохранены'
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Получение метаданных всех кастомных полей контактов amocrm
 * Gateway: /crm/api/configs/:crm_type/custom-fields → CRM: /configs/:crm_type/custom-fields
 * @param {string} token - JWT токен авторизации
 * @param {string} crmType - Тип CRM (по умолчанию 'amocrm')
 * @returns {Promise<{success: boolean, custom_fields?: Array<{
 *   id: number,
 *   name: string,
 *   code: string,
 *   field_type: string,
 *   sort: number,
 *   is_api_only: boolean,
 *   is_multiple: boolean,
 *   is_system: boolean,
 *   is_editable: boolean,
 *   is_required: boolean,
 *   is_visible: boolean,
 *   is_deletable: boolean,
 *   enums?: Array<{value: string, sort: number}>
 * }>, entity_type?: string, error?: string}>}
 */
export async function getAmoCRMCustomFieldsMetadata(token, crmType = 'amocrm') {
    try {
        const response = await fetch(`${LAND_URL}/crm/api/configs/${crmType}/custom-fields`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(`Ошибка при получении метаданных кастомных полей: ${response.status}`, errorData);
            return {
                success: false,
                error: errorData.error || errorData.message || `HTTP ${response.status}`
            };
        }

        const result = await response.json();

        // Сервер может вернуть custom_fields как массив или как объект с полем fields
        let fields = [];
        if (Array.isArray(result.custom_fields)) {
            fields = result.custom_fields;
        } else if (result.custom_fields && Array.isArray(result.custom_fields.fields)) {
            fields = result.custom_fields.fields;
        }

        return {
            success: result.success || true,
            custom_fields: fields,
            entity_type: result.entity_type
        };
    } catch (error) {
        console.error('Ошибка при получении метаданных кастомных полей:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Создание нового кастомного поля контактов amocrm
 * Gateway: /crm/api/configs/:crm_type/custom-fields → CRM: /configs/:crm_type/custom-fields
 * @param {string} token - JWT токен авторизации
 * @param {Object} fieldData - Данные для создания поля
 * @param {string} fieldData.name - Название поля (обязательно)
 * @param {string} fieldData.type - Тип поля (обязательно, например: 'text', 'select', 'multiselect')
 * @param {string} [fieldData.code] - Код поля (опционально)
 * @param {Array<{value: string, sort?: number}>} [fieldData.enums] - Варианты для списков (опционально)
 * @param {string} crmType - Тип CRM (по умолчанию 'amocrm')
 * @returns {Promise<{success: boolean, custom_field?: Object, message?: string, entity_type?: string, error?: string}>}
 */
export async function createAmoCRMCustomField(token, fieldData, crmType = 'amocrm') {
    try {
        const response = await fetch(`${LAND_URL}/crm/api/configs/${crmType}/custom-fields`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: fieldData.name,
                type: fieldData.type,
                code: fieldData.code || undefined,
                enums: fieldData.enums || undefined
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(`Ошибка при создании кастомного поля: ${response.status}`, errorData);
            return {
                success: false,
                error: errorData.error || errorData.message || `HTTP ${response.status}`
            };
        }

        const result = await response.json();

        return {
            success: result.success || true,
            custom_field: result.custom_field,
            message: result.message || 'Пользовательское поле успешно создано',
            entity_type: result.entity_type
        };
    } catch (error) {
        console.error('Ошибка при создании кастомного поля:', error);
        return { success: false, error: error.message };
    }
}
