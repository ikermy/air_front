const PAY_URL = window.runtimeConfig?.REACT_APP_PAY || process.env.REACT_APP_PAY;

export const submitPayment = async (token, payment, value, discount) => {
    if (token == null || token === "") {
        return "error";
    }

    const response = await fetch(`${PAY_URL}/set-payment`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            a: token,
            p: payment,
            v: value.value,
            m: value.messages,
            d: discount,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Ошибка сервера: ${response.status}`);
    }

    return await response.json();
};