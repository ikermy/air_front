import { validateAndRefreshToken } from "../../../utils/easyUtils";

/**
 * Менеджер для управления SSE соединением с сервером платежей
 */
export class PaymentSSEManager {
    constructor() {
        this.eventSource = null;
        this.timerRef = null;
        this.callbacks = {
            onPaymentUpdate: null,
            onStatusUpdate: null,
            onTimerUpdate: null,
            onPaymentComplete: null,
            onError: null,
            onConnectionOpen: null,
            onConnectionClose: null,
            onNotification: null, // Добавляем callback для уведомлений
        };
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000;
        this.currentOrderId = null;
    }

    /**
     * Устанавливает колбэки для различных событий
     */
    setCallbacks({
        onPaymentUpdate,
        onStatusUpdate,
        onTimerUpdate,
        onPaymentComplete,
        onError,
        onConnectionOpen,
        onConnectionClose,
        onNotification
    }) {
        this.callbacks = {
            onPaymentUpdate: onPaymentUpdate || null,
            onStatusUpdate: onStatusUpdate || null,
            onTimerUpdate: onTimerUpdate || null,
            onPaymentComplete: onPaymentComplete || null,
            onError: onError || null,
            onConnectionOpen: onConnectionOpen || null,
            onConnectionClose: onConnectionClose || null,
            onNotification: onNotification || null,
        };
    }

    /**
     * Подключается к SSE потоку для отслеживания статуса платежа
     */
    async connect(orderId) {
        try {
            const PAY_URL = window.runtimeConfig?.REACT_APP_PAY || process.env.REACT_APP_PAY;

            // Валидируем и обновляем токен перед подключением
            const token = await validateAndRefreshToken(localStorage.getItem("authToken"));

            if (!token) {
                throw new Error('Не удалось получить действительный токен');
            }

            // Закрываем предыдущее соединение если оно есть
            this.disconnect();
            this.currentOrderId = orderId;
            this.eventSource = new EventSource(
                `${PAY_URL}/payment-status-stream?token=${encodeURIComponent(token)}&orderId=${encodeURIComponent(orderId)}`
            );

            this.setupEventListeners();

        } catch (error) {
            console.error('Ошибка подключения к SSE:', error);
            this.callbacks.onError?.(
                "Ошибка подключения к серверу",
                "Переключаемся на резервный способ отслеживания платежа"
            );
        }
    }

    /**
     * Настраивает все обработчики событий SSE
     */
    setupEventListeners() {
        if (!this.eventSource) return;

        // Обработчик успешного подключения
        this.eventSource.onopen = () => {
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.callbacks.onConnectionOpen?.();

            // Запускаем проверку здоровья соединения
            this.startConnectionHealthCheck();
        };

        // Обработчик для общих сообщений (первое сообщение и heartbeat)
        this.eventSource.onmessage = (event) => {
            try {
                const paymentData = JSON.parse(event.data);

                // Пропускаем heartbeat, но обновляем время последнего heartbeat
                if (paymentData && paymentData.type === 'heartbeat') {
                    this.lastHeartbeatTime = Date.now();

                    // Проверяем, что heartbeat свежий (не старше 60 секунд)
                    const now = Math.floor(Date.now() / 1000);
                    const heartbeatAge = now - paymentData.timestamp;
                    if (heartbeatAge > 60) {
                        console.warn('Heartbeat is too old, may need to reconnect:', heartbeatAge, 'seconds');
                        this.attemptReconnect();
                        return;
                    }
                    return;
                }

                // Валидация данных платежа
                if (!paymentData || !paymentData.orderId) {
                    console.warn('Invalid SSE data received:', event.data);
                    return;
                }

                // Проверяем соответствие orderId
                if (paymentData.orderId !== this.currentOrderId) {
                    console.warn('Received SSE data for different order:', paymentData.orderId);
                    return;
                }

                this.lastDataTime = Date.now(); // Обновляем время последнего получения данных

                // Передаем данные через колбэк
                this.callbacks.onPaymentUpdate?.(paymentData);

                // Определяем текущий статус
                const currentStatus = paymentData.currentStatus || paymentData.status;
                this.callbacks.onStatusUpdate?.(currentStatus);

                // Стартуем таймер по expiresAt, если он ещё не запущен и статус pending
                if (currentStatus === 'pending' && paymentData.expiresAt && !this.timerRef) {
                    const expUnix = this.parseExpiresToUnix(paymentData.expiresAt, paymentData);
                    if (Number.isFinite(expUnix)) {
                        this.startTimer(expUnix);
                    }
                }

            } catch (error) {
                console.error('Ошибка парсинга SSE данных:', error, event.data);
            }
        };

        // Обработчик ошибок соединения
        this.eventSource.onerror = (error) => {
            console.error('SSE connection error for order:', this.currentOrderId, error);
            this.isConnected = false;

            // Проверяем состояние соединения
            if (this.eventSource?.readyState === EventSource.CLOSED) {
                this.callbacks.onConnectionClose?.();
                this.attemptReconnect();
            } else if (this.eventSource?.readyState === EventSource.CONNECTING) {
                // Даем время на переподключение, если не подключится - попробуем переподключиться
                setTimeout(() => {
                    if (this.eventSource?.readyState !== EventSource.OPEN) {
                        this.attemptReconnect();
                    }
                }, 3000); // Уменьшаем время ожидания до 3 секунд
            }
        };

        // Обработка специальных событий
        this.setupSpecialEventListeners();
    }

    /**
     * Настраивает обработчики для специальных типов SSE событий
     */
    setupSpecialEventListeners() {
        if (!this.eventSource) return;

        // Обработка события частичной оплаты
        this.eventSource.addEventListener('partial_payment', (event) => {
            const result = this.handlePaymentUpdate(event, 'partial_payment');
            if (result) {
                const { paymentData } = result;
                this.callbacks.onNotification?.({
                    type: 'success',
                    title: "🟡 Частичное поступление",
                    message: `Получено ${paymentData.currentReceivedAmount || paymentData.receivedAmount || 0} из ${paymentData.amount} ${paymentData.currency}. Подтверждений: ${paymentData.currentConfirmations || 0}/12`,
                    duration: 8
                });
            }
        });

        // Обработка события подтверждения платежа
        this.eventSource.addEventListener('payment_confirmed', (event) => {
            const result = this.handlePaymentUpdate(event, 'payment_confirmed');
            if (result) {
                this.callbacks.onNotification?.({
                    type: 'success',
                    title: "Платёж подтверждён!",
                    message: "Ваша подписка успешно продлена"
                });
                this.callbacks.onPaymentComplete?.(true);
                this.disconnect();
            }
        });

        // Обработка события неудачного платежа
        this.eventSource.addEventListener('payment_failed', (event) => {
            const result = this.handlePaymentUpdate(event, 'payment_failed');
            if (result) {
                const { paymentData } = result;
                this.callbacks.onNotification?.({
                    type: 'error',
                    title: "Платёж неудачен",
                    message: paymentData.error || "Произошла ошибка при обработке транзакции"
                });
                this.callbacks.onPaymentComplete?.(false);
                this.disconnect();
            }
        });

        // Обработка события истечения времени платежа
        this.eventSource.addEventListener('payment_expired', (event) => {
            const result = this.handlePaymentUpdate(event, 'payment_expired');
            if (result) {
                this.callbacks.onNotification?.({
                    type: 'error',
                    title: "Время платежа истекло",
                    message: "Создайте новый платёж для продолжения"
                });
                this.callbacks.onPaymentComplete?.(false);
                this.disconnect();
            }
        });

        // Обработка события ожидания платежа
        this.eventSource.addEventListener('payment_pending', (event) => {
            const result = this.handlePaymentUpdate(event, 'payment_pending');
            if (result) {
                const { paymentData } = result;
                if (paymentData.currentReceivedAmount > 0) {
                    this.callbacks.onNotification?.({
                        type: 'success',
                        title: "🔵 Транзакция в обработке",
                        message: `Получено ${paymentData.currentReceivedAmount} ${paymentData.currency}, подтверждений: ${paymentData.currentConfirmations || 0}/12`
                    });
                }
            }
        });

        // Обработка универсального события обновления
        this.eventSource.addEventListener('payment_update', (event) => {
            const result = this.handlePaymentUpdate(event, 'payment_update');
            if (result) {
                const { paymentData, currentStatus } = result;

                // Обрабатываем различные статусы
                switch (currentStatus) {
                    case 'partial':
                        this.callbacks.onNotification?.({
                            type: 'success',
                            title: "🟡 Частичное поступление средств",
                            message: `Получено ${paymentData.currentReceivedAmount || paymentData.receivedAmount || 0} из ${paymentData.amount} ${paymentData.currency}. Подтверждений: ${paymentData.currentConfirmations || 0}/12`
                        });
                        break;

                    case 'pending':
                        if (paymentData.currentReceivedAmount > 0) {
                            this.callbacks.onNotification?.({
                                type: 'success',
                                title: "🔵 Транзакция в обработке",
                                message: `Получено ${paymentData.currentReceivedAmount} ${paymentData.currency}, подтверждений: ${paymentData.currentConfirmations || 0}/12`
                            });
                        }
                        break;

                    case 'confirmed':
                        this.callbacks.onNotification?.({
                            type: 'success',
                            title: "Платёж подтверждён!",
                            message: "Ваша подписка успешно продлена"
                        });
                        this.callbacks.onPaymentComplete?.(true);
                        this.disconnect();
                        break;

                    case 'failed':
                        this.callbacks.onNotification?.({
                            type: 'error',
                            title: "Платёж неудачен",
                            message: paymentData.error || "Произошла ошибка при обработке транзакции"
                        });
                        this.callbacks.onPaymentComplete?.(false);
                        this.disconnect();
                        break;

                    case 'expired':
                        this.callbacks.onNotification?.({
                            type: 'error',
                            title: "Время платежа истекло",
                            message: "Создайте новый платёж для продолжения"
                        });
                        this.callbacks.onPaymentComplete?.(false);
                        this.disconnect();
                        break;

                    default:
                        console.warn('Unknown payment status in payment_update:', currentStatus);
                        break;
                }
            }
        });
    }

    /**
     * Универсальная функция для обработки обновлений платежа
     */
    handlePaymentUpdate(event, eventType) {
        try {
            const paymentData = JSON.parse(event.data);

            if (!paymentData || paymentData.orderId !== this.currentOrderId) {
                console.warn(`Invalid ${eventType} data or wrong orderId:`, paymentData?.orderId);
                return null;
            }

            // Передаем обновленные данные через колбэк
            this.callbacks.onPaymentUpdate?.(paymentData);

            // Определяем текущий статус
            const currentStatus = paymentData.currentStatus || paymentData.status;
            this.callbacks.onStatusUpdate?.(currentStatus);

            // Перезапускаем таймер если есть expiresAt
            if (paymentData.expiresAt) {
                const expUnix = this.parseExpiresToUnix(paymentData.expiresAt, paymentData);
                if (Number.isFinite(expUnix)) {
                    if (this.timerRef) clearInterval(this.timerRef);
                    this.startTimer(expUnix);
                }
            }

            return { paymentData, currentStatus };
        } catch (error) {
            console.error(`Ошибка обработки события ${eventType}:`, error, event.data);
            return null;
        }
    }

    /**
     * Запускает таймер обратного отсчета
     */
    startTimer(expiresAt) {
        const now = Math.floor(Date.now() / 1000);
        const timeLeft = expiresAt - now;

        // Проверяем, не истекло ли время слишком давно (более 5 минут назад)
        if (timeLeft < -300) { // -300 секунд = -5 минут
            console.error('🚨 Payment expired too long ago (more than 5 minutes):', timeLeft, 'seconds');
            console.error('This might indicate a server timezone issue or clock synchronization problem');

            // Не запускаем таймер для платежей, которые истекли более 5 минут назад
            this.callbacks.onNotification?.({
                type: 'error',
                title: "Ошибка времени платежа",
                message: "Платёж создан с некорректным временем истечения. Пожалуйста, создайте новый платёж."
            });

            // Устанавливаем статус как истёкший
            this.callbacks.onStatusUpdate?.('expired');
            return;
        }

        // Если время истекло недавно (менее 5 минут), показываем предупреждение но продолжаем
        if (timeLeft <= 0 && timeLeft > -300) {
            console.warn('⚠️ Payment recently expired:', timeLeft, 'seconds ago');
        }

        if (this.timerRef) {
            clearInterval(this.timerRef);
        }

        const updateTimer = () => {
            const now = Math.floor(Date.now() / 1000);
            const timeLeft = expiresAt - now;

            if (timeLeft <= 0) {
                this.callbacks.onTimerUpdate?.(0);
                this.callbacks.onStatusUpdate?.('expired');
                clearInterval(this.timerRef);
                this.timerRef = null;
                this.callbacks.onNotification?.({
                    type: 'error',
                    title: "Время платежа истекло",
                    message: "Создайте новый платёж для продолжения"
                });
            } else {
                this.callbacks.onTimerUpdate?.(timeLeft);
            }
        };

        updateTimer(); // Обновляем сразу
        this.timerRef = setInterval(updateTimer, 1000);
    }

    /**
     * Утилита: парсинг expiresAt в Unix-время (секунды)
     * Приоритетно использует Unix timestamp поля для корректного отображения времени
     */
    parseExpiresToUnix(expiresAt, paymentData = null) {
        // Приоритет 1: Если передан paymentData, пытаемся найти Unix версию поля
        if (paymentData) {
            // Ищем Unix версию для expiresAt
            if (paymentData.expiresAtUnix && Number.isFinite(paymentData.expiresAtUnix)) {
                return paymentData.expiresAtUnix;
            } else {
            }
        }

        // Приоритет 2: Если expiresAt уже число (Unix timestamp)
        if (!expiresAt) {
            return NaN;
        }

        if (typeof expiresAt === 'number' && Number.isFinite(expiresAt)) {
            return expiresAt;
        }

        // Приоритет 3: Парсим строковое значение как число (Unix timestamp в строке)
        const s = String(expiresAt).trim();

        if (/^\d+$/.test(s)) {
            const unixTime = parseInt(s, 10);
            return unixTime;
        }

        // Приоритет 4: Последний вариант - парсим как дату MySQL (может давать неточное время)
        console.warn('⚠️ Fallback to MySQL datetime parsing for expiresAt:', expiresAt, '- may be inaccurate due to timezone issues');

        // Попробуем несколько вариантов парсинга
        let d;

        // Вариант 1: Добавляем часовой пояс Москвы к дате
        try {
            const isoWithTimezone = s.replace(' ', 'T') + '+03:00'; // Московское время
            d = new Date(isoWithTimezone);
        } catch (e) {
        }

        // Вариант 2: Если первый не сработал, пробуем как локальное время
        if (!d || isNaN(d.getTime())) {
            try {
                const iso = s.replace(' ', 'T'); // локальное время
                d = new Date(iso);
            } catch (e) {
            }
        }

        if (d && !isNaN(d.getTime())) {
            const ts = Math.floor(d.getTime() / 1000);

            // Проверяем, не слишком ли в прошлом или будущем это время
            const now = Math.floor(Date.now() / 1000);
            const diffHours = Math.abs(ts - now) / 3600;

            if (diffHours > 24) {
                console.warn('⚠️ Parsed time seems too far from current time, may be incorrect');
            }

            return Number.isFinite(ts) ? ts : NaN;
        }

        console.error('❌ All parsing attempts failed for:', expiresAt);
        return NaN;
    }

    /**
     * Пытается переподключиться к серверу
     */
    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Превышено максимальное количество попыток переподключения');
            return;
        }

        this.reconnectAttempts++;

        setTimeout(() => {
            if (this.currentOrderId) {
                this.connect(this.currentOrderId);
            }
        }, this.reconnectDelay * this.reconnectAttempts); // Увеличиваем задержку с каждой попыткой
    }


    /**
     * Запускает проверку здоровья соединения
     */
    startConnectionHealthCheck() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }

        this.lastHeartbeatTime = Date.now();
        this.lastDataTime = Date.now();

        this.healthCheckInterval = setInterval(() => {
            const now = Date.now();
            const timeSinceLastHeartbeat = now - (this.lastHeartbeatTime || 0);
            const timeSinceLastData = now - (this.lastDataTime || 0);

            // Если не получали heartbeat более 90 секунд - переподключаемся
            if (timeSinceLastHeartbeat > 90000) {
                console.warn('No heartbeat received for 90 seconds, reconnecting...');
                this.attemptReconnect();
                return;
            }

            // Если есть активность на сервере (логи показывают обновления),
            // но мы не получаем данные более 30 секунд - принудительно переподключаемся
            if (timeSinceLastData > 30000 && timeSinceLastHeartbeat < 60000) {
                console.warn('Heartbeat active but no data updates, connection may be stale, reconnecting...');
                this.attemptReconnect();
                return;
            }

            // Периодически проверяем статус через API если давно не было обновлений
            if (timeSinceLastData > 45000) {
                this.checkPaymentStatusViaAPI();
            }

        }, 15000); // Проверяем каждые 15 секунд
    }

    /**
     * Проверяет статус платежа через API (не polling, разовый запрос)
     */
    async checkPaymentStatusViaAPI() {
        if (!this.currentOrderId) return;

        try {
            const PAY_URL = window.runtimeConfig?.REACT_APP_PAY || process.env.REACT_APP_PAY;
            const token = await validateAndRefreshToken(localStorage.getItem("authToken"));

            if (!token) {
                console.warn('No token for API status check');
                return;
            }

            const response = await fetch(
                `${PAY_URL}/payment-status?orderId=${encodeURIComponent(this.currentOrderId)}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.ok) {
                const paymentData = await response.json();

                if (paymentData && paymentData.orderId === this.currentOrderId) {
                    // Если статус изменился - обновляем его
                    const currentStatus = paymentData.currentStatus || paymentData.status;
                    const lastKnownStatus = this.lastKnownStatus || 'pending';

                    if (currentStatus !== lastKnownStatus) {

                        // Обновляем данные
                        this.callbacks.onPaymentUpdate?.(paymentData);
                        this.callbacks.onStatusUpdate?.(currentStatus);
                        this.lastKnownStatus = currentStatus;
                        this.lastDataTime = Date.now();

                        // Показываем уведомление для изменений статуса
                        if (currentStatus === 'partial') {
                            this.callbacks.onNotification?.({
                                type: 'success',
                                title: "🟡 Частичное поступление (API проверка)",
                                message: `Получено ${paymentData.currentReceivedAmount || paymentData.receivedAmount || 0} из ${paymentData.amount} ${paymentData.currency}. Подтверждений: ${paymentData.currentConfirmations || 0}/12`,
                                duration: 8
                            });
                        }

                        // Принудительно переподключаемся для получения дальнейших обновлений
                        this.attemptReconnect();
                    }
                }
            }
        } catch (error) {
            console.warn('API status check failed:', error);
        }
    }

    /**
     * Отключается от SSE соединения
     */
    disconnect() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }

        if (this.timerRef) {
            clearInterval(this.timerRef);
            this.timerRef = null;
        }

        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }

        this.isConnected = false;
        this.currentOrderId = null;
    }


    /**
     * Очищает все ресурсы (вызывать при размонтировании компонента)
     */
    cleanup() {
        this.disconnect();
        this.callbacks = {};
        this.reconnectAttempts = 0;
    }
}

// Экспортируем готовый экземпляр
export const paymentSSEManager = new PaymentSSEManager();
