import {encryptPassword, getKey, authFetch, getAuthToken} from "../../../utils/easyUtils";

export interface MasterKeyProgressMessage {
    type: 'progress' | 'success' | 'error';
    message: string;
    data?: {
        raw_master_key: string;
        warning: string;
    };
}

/**
 * # ─────────────── WEBSOCKETS ───────────────
 * /ws/create-master-key:
 *   get:
 *     tags: [ws, master-key]
 *     summary: "WebSocket: создание MasterKey пользователя"
 *     description: |
 *       Создаёт 32-байтовый MasterKey (PBKDF2 + AES-256-GCM), шифрует им
 *       существующие API-ключи и возвращает raw key **один раз**.
 *
 *       **Аутентификация:** Bearer-токен через `Sec-WebSocket-Protocol` или `?token=`.
 *
 *       **Query-параметры:**
 *       - `respId` — свежий respId из `POST /auth/session-key` (TTL 30 сек)
 *       - `pass` — пароль пользователя, зашифрованный AES-CBC (как при логине)
 */
export async function createMasterKey(
    userId: number | string,
    password: string,
    onProgress?: (msg: MasterKeyProgressMessage) => void
): Promise<{ raw_master_key: string; warning: string }> {
    const keyResult = await getKey({userId});
    if (keyResult.status !== 'ok') {
        throw new Error('Ошибка получения ключа шифрования');
    }

    const encryptedPassword = await encryptPassword(password, keyResult.key);
    const respId = keyResult.respId ?? userId;
    const token = getAuthToken();

    return new Promise((resolve, reject) => {
        const url = new URL(`/v1/ws/create-master-key`);
        url.searchParams.append('respId', respId.toString());
        url.searchParams.append('pass', encryptedPassword);
        if (token) url.searchParams.append('token', token);

        const socket = new WebSocket(url.toString());

        socket.onmessage = (event) => {
            try {
                const data: MasterKeyProgressMessage = JSON.parse(event.data);
                if (onProgress) onProgress(data);

                if (data.type === 'success' && data.data) {
                    // Задержка, чтобы пользователь успел увидеть данные
                    setTimeout(() => {
                        resolve(data.data!);
                        socket.close();
                    }, 1500);
                } else if (data.type === 'error') {
                    reject(new Error(data.message));
                }
            } catch (e) {
                reject(new Error('Ошибка парсинга сообщения от сервера'));
            }
        };

        socket.onerror = () => {
            reject(new Error('Ошибка WebSocket соединения'));
        };

        socket.onclose = (event) => {
            if (!event.wasClean) {
                reject(new Error(`Соединение закрыто: ${event.reason || event.code}`));
            }
        };
    });
}

/**
 * POST /auth/verify-password
 * Проверяет пароль пользователя против сохранённого bcrypt-хэша.
 */
export async function verifyPassword(
    userId: number | string,
    password: string
): Promise<void> {
    const keyResult = await getKey({userId});
    if (keyResult.status !== 'ok') {
        throw new Error('Ошибка получения ключа шифрования');
    }
    const encryptedPassword = await encryptPassword(password, keyResult.key);

    const response = await authFetch(`/v1/auth/verify-password`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            a: keyResult.respId ?? userId,
            b: encryptedPassword,
        }),
    });

    if (response.status === 401) {
        throw new Error('mkWrongOldPassword');
    }
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Ошибка сервера: ${response.status}`);
    }
}

/**
 * POST /auth/rewrap-master-key
 * Сначала проверяет старый пароль через /auth/verify-password,
 * затем перешифровывает MasterKey с новым паролем.
 * rawMasterKey — опционально (если MasterKey не создан, передаётся пустая строка).
 */
export async function rewrapMasterKey(
    userId: number | string,
    oldPassword: string,
    rawMasterKey: string | null,
    newPassword: string
): Promise<void> {
    // Шаг 1: проверяем старый пароль
    await verifyPassword(userId, oldPassword);

    // Шаг 2: получаем свежий ключ для шифрования нового пароля
    const keyResult = await getKey({userId});
    if (keyResult.status !== 'ok') {
        throw new Error('Ошибка получения ключа шифрования (новый пароль)');
    }
    const encryptedNewPassword = await encryptPassword(newPassword, keyResult.key);

    const rewrapBody: Record<string, unknown> = {
        a: keyResult.respId ?? userId,
        c: encryptedNewPassword,
    };
    if (rawMasterKey?.trim()) {
        rewrapBody.b = rawMasterKey.trim();
    }

    const response = await authFetch(`/v1/auth/rewrap-master-key`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(rewrapBody),
    });

    if (response.status === 401) {
        throw new Error('mkWrongOldPassword');
    }
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Ошибка сервера: ${response.status}`);
    }
}
