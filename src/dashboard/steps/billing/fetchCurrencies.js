import { checkPayAvailability } from "./checkPayAvailability";
import { validateAndRefreshToken } from "../../../utils/easyUtils";

export const fetchCurrencies = async (setLoadingCurrencies, setCurrencies) => {
    try {
        if (typeof setLoadingCurrencies !== 'function' || typeof setCurrencies !== 'function') {
            throw new TypeError('setLoadingCurrencies and setCurrencies must be functions');
        }

        setLoadingCurrencies(true);

        // Сначала проверяем доступность сервиса
        await checkPayAvailability();

        const PAY_URL = window.runtimeConfig?.REACT_APP_PAY || process.env.REACT_APP_PAY;
        const token = await validateAndRefreshToken(localStorage.getItem("authToken"));

        if (!token) {
            throw new Error("Ошибка авторизации. Пожалуйста, войдите в систему заново.");
        }

        const response = await fetch(`${PAY_URL}/currencies`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: token
            })
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
