import { validateAndRefreshToken } from '../utils/easyUtils';

const RECONNECT_INTERVAL = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

class InstantNotificationService {
    constructor() {
        this.ws = null;
        this.token = null;
        this.reconnectAttempts = 0;
        this.shouldReconnect = false;
        this.listeners = new Set();
        this.isRefreshingToken = false;
    }

    async connect(token) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            return;
        }

        // Валидируем и обновляем токен перед подключением
        const validToken = await validateAndRefreshToken(token);
        if (!validToken) {
            console.error('Ошибка аутентификации: невозможно получить валидный токен');
            this.notifyListeners({ error: 'authentication_failed' });
            return;
        }

        this.token = validToken;
        this.shouldReconnect = true;
        this.reconnectAttempts = 0;

        try {
            const LAND_WSS = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND_WSS) || process.env.REACT_APP_LAND_WSS;

            this.ws = new WebSocket(`${LAND_WSS}/ws/instant?token=${encodeURIComponent(this.token)}`);

            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.reconnectAttempts = 0;
            };

            this.ws.onmessage = async (event) => {
                try {
                    const message = JSON.parse(event.data);

                    // Проверяем на ошибку авторизации от сервера
                    if (message.error === 'Invalid token' || message.error === 'Unauthorized') {
                        console.warn('Получена ошибка авторизации, обновляем токен...');
                        await this.handleTokenRefresh();
                        return;
                    }

                    this.notifyListeners(message);
                } catch (error) {
                    console.error('Error parsing message:', error);
                }
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

            this.ws.onclose = (event) => {
                console.log('WebSocket disconnected', event.code, event.reason);

                // Если код закрытия 1008 (Policy Violation) или 4001 (custom unauthorized)
                // это может означать ошибку аутентификации
                if (event.code === 1008 || event.code === 4001) {
                    this.handleTokenRefresh();
                } else {
                    this.attemptReconnect();
                }
            };
        } catch (error) {
            console.error('Error creating WebSocket:', error);
            this.attemptReconnect();
        }
    }

    async handleTokenRefresh() {
        if (this.isRefreshingToken) {
            return; // Уже обновляем токен
        }

        this.isRefreshingToken = true;

        try {
            // Закрываем текущее соединение
            if (this.ws) {
                this.ws.close();
                this.ws = null;
            }

            // Получаем текущий токен из localStorage и обновляем его
            const currentToken = localStorage.getItem("authToken");
            const newToken = await validateAndRefreshToken(currentToken);

            if (newToken) {
                console.log('Токен успешно обновлен, переподключаемся...');
                this.token = newToken;
                this.reconnectAttempts = 0;

                // Переподключаемся с новым токеном
                setTimeout(() => {
                    this.connect(newToken);
                }, 1000);
            } else {
                console.error('Не удалось обновить токен');
                this.notifyListeners({ error: 'token_refresh_failed' });
                this.shouldReconnect = false;
            }
        } catch (error) {
            console.error('Ошибка при обновлении токена:', error);
            this.notifyListeners({ error: 'token_refresh_error' });
        } finally {
            this.isRefreshingToken = false;
        }
    }

    attemptReconnect() {
        if (!this.shouldReconnect || this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            console.log('Превышен лимит попыток переподключения или переподключение отключено');
            return;
        }

        this.reconnectAttempts++;
        console.log(`Попытка переподключения ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}...`);

        setTimeout(async () => {
            if (this.token && this.shouldReconnect) {
                await this.connect(this.token);
            }
        }, RECONNECT_INTERVAL);
    }

    disconnect() {
        this.shouldReconnect = false;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    addListener(callback) {
        this.listeners.add(callback);
    }

    removeListener(callback) {
        this.listeners.delete(callback);
    }

    notifyListeners(message) {
        this.listeners.forEach(callback => callback(message));
    }
}

export const instantNotificationService = new InstantNotificationService();
