import { getAuthToken } from "../../../utils/easyUtils";

export class TelegramAuthService {
    constructor(t) {
        this.socket = null;
        this.authParams = null;
        this.t = t || ((key) => key); // Fallback if t is not provided
        this.callbacks = {
            onQrCode: null,
            onPasswordRequest: null,
            onSuccess: null,
            onError: null,
            onUpdateToken: null,
        };
    }

    setCallbacks(callbacks) {
        this.callbacks = {...this.callbacks, ...callbacks};
    }

    async startAuthentication(params) {
        try {
            const token = getAuthToken();
            if (token) {
                // Сохраняем параметры авторизации для отправки через WebSocket
                this.authParams = {
                    app_id: parseInt(params.appId),
                    app_hash: params.appHash,
                    phone: params.phone,
                };

                this.connectWebSocket(token);
                return true;
            } else {
                if (this.callbacks.onUpdateToken) {
                    this.callbacks.onUpdateToken();
                }
                return false;
            }
        } catch (error) {
            if (this.callbacks.onError) {
                this.callbacks.onError(`${this.t("telegramAuthStartError") || "Ошибка запуска аутентификации:"} ${error.message}`);
            }
            throw error;
        }
    }

    connectWebSocket(token) {

        const wsUrl = `/v1/ws/tguser`;

        this.socket = new WebSocket(wsUrl, [token]);

        this.socket.onopen = () => {
        };

        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                switch (data.type) {
                    case 'request_auth_data':
                        // Сервер запрашивает данные авторизации - отправляем их
                        if (this.authParams) {
                            this.socket.send(JSON.stringify({
                                type: 'auth_data',
                                ...this.authParams
                            }));
                        } else {
                            this.callbacks.onError(this.t("telegramAuthParamsNotFound") || "Параметры авторизации не найдены");
                        }
                        break;
                    case 'qr_code':
                        if (this.callbacks.onQrCode) {
                            this.callbacks.onQrCode(data.payload);
                        }
                        break;
                    case 'need_password':
                        if (this.callbacks.onPasswordRequest) {
                            this.callbacks.onPasswordRequest();
                        }
                        break;
                    case 'success':
                        if (this.callbacks.onSuccess) {
                            this.callbacks.onSuccess();
                        }
                        break;
                    case 'error':
                        if (this.callbacks.onError) {
                            this.callbacks.onError(data.payload);
                        }
                        break;
                    default:
                        console.warn(`${this.t("telegramAuthUnknownMessage") || "Неизвестный тип сообщения WebSocket:"} ${data.type}`);
                        if (this.callbacks.onError) {
                            this.callbacks.onError(data.payload || this.t("telegramAuthUnknownError") || "Неизвестная ошибка");
                        }
                }
            } catch (error) {
                console.error(`${this.t("telegramAuthWSError") || "Ошибка WebSocket:"} ${error}`);
                if (this.callbacks.onError) {
                    this.callbacks.onError(this.t("telegramAuthProcessError") || "Ошибка обработки сообщения от сервера");
                }
            }
        };

        this.socket.onerror = (error) => {
            console.error(`${this.t("telegramAuthWSError") || "Ошибка WebSocket:"} ${error}`);
            if (this.callbacks.onError) {
                this.callbacks.onError(this.t("telegramAuthWebSocketError") || "Ошибка соединения WebSocket");
            }
        };

        this.socket.onclose = () => {
        };
    }

    submitPassword(password) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'password',
                password: password
            }));
        } else {
            if (this.callbacks.onError) {
                this.callbacks.onError(this.t("telegramAuthWebSocketInactive") || "WebSocket соединение не активно");
            }
        }
    }

    closeConnection() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.authParams = null;
    }
}