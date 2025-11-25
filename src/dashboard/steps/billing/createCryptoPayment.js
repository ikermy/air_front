// Вынесем функцию createCryptoPayment в отдельный файл

// Функция для создания платежа через криптовалютный API
export const createCryptoPayment = async (currency, network, getCurrentPrice, checkPaymentServiceAvailability, validateAndRefreshToken) => {
    try {
        // Сначала проверяем доступность сервиса
        const isServiceAvailable = await checkPaymentServiceAvailability();
        if (!isServiceAvailable) {
            throw new Error('Сервис оплаты недоступен');
        }

        const PAY_URL = window.runtimeConfig?.REACT_APP_PAY || process.env.REACT_APP_PAY;
        const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
        const amount = getCurrentPrice();

        const response = await fetch(`${PAY_URL}/create-payment`, {
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
