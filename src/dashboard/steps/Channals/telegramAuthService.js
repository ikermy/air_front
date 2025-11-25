// telegramAuthService.js
import {validateAndRefreshToken} from "../../../utils/easyUtils";

export class TelegramAuthService {
    constructor() {
        this.socket = null;
        this.authParams = null;
        this.callbacks = {
            onQrCode: null,
            onPasswordRequest: null,
            onSuccess: null,
            onError: null,
            onUpdateToken: null,
        };
    }

    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    async startAuthentication(params) {
        try {
            const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
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
                this.callbacks.onUpdateToken();
                return false;
            }
        } catch (error) {
            if (this.callbacks.onError) {
                this.callbacks.onError(`Ошибка запуска аутентификации: ${error.message}`);
            }
            throw error;
        }
    }

    connectWebSocket(token) {
        const TGUSER_WSS = (window.runtimeConfig && window.runtimeConfig.REACT_APP_TGUSER_WSS) || process.env.REACT_APP_TGUSER_WSS;

        const wsUrl = `${TGUSER_WSS}/telegram/ws?token=${token}`;

        this.socket = new WebSocket(wsUrl);

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
                            this.callbacks.onError('Параметры авторизации не найдены');
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
                        console.warn('Неизвестный тип сообщения WebSocket:', data.type);
                        if (this.callbacks.onError) {
                            this.callbacks.onError(data.payload || 'Неизвестная ошибка');
                        }
                }
            } catch (error) {
                console.error('Ошибка обработки сообщения WebSocket:', error);
                if (this.callbacks.onError) {
                    this.callbacks.onError('Ошибка обработки сообщения от сервера');
                }
            }
        };

        this.socket.onerror = (error) => {
            console.error('Ошибка WebSocket:', error);
            if (this.callbacks.onError) {
                this.callbacks.onError('Ошибка соединения WebSocket');
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
                this.callbacks.onError('WebSocket соединение не активно');
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