import { authFetch, getAuthToken } from '../../../utils/easyUtils';

export const getUserTariff = async () => {
    try {
        const response = await authFetch(`/v1/pay/tariff`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            return { status: "error" };
        }

        const data = await response.json();

        return {
            status: "ok",
            ...data,
        };
    } catch (error) {
        console.error('Ошибка получения тарифа пользователя:', error);
        return { status: "error" };
    }
};

export const fetchCurrencies = async (setLoadingCurrencies, setCurrencies) => {
    if (typeof setLoadingCurrencies !== 'function' || typeof setCurrencies !== 'function') {
        throw new TypeError('setLoadingCurrencies and setCurrencies must be functions');
    }

    setLoadingCurrencies(true);

    let errorToThrow = null;
    try {
        // Сначала проверяем доступность сервиса
        await checkPayAvailability();

        const response = await authFetch(`/v1/pay/currencies`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                errorToThrow = new Error("Ошибка авторизации. Пожалуйста, войдите в систему заново.");
            } else {
                let errorMessage = 'Не удалось загрузить список доступных валют';
                try {
                    const errorData = await response.json();
                    if (errorData.error) {
                        errorMessage = errorData.error;
                    }
                } catch (e) {
                    // Игнорируем ошибку парсинга JSON
                }
                errorToThrow = new Error(errorMessage);
            }
        } else {
            const data = await response.json();

            if (!data.currencies || !Array.isArray(data.currencies)) {
                errorToThrow = new Error("Получены некорректные данные о валютах. Попробуйте позже.");
            } else {
                // Фильтруем только доступные валюты
                const availableCurrencies = data.currencies.filter(currency => currency.isAvailable);

                if (availableCurrencies.length === 0) {
                    errorToThrow = new Error("В данный момент нет доступных валют для оплаты. Попробуйте позже.");
                } else {
                    setCurrencies(availableCurrencies);
                }
            }
        }
    } catch (error) {
        errorToThrow = error;
    }

    if (errorToThrow) {
        console.error('Ошибка получения валют:', errorToThrow);
        if (typeof setLoadingCurrencies === 'function') {
            setLoadingCurrencies(false);
        }
        throw errorToThrow;
    }

    if (typeof setLoadingCurrencies === 'function') {
        setLoadingCurrencies(false);
    }
};

export const checkPayAvailability = async () => {
    let errorToThrow = null;
    try {
        const response = await authFetch(`/v1/channel/available/pay`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
        });

        if (!response.ok) {
            errorToThrow = new Error(`В данный момент система оплаты недоступна. Попробуйте позже или обратитесь в поддержку. (HTTP ${response.status})`);
        } else {
            return true;
        }
    } catch (error) {
        // Если это наша ошибка с информативным сообщением, сохраняем её
        if (error.message.includes('система оплаты недоступна') || error.message.includes('Настройки системы')) {
            errorToThrow = error;
        } else {
            // Для всех остальных ошибок (сеть, таймаут и т.д.)
            errorToThrow = new Error("В данный момент система оплаты недоступна. Проверьте подключение к интернету или попробуйте позже.");
        }
    }

    if (errorToThrow) {
        throw errorToThrow;
    }
};

export const createCryptoPayment = async (currency, network, getCurrentPrice, checkPaymentServiceAvailability) => {
    let errorToThrow = null;
    try {
        // Сначала проверяем доступность сервиса
        const isServiceAvailable = await checkPaymentServiceAvailability();
        if (!isServiceAvailable) {
            errorToThrow = new Error('Сервис оплаты недоступен');
        } else {
            const amount = getCurrentPrice();
            const response = await authFetch(`/v1/pay/create-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token: getAuthToken(),
                    currency: currency,
                    amount: amount
                })
            });

            if (!response.ok) {
                return { status: "error" };
            }

            const data = await response.json();
            return {
                status: "ok",
                ...data,
            };
        }
    } catch (error) {
        console.error('Ошибка при создании платежа:', error);
        errorToThrow = error;
    }

    if (errorToThrow) {
        throw errorToThrow;
    }
};
