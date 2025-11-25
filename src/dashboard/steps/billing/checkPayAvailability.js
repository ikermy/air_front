export const checkPayAvailability = async () => {
    try {
        const PAY_URL = window.runtimeConfig?.REACT_APP_PAY || process.env.REACT_APP_PAY;
        const response = await fetch(`${PAY_URL}/available`, {
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
