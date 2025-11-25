// serviceStartService.js
import {validateAndRefreshToken} from "../../../utils/easyUtils";
import {startServiceWSS} from "./serviceUtils";

export class ServiceStartService {
    constructor() {
        this.socket = null;
        this.intentionalClose = false; // Флаг для отслеживания намеренного закрытия
        this.successHandled = false; // Флаг для предотвращения двойного вызова onCompleted
        this.errorHandled = false; // Флаг для предотвращения двойного вызова onError
        this.callbacks = {
            onStatus: null,        // Обработка статусов (step)
            onProgress: null,      // Обработка прогресса создания ботов
            onBotStarting: null,   // Уведомление о начале инициализации бота
            onBotCreated: null,    // Уведомление о создании бота
            onBotStarted: null,    // Уведомление о запуске бота
            onBotError: null,      // Ошибка конкретного бота (не фатальная)
            onCompleted: null,     // Успешное завершение
            onError: null,         // Обработка фатальных ошибок
            onTimeout: null,       // Таймаут операции
            onUpdateToken: null,   // Обновление токена
        };
    }

    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    async startService() {
        try {
            const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
            if (token) {
                // Сбрасываем флаги при новой попытке запуска
                this.successHandled = false;
                this.errorHandled = false;

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
                this.callbacks.onError(`Ошибка запуска сервиса: ${error.message}`);
            }
            throw error;
        }
    }

    connectWebSocket(token) {
        try {
            this.socket = startServiceWSS(token);
            this.intentionalClose = false; // Сбрасываем флаг при новом подключении

            this.socket.onopen = () => {
                console.log('WebSocket соединение для запуска сервиса установлено');
                // НЕ отправляем данные - сервер сам начнёт отправлять события после подключения
            };

            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('WebSocket получено сообщение:', data);

                    // Обрабатываем поле step (статус процесса) для всех типов
                    if (data.step && this.callbacks.onStatus) {
                        this.callbacks.onStatus(data.step, data.message);
                    }

                    switch (data.type) {
                        case 'status':
                            // Обработка статусных сообщений (checking_subscription, starting_deblocker и т.д.)
                            // Уже обработано через onStatus выше
                            break;

                        case 'progress':
                            // Обработка прогресса (например, создание ботов)
                            if (this.callbacks.onProgress) {
                                this.callbacks.onProgress(data.step, data.message);
                            }
                            break;

                        case 'bot_starting':
                            // Уведомление о начале инициализации конкретного бота
                            if (this.callbacks.onBotStarting) {
                                this.callbacks.onBotStarting(data.bot_id, data.message);
                            }
                            break;

                        case 'bot_created':
                            // Уведомление о создании конкретного бота
                            if (this.callbacks.onBotCreated) {
                                this.callbacks.onBotCreated(data.bot_id, data.message);
                            }
                            break;

                        case 'bot_started':
                            // Уведомление о запуске конкретного бота
                            if (this.callbacks.onBotStarted) {
                                this.callbacks.onBotStarted(data.bot_id, data.message);
                            }
                            break;

                        case 'bot_error':
                            // Ошибка конкретного бота (не критичная для всего сервиса)
                            console.warn(`Ошибка бота #${data.bot_id}:`, data.error || data.message);
                            if (this.callbacks.onBotError) {
                                this.callbacks.onBotError(data.bot_id, data.error || data.message || 'Неизвестная ошибка бота');
                            }
                            // НЕ закрываем соединение - другие боты могут продолжать работу
                            break;

                        case 'completed':
                            // Успешное завершение запуска сервиса
                            if (this.successHandled) {
                                return;
                            }
                            this.successHandled = true;
                            this.intentionalClose = true;

                            if (this.callbacks.onCompleted) {
                                this.callbacks.onCompleted(data.step, data.data);
                            }

                            // Даём серверу время завершить обработку
                            setTimeout(() => {
                                this.closeConnection();
                            }, 500);
                            break;

                        case 'error':
                            // Фатальная ошибка (критичная для всего сервиса)
                            // Для обратной совместимости: если есть bot_id, обрабатываем как bot_error
                            if (data.bot_id) {
                                console.warn(`Ошибка бота #${data.bot_id}:`, data.error || data.message);
                                if (this.callbacks.onBotError) {
                                    this.callbacks.onBotError(data.bot_id, data.error || data.message || 'Неизвестная ошибка бота');
                                }
                                // НЕ закрываем соединение - другие боты могут продолжать работу
                            } else {
                                // Фатальная ошибка без bot_id - закрываем соединение
                                if (this.errorHandled) {
                                    return;
                                }
                                this.errorHandled = true;
                                this.intentionalClose = true;

                                if (this.callbacks.onError) {
                                    this.callbacks.onError(data.error || data.message || 'Неизвестная ошибка');
                                }
                                // Закрываем соединение при фатальной ошибке
                                setTimeout(() => {
                                    this.closeConnection();
                                }, 100);
                            }
                            break;

                        case 'timeout':
                            // Обработка таймаута
                            if (this.callbacks.onTimeout) {
                                this.callbacks.onTimeout();
                            }
                            this.intentionalClose = true;
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
                    if (this.callbacks.onError && !this.errorHandled) {
                        this.errorHandled = true;
                        this.callbacks.onError('Ошибка обработки сообщения от сервера');
                    }
                }
            };

            this.socket.onerror = (error) => {
                console.error('Ошибка WebSocket:', error);
                if (this.callbacks.onError && !this.intentionalClose && !this.successHandled && !this.errorHandled) {
                    this.errorHandled = true;
                    this.callbacks.onError('Ошибка соединения WebSocket. Проверьте доступность сервиса.');
                }
            };

            this.socket.onclose = (event) => {
                console.log('WebSocket соединение закрыто', event.code, event.reason);
                // Если закрытие произошло после успешного завершения, обработанной ошибки или по нашему намерению, игнорируем
                const wasCleanSuccess = this.successHandled || this.intentionalClose || this.errorHandled;
                if (!wasCleanSuccess && event.code !== 1000 && this.callbacks.onError) {
                    this.errorHandled = true;
                    this.callbacks.onError('Соединение с сервером прервано');
                }
            };
        } catch (error) {
            console.error('Ошибка создания WebSocket соединения:', error);
            if (this.callbacks.onError && !this.errorHandled) {
                this.errorHandled = true;
                this.callbacks.onError('Не удалось установить соединение с сервером');
            }
        }
    }

    closeConnection() {
        if (this.socket) {
            this.intentionalClose = true; // Устанавливаем флаг перед закрытием
            this.socket.close();
            this.socket = null;
        }
        this.successHandled = false; // Сбрасываем флаги при закрытии соединения
        this.errorHandled = false;
    }
}
