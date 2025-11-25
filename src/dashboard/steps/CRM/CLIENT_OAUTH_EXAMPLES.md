# Клиентская реализация OAuth для AmoCRM

## Обновленные функции для клиента

```javascript
const LAND_URL = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND) || process.env.REACT_APP_LAND;

/**
 * Шаг 1: Сохранить конфигурацию AmoCRM (client_id, client_secret, subdomain)
 * Эти данные получаются при создании интеграции в личном кабинете amoCRM
 * @param {string} token - JWT токен авторизации
 * @param {Object} configData - Данные конфигурации
 * @param {string} configData.name - Название конфигурации
 * @param {string} configData.subdomain - Поддомен AmoCRM (из адреса mycompany.amocrm.ru)
 * @param {string} configData.clientId - ID интеграции (из личного кабинета amoCRM)
 * @param {string} configData.clientSecret - Секретный ключ (из личного кабинета amoCRM)
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
                name: configData.name || 'AmoCRM',
                subdomain: configData.subdomain,
                credentials: {
                    client_id: configData.clientId,
                    client_secret: configData.clientSecret
                },
                is_active: false // пока не авторизованы
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(`Ошибка при сохранении конфигурации: ${response.status}`, errorData);
            return { success: false, error: errorData.error || `HTTP ${response.status}` };
        }

        const result = await response.json();
        console.log('Конфигурация AmoCRM сохранена:', result);
        return { success: true, config: result.config };
    } catch (error) {
        console.error('Ошибка при сохранении конфигурации:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Шаг 2: Получить URL для авторизации в AmoCRM
 * Требует предварительного сохранения конфигурации (через saveAmoCRMConfig)
 * @param {string} token - JWT токен авторизации
 * @returns {Promise<{success: boolean, auth_url?: string, state?: string, error?: string}>}
 */
export async function getAmoCRMAuthURL(token) {
    try {
        const response = await fetch(`${LAND_URL}/crm/api/oauth/amocrm/auth`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({}) // Пустой body - все данные из сохраненной конфигурации
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(`Ошибка при получении auth URL: ${response.status}`, errorData);
            return { success: false, error: errorData.error || `HTTP ${response.status}` };
        }

        const result = await response.json();
        console.log('Auth URL получен:', result);
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
 * Получить конфигурацию AmoCRM
 * Использует traditional OAuth redirect (не mode=post_message)
 * @param {string} token - JWT токен авторизации
 * @param {Object} configData - Данные конфигурации (для Шага 1)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function authorizeAmoCRM(token, configData) {
    try {
        // Шаг 1: Сохраняем конфигурацию
        console.log('Шаг 1: Сохранение конфигурации...');
        const saveResult = await saveAmoCRMConfig(token, configData);
        if (!saveResult.success) {
            return { success: false, error: `Шаг 1: ${saveResult.error}` };
        }

        // Шаг 2: Получаем auth URL
        console.log('Шаг 2: Получение auth URL...');
        const authURLResult = await getAmoCRMAuthURL(token);
        if (!authURLResult.success) {
            return { success: false, error: `Шаг 2: ${authURLResult.error}` };
        }

        // Шаг 3: Открываем auth URL в текущем окне (traditional redirect)
        console.log('Шаг 3: Перенаправление на авторизацию AmoCRM...');
        window.location.href = authURLResult.auth_url;
        
        // Код ниже не будет выполнен т.к. произойдет redirect
        return { success: true };
    } catch (error) {
        console.error('Ошибка процесса авторизации:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Получить конфигурацию AmoCRM
 * @param {string} token - JWT токен авторизации
 * @returns {Promise<{success: boolean, config?: Object, error?: string}>}
 */
export async function getAmoCRMConfig(token) {
    try {
        const response = await fetch(`${LAND_URL}/crm/api/configs/amocrm`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                return { success: false, error: 'Конфигурация не найдена' };
            }
            const errorData = await response.json().catch(() => ({}));
            return { success: false, error: errorData.error || `HTTP ${response.status}` };
        }

        const config = await response.json();
        return { success: true, config };
    } catch (error) {
        console.error('Ошибка получения конфигурации:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Проверка, авторизован ли AmoCRM
 * @param {string} token - JWT токен авторизации
 * @returns {Promise<boolean>}
 */
export async function isAmoCRMAuthorized(token) {
    const result = await getAmoCRMConfig(token);
    return result.success && result.config && result.config.is_active === true;
}

/**
 * Mock OAuth: Создать mock токены для локального тестирования БЕЗ ngrok
 * Требует предварительного сохранения конфигурации (через saveAmoCRMConfig)
 * @param {string} token - JWT токен авторизации
 * @returns {Promise<{success: boolean, access_token?: string, expires_at?: number, error?: string}>}
 */
export async function createMockAmoCRMTokens(token) {
    try {
        const response = await fetch(`${LAND_URL}/crm/api/mock/oauth/amocrm/auth`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({}) // пустой body - все данные из сохраненной конфигурации
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(`Ошибка при создании mock токенов: ${response.status}`, errorData);
            return { success: false, error: errorData.error || `HTTP ${response.status}` };
        }

        const result = await response.json();
        console.log('Mock токены созданы:', result);
        return { 
            success: true, 
            access_token: result.access_token,
            expires_at: result.expires_at
        };
    } catch (error) {
        console.error('Ошибка при создании mock токенов:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Mock OAuth: Обновить mock токен
 * @param {string} token - JWT токен авторизации
 * @returns {Promise<{success: boolean, access_token?: string, expires_at?: number, error?: string}>}
 */
export async function refreshMockAmoCRMToken(token) {
    try {
        const response = await fetch(`${LAND_URL}/crm/api/mock/oauth/amocrm/refresh`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({}) // пустой body
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(`Ошибка при обновлении mock токена: ${response.status}`, errorData);
            return { success: false, error: errorData.error || `HTTP ${response.status}` };
        }

        const result = await response.json();
        console.log('Mock токен обновлен:', result);
        return { 
            success: true,
            access_token: result.access_token,
            expires_at: result.expires_at
        };
    } catch (error) {
        console.error('Ошибка при обновлении mock токена:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Упрощенная Mock авторизация для локального тестирования (БЕЗ ngrok)
 * @param {string} token - JWT токен авторизации
 * @param {Object} configData - Данные конфигурации
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function mockAuthorizeAmoCRM(token, configData) {
    try {
        // Шаг 1: Сохраняем конфигурацию
        console.log('Шаг 1: Сохранение конфигурации...');
        const saveResult = await saveAmoCRMConfig(token, configData);
        if (!saveResult.success) {
            return { success: false, error: `Шаг 1: ${saveResult.error}` };
        }

        // Шаг 2: Создаем mock токены (вместо реального OAuth)
        console.log('Шаг 2: Создание mock токенов...');
        const mockResult = await createMockAmoCRMTokens(token);
        if (!mockResult.success) {
            return { success: false, error: `Шаг 2: ${mockResult.error}` };
        }

        console.log('✅ Mock AmoCRM успешно авторизована!');
        return { success: true };
    } catch (error) {
        console.error('Ошибка mock авторизации:', error);
        return { success: false, error: error.message };
    }
}
```

## Пример использования в React компоненте

```jsx
import React, { useState } from 'react';
import { 
    authorizeAmoCRM, 
    isAmoCRMAuthorized, 
    getAmoCRMConfig 
} from './api/amocrm';

function AmoCRMIntegration({ jwtToken }) {
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Проверяем статус при монтировании
    useEffect(() => {
        async function checkStatus() {
            const authorized = await isAmoCRMAuthorized(jwtToken);
            setIsAuthorized(authorized);
        }
        checkStatus();
    }, [jwtToken]);

    const handleAuthorize = async () => {
        setLoading(true);
        setError(null);

        const result = await authorizeAmoCRM(jwtToken, {
            name: 'Моя AmoCRM',
            subdomain: 'mycompany', // из адреса mycompany.amocrm.ru
            clientId: 'xxx', // ID интеграции из личного кабинета amoCRM
            clientSecret: 'yyy' // Секретный ключ из личного кабинета amoCRM
        });

        setLoading(false);

        if (result.success) {
            setIsAuthorized(true);
            alert('AmoCRM успешно подключена!');
        } else {
            setError(result.error);
        }
    };

    return (
        <div>
            <h2>Интеграция с AmoCRM</h2>
            
            {isAuthorized ? (
                <div>✅ AmoCRM подключена</div>
            ) : (
                <button onClick={handleAuthorize} disabled={loading}>
                    {loading ? 'Авторизация...' : 'Подключить AmoCRM'}
                </button>
            )}

            {error && <div style={{color: 'red'}}>{error}</div>}
        </div>
    );
}
```

### Mock OAuth для локального тестирования (БЕЗ ngrok)

```jsx
import React, { useState, useEffect } from 'react';
import { 
    mockAuthorizeAmoCRM, 
    isAmoCRMAuthorized,
    refreshMockAmoCRMToken
} from './api/amocrm';

function AmoCRMIntegrationMock({ jwtToken }) {
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function checkStatus() {
            const authorized = await isAmoCRMAuthorized(jwtToken);
            setIsAuthorized(authorized);
        }
        checkStatus();
    }, [jwtToken]);

    const handleMockAuthorize = async () => {
        setLoading(true);
        setError(null);

        // Mock авторизация - без реального OAuth
        const result = await mockAuthorizeAmoCRM(jwtToken, {
            name: 'AmoCRM Test',
            subdomain: 'test',
            clientId: 'test_client_id',
            clientSecret: 'test_secret'
        });

        setLoading(false);

        if (result.success) {
            setIsAuthorized(true);
            alert('Mock AmoCRM успешно подключена! ⚠️ Используйте только для тестирования!');
        } else {
            setError(result.error);
        }
    };

    const handleRefreshToken = async () => {
        const result = await refreshMockAmoCRMToken(jwtToken);
        if (result.success) {
            alert('Mock токен обновлен!');
        } else {
            setError(result.error);
        }
    };

    return (
        <div>
            <h2>Mock интеграция с AmoCRM (для разработки)</h2>
            <p style={{color: 'orange'}}>⚠️ Mock режим - для локального тестирования БЕЗ ngrok</p>
            
            {isAuthorized ? (
                <div>
                    <div>✅ Mock AmoCRM подключена</div>
                    <button onClick={handleRefreshToken}>Обновить mock токен</button>
                </div>
            ) : (
                <button onClick={handleMockAuthorize} disabled={loading}>
                    {loading ? 'Создание mock токенов...' : 'Подключить Mock AmoCRM'}
                </button>
            )}

            {error && <div style={{color: 'red'}}>{error}</div>}
        </div>
    );
}
```

## Важные замечания

1. **Client ID и Client Secret** получаются ОДИН РАЗ при создании интеграции в личном кабинете amoCRM
2. **Код авторизации** действителен только **20 минут**
3. **State** также действителен **20 минут** для защиты от CSRF
4. Функция `authorizeAmoCRM()` выполняет все 4 шага автоматически
5. После успешной авторизации `is_active` станет `true` и токены будут сохранены
6. **Mock OAuth** - используйте ТОЛЬКО для локального тестирования БЕЗ реального подключения к amoCRM

### О предупреждении ngrok и redirect_uri

При использовании ngrok для локальной разработки:

**В настройках интеграции amoCRM указываем:**
```
https://your-domain.ngrok-free.dev/crm/oauth/amocrm/callback
```

**Например:**
```
https://strapless-alanna-quietly.ngrok-free.dev/crm/oauth/amocrm/callback
```

При использовании бесплатного ngrok вы увидите страницу предупреждения:
```
You are about to visit: xxx.ngrok-free.dev
This website is served for free through ngrok.com
```

**Что происходит при mode=post_message:**

1. **Пользователь авторизуется в AmoCRM** → AmoCRM делает **ДВЕ ОДНОВРЕМЕННЫЕ** вещи:
   - ✅ **Отправляет код через `window.postMessage`** на родительское окно (ваш клиент)
   - ⚠️ **Делает HTTP redirect** на `https://xxx.ngrok-free.dev/crm/oauth/amocrm/callback`

2. **Ваш клиент получает код через postMessage** → автоматически:
   - ✅ Закрывает popup окно
   - ✅ Отправляет код на `/crm/api/oauth/amocrm/exchange`
   - ✅ Получает и сохраняет токены в БД
   - ✅ Устанавливает `is_active = true`

3. **ПАРАЛЛЕЛЬНО происходит redirect на ngrok:**
   - ⚠️ Появляется страница ngrok warning "You are about to visit..."
   - ⚠️ Если пользователь нажмет "Visit Site", браузер отправит GET запрос на `/crm/oauth/amocrm/callback`
   - ⚠️ Сервер ответит: `{"error":"этот endpoint не используется при mode=post_message"...}`
   - ✅ **ЭТО НОРМАЛЬНО!** Код УЖЕ обработан через `postMessage` на шаге 2!

**Важно понимать:**

- 📌 **Сообщение `"этот endpoint не используется при mode=post_message"`** - это НЕ ошибка, а **информационное сообщение**
- 📌 К этому моменту **авторизация УЖЕ ЗАВЕРШЕНА успешно** через `postMessage`
- 📌 **Токены УЖЕ сохранены** в вашей БД
- 📌 Popup окно **УЖЕ закрыто** вашим клиентом
- 📌 Redirect на `/oauth/amocrm/callback` - это **побочный эффект**, который можно игнорировать

**Проверка успешной авторизации:**

```javascript
// После авторизации проверьте статус:
const isAuthorized = await isAmoCRMAuthorized(token);
console.log('AmoCRM авторизована:', isAuthorized); // должно быть true

// Или получите конфигурацию:
const { config } = await getAmoCRMConfig(token);
console.log('Is active:', config.is_active); // должно быть true
console.log('Токены сохранены:', config.credentials); // должны быть токены
```

**✅ Итог - всё работает правильно:**

| Что вы видите | Что это значит | Действия |
|--------------|----------------|----------|
| ✅ Код получен через `postMessage` | Авторизация успешна | Ничего, всё работает |
| ✅ Токены сохранены в БД | OAuth завершен | Можно использовать API |
| ✅ `is_active = true` | CRM подключена | Готово к работе |
| ⚠️ Страница ngrok warning | Побочный эффект redirect | Можно игнорировать |
| ⚠️ Сообщение `"этот endpoint не используется..."` | Информация, не ошибка | Можно игнорировать |

**🎯 Как проверить что авторизация прошла успешно:**

```javascript
// Вызовите после authorizeAmoCRM():
const result = await authorizeAmoCRM(token, configData);

if (result.success) {
    // Проверяем статус
    const isAuth = await isAmoCRMAuthorized(token);
    console.log('✅ AmoCRM авторизована:', isAuth); // true = успех!
    
    // Теперь можно работать с API AmoCRM
}
```

**🔧 Решения для локальной разработки:**
- **Для локальной разработки:** используйте Mock OAuth (см. `mockAuthorizeAmoCRM`) - БЕЗ ngrok и реального OAuth
- **Для production:** используйте платный ngrok (без страницы warning) или реальный домен
- **Страница ngrok warning** показывается только при первом визите (ngrok запоминает браузер)

