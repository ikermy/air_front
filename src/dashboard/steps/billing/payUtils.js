import { validateAndRefreshToken } from "../../../utils/easyUtils";


const LAND_URL = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND) || process.env.REACT_APP_LAND;

export const getUserTariff = async (token) => {
    if (token == null || token === "") {
        return "error";
    }

    const response = await fetch(`${LAND_URL}/pay/tariff?token=${encodeURIComponent(token)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        // credentials: 'include', // Куки будут отправлены
    });

    if (!response.ok) {
        if (response.status === 401) {
            console.error("Ошибка 401");
            return {status: "error"};
        }

        return {status: "error"};
    }

    const data = await response.json();

    return {
        status: "ok",
        ...data,
    };
};

export const fetchCurrencies = async (setLoadingCurrencies, setCurrencies) => {
    // небольшая задержка в 500 ms для обхода allow
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
        if (typeof setLoadingCurrencies !== 'function' || typeof setCurrencies !== 'function') {
            throw new TypeError('setLoadingCurrencies and setCurrencies must be functions');
        }

        setLoadingCurrencies(true);

        // Сначала проверяем доступность сервиса
        await checkPayAvailability();

        const token = await validateAndRefreshToken(localStorage.getItem("authToken"));

        if (!token) {
            throw new Error("Ошибка авторизации. Пожалуйста, войдите в систему заново.");
        }

        const response = await fetch(`${LAND_URL}/pay/currencies?token=${encodeURIComponent(token)}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            // credentials: 'include', // Куки будут отправлены
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new Error("Ошибка авторизации. Пожалуйста, войдите в систему заново.");
            }

            let errorMessage = 'Не удалось загрузить список доступных валют';
            try {
                const errorData = await response.json();
                if (errorData.error) {
                    errorMessage = errorData.error;
                }
            } catch (e) {
                // Игнорируем ошибку парсинга JSON
            }

            throw new Error(errorMessage);
        }

        const data = await response.json();

        if (!data.currencies || !Array.isArray(data.currencies)) {
            throw new Error("Получены некорректные данные о валютах. Попробуйте позже.");
        }

        // Фильтруем только доступные валюты
        const availableCurrencies = data.currencies.filter(currency => currency.isAvailable);

        if (availableCurrencies.length === 0) {
            throw new Error("В данный момент нет доступных валют для оплаты. Попробуйте позже.");
        }

        setCurrencies(availableCurrencies);

    } catch (error) {
        console.error('Ошибка получения валют:', error);

        // Пробрасываем ошибку для обработки в компоненте
        throw error;
    } finally {
        if (typeof setLoadingCurrencies === 'function') {
            setLoadingCurrencies(false);
        }
    }
};

export const checkPayAvailability = async () => {
    try {
        const response = await fetch(`${LAND_URL}/available/pay`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(5000)
        });

        if (!response.ok) {
            throw new Error(`В данный момент система оплаты недоступна. Попробуйте позже или обратитесь в поддержку. (HTTP ${response.status})`);
        }

        return true;

    } catch (error) {
        // Если это наша ошибка с информативным сообщением, пробрасываем её
        if (error.message.includes('система оплаты недоступна') || error.message.includes('Настройки системы')) {
            throw error;
        }

        // Для всех остальных ошибок (сеть, таймаут и т.д.)
        throw new Error("В данный момент система оплаты недоступна. Проверьте подключение к интернету или попробуйте позже.");
    }
};

export const createCryptoPayment = async (currency, network, getCurrentPrice, checkPaymentServiceAvailability, validateAndRefreshToken) => {
    try {
        // Сначала проверяем доступность сервиса
        const isServiceAvailable = await checkPaymentServiceAvailability();
        if (!isServiceAvailable) {
            throw new Error('Сервис оплаты недоступен');
        }

        const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
        const amount = getCurrentPrice();

        const response = await fetch(`${LAND_URL}/pay/create-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: token,
                currency: currency,
                network: network,
                amount: amount
            })
        });

        if (!response.ok) {
            throw new Error('Ошибка при создании платежа');
        }

        return await response.json();
    } catch (error) {
        console.error('Ошибка при создании криптовалютного платежа:', error);
        throw error;
    }
};