// leadWaAuth.js
import {validateAndRefreshToken} from "../../../../utils/easyUtils";
import {serviceWaAuthWSS} from "./leadUtils";

export class LeadWaAuth {
    constructor() {
        this.socket = null;
        this.authParams = null;
        this.intentionalClose = false; // Флаг для отслеживания намеренного закрытия
        this.successHandled = false; // Флаг для предотвращения двойного вызова onSuccess
        this.callbacks = {
            onQrCode: null,
            onSuccess: null,
            onError: null,
            onUpdateToken: null,
            onStatus: null, // Добавляем коллбэк для статусов
        };
    }

    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    async startAuthentication(params) {
        try {
            const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
            if (token) {
                // Сбрасываем флаг при новой попытке авторизации
                this.successHandled = false;

                // Сохраняем параметры авторизации для отправки через WebSocket
                // Для WhatsApp не требуется пароль
                this.authParams = {
                    type: 'auth_data',
                    alias: params.alias,
                    phone: params.phone,
                    bot_id: parseInt(params.botId)
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
                this.callbacks.onError(`Ошибка запуска аутентификации: ${error.message}`);
            }
            throw error;
        }
    }

    connectWebSocket(token) {
        try {
            // serviceWaAuthWSS возвращает WebSocket напрямую, не Promise
            this.socket = serviceWaAuthWSS(token);
            this.intentionalClose = false; // Сбрасываем флаг при новом подключении

            this.socket.onopen = () => {
                console.log('WebSocket соединение установлено (WhatsApp)');
            };

            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    // Обрабатываем поле step (статус процесса)
                    if (data.step && this.callbacks.onStatus) {
                        this.callbacks.onStatus(data.step);
                    }

                    switch (data.type) {
                        case 'request_auth_data':
                            // Сервер запрашивает данные авторизации - отправляем их
                            if (this.authParams) {
                                this.socket.send(JSON.stringify(this.authParams));
                            } else {
                                if (this.callbacks.onError) {
                                    this.callbacks.onError('Параметры авторизации не найдены');
                                }
                            }
                            break;
                        case 'status':
                            // Обрабатываем статусные сообщения от сервера
                            if (data.step && this.callbacks.onStatus) {
                                this.callbacks.onStatus(data.step);
                            }
                            break;
                        case 'qr_code':
                            if (this.callbacks.onQrCode) {
                                this.callbacks.onQrCode(data.payload);
                            }
                            break;
                        case 'success':
                            // Предотвращаем двойную обработку успеха, если событие пришло повторно
                            if (this.successHandled) {
                                return;
                            }
                            // Фикс: помечаем закрытие как намеренное сразу при успехе,
                            // чтобы onclose с кодом 1005/1006 не вызывал onError.
                            this.successHandled = true;
                            this.intentionalClose = true;
                            if (this.callbacks.onSuccess) {
                                this.callbacks.onSuccess();
                            }
                            // Даём серверу время завершить обработку
                            setTimeout(() => {
                                this.closeConnection();
                            }, 500);
                            break;
                        case 'error':
                            if (this.callbacks.onError) {
                                this.callbacks.onError(data.payload || 'Неизвестная ошибка');
                            }
                            // Закрываем соединение при ошибке
                            setTimeout(() => {
                                this.closeConnection();
                            }, 100);
                            break;
                        case 'timeout':
                            // Обработка таймаута авторизации
                            if (this.callbacks.onError) {
                                this.callbacks.onError('Превышено время ожидания авторизации. Попробуйте еще раз.');
                            }
                            // Закрываем соединение
                            setTimeout(() => {
                                this.closeConnection();
                            }, 100);
                            break;
                        default:
                            console.warn('Неизвестный тип сообщения WebSocket:', data.type);
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
                if (this.callbacks.onError && !this.intentionalClose && !this.successHandled) {
                    this.callbacks.onError('Ошибка соединения WebSocket. Проверьте доступность сервиса.');
                }
            };

            this.socket.onclose = (event) => {
                console.log('WebSocket соединение закрыто', event.code, event.reason);
                // Если закрытие произошло после успешной авторизации или по нашему намерению, игнорируем
                const wasCleanSuccess = this.successHandled || this.intentionalClose;
                if (!wasCleanSuccess && event.code !== 1000 && this.callbacks.onError) {
                    this.callbacks.onError('Соединение с сервером прервано');
                }
            };
        } catch (error) {
            console.error('Ошибка создания WebSocket соединения:', error);
            if (this.callbacks.onError) {
                this.callbacks.onError('Не удалось установить соединение с сервером');
            }
        }
    }

    async updateBotAlias(botId, alias) {
        try {
            const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
            if (!token) {
                throw new Error('Токен недействителен');
            }

            if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
                this.connectWebSocket(token);
                await new Promise((resolve, reject) => {
                    if (!this.socket) return reject(new Error('Не удалось открыть WebSocket'));
                    if (this.socket.readyState === WebSocket.OPEN) return resolve();
                    const onOpen = () => {
                        this.socket.removeEventListener('open', onOpen);
                        resolve();
                    };
                    const onError = (e) => {
                        this.socket && this.socket.removeEventListener('error', onError);
                        reject(new Error('Ошибка открытия WebSocket'));
                    };
                    this.socket.addEventListener('open', onOpen, { once: true });
                    this.socket.addEventListener('error', onError, { once: true });
                });
            }

            this.socket.send(JSON.stringify({
                type: 'update_botalias',
                botid: botId,
                botalias: alias,
                alias: alias,
                BotAlias: alias,
            }));

            return true;
        } catch (error) {
            if (this.callbacks.onError) {
                this.callbacks.onError(error.message || 'Ошибка при обновлении имени бота');
            }
            throw error;
        }
    }

    closeConnection() {
        if (this.socket) {
            this.intentionalClose = true; // Устанавливаем флаг перед закрытием
            this.socket.close();
            this.socket = null;
        }
        this.authParams = null;
        this.successHandled = false; // Сбрасываем флаг при закрытии соединения
    }
}

