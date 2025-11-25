const PAY_URL = window.runtimeConfig?.REACT_APP_PAY || process.env.REACT_APP_PAY;

export const getUserTariff = async (token) => {
    if (token == null || token === "") {
        return "error";
    }

    const response = await fetch(`${PAY_URL}/get-tariff`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            a: token,
        }),
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