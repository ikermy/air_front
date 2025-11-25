// serviceBotEvents.js
import {validateAndRefreshToken} from "../../../utils/easyUtils";
import {serviceBotEventsWSS} from "./serviceUtils";

export class ServiceBotEvents {
    constructor() {
        this.socket = null;
        this.userId = null;
        this.lastEventId = 0;
        this.intentionalClose = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000;
        this.reconnectTimeout = null;
        this.callbacks = {
            onEvents: null,           // Новые события получены
            onNoNewEvents: null,      // Нет новых событий
            onError: null,            // Ошибка
            onConnected: null,        // Соединение установлено
            onDisconnected: null,     // Соединение закрыто
            onUpdateToken: null,      // Требуется обновление токена
        };

        // Отслеживаем закрытие/перезагрузку страницы
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', () => {
                this.disconnect();
            });
        }
    }

    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    async connect(userId, lastEventId = 0) {
        try {
            const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
            if (!token) {
                if (this.callbacks.onUpdateToken) {
                    this.callbacks.onUpdateToken();
                }
                return false;
            }

            this.userId = userId;
            this.lastEventId = lastEventId;
            this.intentionalClose = false;

            this.connectWebSocket(token);
            return true;
        } catch (error) {
            console.error('Ошибка подключения к серверу событий:', error);
            if (this.callbacks.onError) {
                this.callbacks.onError(`Ошибка подключения: ${error.message}`);
            }
            return false;
        }
    }

    connectWebSocket(token) {
        try {
            this.socket = serviceBotEventsWSS(token);

            this.socket.onopen = () => {
                console.log('WebSocket соединение к серверу событий установлено');
                this.reconnectAttempts = 0;
                if (this.callbacks.onConnected) {
                    this.callbacks.onConnected();
                }
            };

            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error('Ошибка обработки сообщения WebSocket:', error);
                    if (this.callbacks.onError) {
                        this.callbacks.onError('Ошибка обработки сообщения от сервера');
                    }
                }
            };

            this.socket.onerror = (error) => {
                console.error('Ошибка WebSocket:', error);
                if (this.callbacks.onError && !this.intentionalClose) {
                    this.callbacks.onError('Ошибка соединения WebSocket');
                }
            };

            this.socket.onclose = (event) => {
                console.log('WebSocket соединение закрыто', event.code, event.reason);

                if (this.callbacks.onDisconnected) {
                    this.callbacks.onDisconnected();
                }

                // Коды нормального закрытия: 1000 (normal), 1001 (going away), 1006 (abnormal - часто при закрытии вкладки)
                const normalCloseCodes = [1000, 1001, 1006];

                // Автоматическое переподключение только при ненормальном закрытии
                if (!this.intentionalClose && !normalCloseCodes.includes(event.code)) {
                    this.attemptReconnect();
                }
            };

        } catch (error) {
            console.error('Ошибка создания WebSocket соединения:', error);
            if (this.callbacks.onError) {
                this.callbacks.onError('Не удалось установить соединение с сервером');
            }
        }
    }

    handleMessage(data) {
        switch (data.type) {
            case 'request_user_id':
                // Сервер запрашивает userId - отправляем инициализацию
                this.sendInitData();
                break;

            case 'events':
                // Получены новые события
                if (data.events && Array.isArray(data.events) && data.events.length > 0) {
                    // Обновляем lastEventId на основе последнего события
                    const lastEvent = data.events[data.events.length - 1];
                    if (lastEvent.event_id) {
                        this.lastEventId = lastEvent.event_id;
                    }

                    if (this.callbacks.onEvents) {
                        this.callbacks.onEvents(data.events, data.count || data.events.length);
                    }
                }
                break;

            case 'no_new_events':
                // Нет новых событий
                if (this.callbacks.onNoNewEvents) {
                    this.callbacks.onNoNewEvents();
                }
                break;

            case 'error':
                // Ошибка от сервера
                if (this.callbacks.onError) {
                    this.callbacks.onError(data.error || 'Неизвестная ошибка сервера');
                }
                break;

            case 'connection_closing':
                // Сервер закрывает соединение
                console.log('Сервер закрывает соединение');
                this.intentionalClose = true;
                break;

            default:
                console.warn('Неизвестный тип сообщения WebSocket:', data.type);
        }
    }

    sendInitData() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            const initData = {
                type: 'init',
                user_id: this.userId,
                last_event_id: this.lastEventId
            };
            this.socket.send(JSON.stringify(initData));
        }
    }

    requestEvents(lastEventId = null) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            const request = {
                type: 'get_events',
                last_event_id: lastEventId !== null ? lastEventId : this.lastEventId
            };
            this.socket.send(JSON.stringify(request));
        } else {
            console.warn('WebSocket не подключен, невозможно запросить события');
        }
    }

    updateLastEventId(eventId) {
        if (eventId > this.lastEventId) {
            this.lastEventId = eventId;
        }
    }

    async attemptReconnect() {
        if (this.intentionalClose) {
            return;
        }

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Превышено максимальное количество попыток переподключения');
            if (this.callbacks.onError) {
                this.callbacks.onError('Не удалось восстановить соединение с сервером');
            }
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * this.reconnectAttempts;

        console.log(`Попытка переподключения ${this.reconnectAttempts}/${this.maxReconnectAttempts} через ${delay}мс`);

        this.reconnectTimeout = setTimeout(async () => {
            try {
                const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
                if (token && this.userId) {
                    this.connectWebSocket(token);
                }
            } catch (error) {
                console.error('Ошибка при переподключении:', error);
                this.attemptReconnect();
            }
        }, delay);
    }

    disconnect() {
        this.intentionalClose = true;

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }

        this.reconnectAttempts = 0;
    }

    isConnected() {
        return this.socket && this.socket.readyState === WebSocket.OPEN;
    }

    getLastEventId() {
        return this.lastEventId;
    }
}

