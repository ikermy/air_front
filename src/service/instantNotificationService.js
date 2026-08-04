import {getAuthToken, refreshToken} from '../utils/easyUtils';

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

    async connect() {
        if (typeof window === 'undefined') return;
        if (this.ws?.readyState === WebSocket.OPEN) {
            return;
        }

        // Берём начальный токен (кука/localStorage)
        let currentToken = getAuthToken();

        if (!currentToken) {
            // Пытаемся получить токен через рефреш если нет STA
            const newToken = await refreshToken();
            if (newToken) {
                currentToken = newToken;
            } else {
                console.error('Ошибка аутентификации: токен не найден');
                this.notifyListeners({error: 'authentication_failed'});
                return;
            }
        }

        this.token = currentToken;
        this.shouldReconnect = true;
        this.reconnectAttempts = 0;

        try {
            const devEnvoy = window.location.port === "3001";
            const wsUrl = devEnvoy
                ? "wss://localhost/v1/ws/instant"
                : `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/v1/ws/instant`;
            this.ws = new WebSocket(wsUrl, [this.token]);

            this.ws.onopen = () => {
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
        if (this.isRefreshingToken || typeof window === 'undefined') {
            return; // Уже обновляем токен или SSR
        }

        this.isRefreshingToken = true;

        try {
            // Закрываем текущее соединение
            if (this.ws) {
                this.ws.close();
                this.ws = null;
            }

            // Пытаемся обновить токен через refreshToken из easyUtils
            const newToken = await refreshToken();

            if (newToken) {
                this.token = newToken;
                this.reconnectAttempts = 0;

                // Переподключаемся с новым токеном
                setTimeout(() => {
                    this.connect();
                }, 1000);
            } else {
                console.error('Не удалось обновить токен');
                this.notifyListeners({error: 'token_refresh_failed'});
                this.shouldReconnect = false;
            }
        } catch (error) {
            console.error('Ошибка при обновлении токена:', error);
            this.notifyListeners({error: 'token_refresh_error'});
        } finally {
            this.isRefreshingToken = false;
        }
    }

    attemptReconnect() {
        if (!this.shouldReconnect || this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            return;
        }

        this.reconnectAttempts++;

        setTimeout(async () => {
            if (this.shouldReconnect) {
                await this.connect();
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
