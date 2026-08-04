import {getAuthToken} from "../../../utils/easyUtils";

export class WhatsAuthServive {
    constructor(t) {
        this.socket = null;
        this.t = t || ((key) => key); // Fallback if t is not provided
        this.callbacks = {
            onQrCode: null,
            onQrSuccess: null,
            onSuccess: null,
            onError: null,
            onUpdateToken: null,
        };
    }

    setCallbacks(callbacks) {
        this.callbacks = {...this.callbacks, ...callbacks};
    }

    async startAuthentication() {
        if (typeof window === 'undefined') return false;
        try {
            const token = getAuthToken();
            if (token) {
                this.connectWebSocket(token);
                return true;
            } else {
                this.callbacks.onUpdateToken();
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
        if (typeof window === 'undefined') return;
        const wsUrl = `/v1/ws/whats`;

        this.socket = new WebSocket(wsUrl, [token]);

        this.socket.onopen = () => {
        };

        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                switch (data.type) {
                    case 'qr_code':
                        if (this.callbacks.onQrCode) {
                            this.callbacks.onQrCode(data.payload);
                        }
                        break;
                    case 'qr-success':
                        if (this.callbacks.onQrSuccess) {
                            this.callbacks.onQrSuccess();
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

    closeConnection() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }
}
