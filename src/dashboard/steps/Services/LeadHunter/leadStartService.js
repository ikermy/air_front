// leadStartService.js
import {authFetch} from "../../../../utils/easyUtils";
import {startServiceWSS} from "./leadUtils";

export class LeadStartService {
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

            // События запуска и подключения
            onServiceStart: null,           // "start" — начало запуска сервиса
            onProxyCheckStart: null,        // "proxy_check_start" — начало поиска рабочего прокси
            onProxyCheck: null,             // "proxy_check" — проверка конкретного прокси
            onProxyFound: null,             // "proxy_found" — найден рабочий прокси
            onProxyFailed: null,            // "proxy_failed" — прокси не работает
            onNoProxies: null,              // "no_proxies" — список прокси пуст
            onNoValidProxies: null,         // "no_valid_proxies" — нет доступных прокси
            onAuthRequired: null,           // "auth_required" — требуется авторизация бота
            onUserStarted: null,            // "user_started" — пользователь успешно запущен

            // События работы ботов
            onBotStart: null,               // "bot_start" — начало запуска бота
            onBotRunning: null,             // "bot_running" — бот успешно запущен
            onBotStopped: null,             // "bot_stopped" — бот остановлен

            // События авторизации (WhatsApp)
            onQrCodeReady: null,            // "qr_code_ready" — QR-код готов к показу
            onAuthSuccess: null,            // "auth_success" — авторизация успешна
            onAuthFailed: null,             // "auth_failed" — ошибка авторизации
            onConnected: null,              // "connected" — клиент подключен

            // Обработка step событий
            onServiceInit: null,            // События инициализации сервиса (loading_contacts, provider_ready и т.д.)
            onBotInitialization: null,      // События инициализации ботов (creating_assistant, registering_handlers и т.д.)
            onProxyTesting: null,           // Тестирование прокси Telegram (proxy_check_start, proxy_found и т.д.)
            onProxyFullTest: null,          // Полное тестирование прокси WhatsApp (proxy_test_start, proxy_test_success и т.д.)
            onContactsPreparation: null,    // Подготовка контактов (preparing_contacts, preparation_complete и т.д.)
            onContactsProcessing: null,     // Обработка контактов (starting_haunting и т.д.)
            onWhatsAppAuth: null,           // Авторизация WhatsApp (qr_code_ready, auth_success и т.д.)
        };
    }

    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    async startService() {
        try {
            // Сбрасываем флаги при новой попытке запуска
            this.successHandled = false;
            this.errorHandled = false;

            this.connectWebSocket();
            return true;
        } catch (error) {
            if (this.callbacks.onError) {
                this.callbacks.onError(`Ошибка запуска сервиса: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Расширяет сообщение информацией о платформе (Provider), если она указана
     * @param {Object} data - Данные сообщения от сервера
     * @returns {string} - Расширенное сообщение с информацией о платформе
     */
    enhanceMessageWithProvider(data) {
        let message = data.message || '';

        // Если указан Provider, добавляем информацию о платформе
        if (data.provider && data.provider.trim()) {
            const providerMap = {
                'telegram': 'Telegram',
                'whatsapp': 'WhatsApp'
            };
            const platformName = providerMap[data.provider.toLowerCase()] || data.provider;

            // Если уже есть сообщение, добавляем информацию о платформе
            if (message) {
                message = `${message} (${platformName})`;
            } else {
                message = `${platformName}`;
            }
        }

        return message;
    }

    /**
     * Обрабатывает значения step и вызывает соответствующие коллбэки
     * @param {string} step - Значение step из сообщения
     * @param {string} message - Расширенное сообщение
     * @param {Object} data - Полные данные сообщения
     */
    handleStep(step, message, data) {
        if (!step) return;

        // Инициализация и запуск сервиса
        if (this.callbacks.onServiceInit) {
            const initSteps = [
                'loading_contacts',
                'loading_access_time',
                'creating_contacts_map',
                'contacts_loaded',
                'loading_provider_data',
                'creating_provider_bots',
                'provider_ready'
            ];
            if (initSteps.includes(step)) {
                this.callbacks.onServiceInit(step, message);
            }
        }

        // События ботов - инициализация
        if (this.callbacks.onBotInitialization) {
            const botInitSteps = [
                'creating_assistant',
                'registering_handlers',
                'initializing_client'
            ];
            if (botInitSteps.includes(step)) {
                this.callbacks.onBotInitialization(step, message, data.bot_id, data.provider);
            }
        }

        // Тестирование прокси - Telegram
        if (this.callbacks.onProxyTesting) {
            const proxyTestSteps = [
                'proxy_check_start',
                'proxy_check',
                'proxy_found',
                'proxy_failed',
                'no_proxies',
                'no_valid_proxies'
            ];
            if (proxyTestSteps.includes(step)) {
                this.callbacks.onProxyTesting(step, message, data.proxy_id);
            }
        }

        // Тестирование прокси - WhatsApp
        if (this.callbacks.onProxyFullTest) {
            const proxyFullTestSteps = [
                'proxy_test_start',
                'proxy_test',
                'proxy_type_test',
                'proxy_type_detected',
                'proxy_type_detection_failed',
                'proxy_test_failed',
                'proxy_test_success',
                'proxy_saved',
                'proxy_save_failed',
                'proxy_test_complete'
            ];
            if (proxyFullTestSteps.includes(step)) {
                this.callbacks.onProxyFullTest(step, message, data.proxy_id);
            }
        }

        // Подготовка контактов
        if (this.callbacks.onContactsPreparation) {
            const contactsPrepSteps = [
                'preparing_contacts',
                'checking_availability',
                'preparation_complete'
            ];
            if (contactsPrepSteps.includes(step)) {
                this.callbacks.onContactsPreparation(step, message);
            }
        }

        // Обработка контактов
        if (this.callbacks.onContactsProcessing) {
            const contactsProcSteps = [
                'starting_haunting'
            ];
            if (contactsProcSteps.includes(step)) {
                this.callbacks.onContactsProcessing(step, message);
            }
        }

        // Авторизация (WhatsApp)
        if (this.callbacks.onWhatsAppAuth) {
            const whatsappAuthSteps = [
                'qr_code_ready',
                'auth_success',
                'auth_failed',
                'connected'
            ];
            if (whatsappAuthSteps.includes(step)) {
                this.callbacks.onWhatsAppAuth(step, message, data.bot_id, data.provider);
            }
        }
    }

    connectWebSocket() {
        try {
            this.socket = startServiceWSS();
            this.intentionalClose = false; // Сбрасываем флаг при новом подключении

            this.socket.onopen = () => {
                // НЕ отправляем данные - сервер сам начнёт отправлять события после подключения
            };

            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    // Формируем расширенное сообщение с информацией о Provider, если он указан
                    const enhancedMessage = this.enhanceMessageWithProvider(data);

                    // Обрабатываем поле step (статус процесса) для всех типов
                    if (data.step && this.callbacks.onStatus) {
                        this.callbacks.onStatus(data.step, enhancedMessage);
                    }

                    // Обрабатываем step через специализированные коллбэки
                    if (data.step) {
                        this.handleStep(data.step, enhancedMessage, data);
                    }

                    switch (data.type) {
                        case 'status':
                            // Обработка статусных сообщений (checking_subscription, starting_deblocker и т.д.)
                            // Уже обработано через onStatus выше
                            break;

                        case 'progress':
                            // Обработка прогресса (например, создание ботов)
                            if (this.callbacks.onProgress) {
                                this.callbacks.onProgress(data.step, enhancedMessage);
                            }
                            break;

                        // События запуска и подключения
                        case 'start':
                            if (this.callbacks.onServiceStart) {
                                this.callbacks.onServiceStart(enhancedMessage);
                            }
                            break;

                        case 'proxy_check_start':
                            if (this.callbacks.onProxyCheckStart) {
                                this.callbacks.onProxyCheckStart(enhancedMessage);
                            }
                            break;

                        case 'proxy_check':
                            if (this.callbacks.onProxyCheck) {
                                this.callbacks.onProxyCheck(data.proxy_id, enhancedMessage);
                            }
                            break;

                        case 'proxy_found':
                            if (this.callbacks.onProxyFound) {
                                this.callbacks.onProxyFound(data.proxy_id, enhancedMessage);
                            }
                            break;

                        case 'proxy_failed':
                            if (this.callbacks.onProxyFailed) {
                                this.callbacks.onProxyFailed(data.proxy_id, enhancedMessage);
                            }
                            break;

                        case 'no_proxies':
                            if (this.callbacks.onNoProxies) {
                                this.callbacks.onNoProxies(enhancedMessage);
                            }
                            break;

                        case 'no_valid_proxies':
                            if (this.callbacks.onNoValidProxies) {
                                this.callbacks.onNoValidProxies(enhancedMessage);
                            }
                            break;

                        case 'auth_required':
                            if (this.callbacks.onAuthRequired) {
                                this.callbacks.onAuthRequired(data.bot_id, enhancedMessage, data.provider);
                            }
                            break;

                        case 'user_started':
                            if (this.callbacks.onUserStarted) {
                                this.callbacks.onUserStarted(data.bot_id, enhancedMessage, data.provider);
                            }
                            break;

                        // События работы ботов
                        case 'bot_start':
                            if (this.callbacks.onBotStart) {
                                this.callbacks.onBotStart(data.bot_id, enhancedMessage, data.provider);
                            }
                            break;

                        case 'bot_running':
                            if (this.callbacks.onBotRunning) {
                                this.callbacks.onBotRunning(data.bot_id, enhancedMessage, data.provider);
                            }
                            break;

                        case 'bot_stopped':
                            if (this.callbacks.onBotStopped) {
                                this.callbacks.onBotStopped(data.bot_id, enhancedMessage, data.provider);
                            }
                            break;

                        // События авторизации (WhatsApp)
                        case 'qr_code_ready':
                            if (this.callbacks.onQrCodeReady) {
                                this.callbacks.onQrCodeReady(data.bot_id, data.qr_code, enhancedMessage, data.provider);
                            }
                            break;

                        case 'auth_success':
                            if (this.callbacks.onAuthSuccess) {
                                this.callbacks.onAuthSuccess(data.bot_id, enhancedMessage, data.provider);
                            }
                            break;

                        case 'auth_failed':
                            if (this.callbacks.onAuthFailed) {
                                this.callbacks.onAuthFailed(data.bot_id, enhancedMessage, data.provider);
                            }
                            break;

                        case 'connected':
                            if (this.callbacks.onConnected) {
                                this.callbacks.onConnected(data.bot_id, enhancedMessage, data.provider);
                            }
                            break;

                        case 'bot_starting':
                            // Уведомление о начале инициализации конкретного бота
                            if (this.callbacks.onBotStarting) {
                                this.callbacks.onBotStarting(data.bot_id, enhancedMessage, data.provider);
                            }
                            break;

                        case 'bot_created':
                            // Уведомление о создании конкретного бота
                            if (this.callbacks.onBotCreated) {
                                this.callbacks.onBotCreated(data.bot_id, enhancedMessage, data.provider);
                            }
                            break;

                        case 'bot_started':
                            // Уведомление о запуске конкретного бота
                            if (this.callbacks.onBotStarted) {
                                this.callbacks.onBotStarted(data.bot_id, enhancedMessage, data.provider);
                            }
                            break;

                        case 'bot_error':
                            // Ошибка конкретного бота (не критичная для всего сервиса)
                            const botErrorMsg = data.error || enhancedMessage || 'Неизвестная ошибка бота';
                            console.warn(`Ошибка бота #${data.bot_id}:`, botErrorMsg);
                            if (this.callbacks.onBotError) {
                                this.callbacks.onBotError(data.bot_id, botErrorMsg, data.provider);
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
                                const fatalBotErrorMsg = data.error || enhancedMessage || 'Неизвестная ошибка бота';
                                console.warn(`Ошибка бота #${data.bot_id}:`, fatalBotErrorMsg);
                                if (this.callbacks.onBotError) {
                                    this.callbacks.onBotError(data.bot_id, fatalBotErrorMsg, data.provider);
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
                                    this.callbacks.onError(data.error || enhancedMessage || 'Неизвестная ошибка');
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

    async startBot(botId) {
        try {
            const response = await authFetch(`/v1/service/leadhunter/bot/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    bot_id: botId,
                }),
            });


            if (!response.ok) {
                throw new Error(`Ошибка запуска бота: ${response.statusText}`);
            }

            return response.json();
        } catch (error) {
            if (this.callbacks.onError) {
                this.callbacks.onError(`Ошибка запуска бота: ${error.message}`);
            }
            throw error;
        }
    }
}
