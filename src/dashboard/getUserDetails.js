export const getUserDetails = async (token) => {
    const LAND_URL = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND) || process.env.REACT_APP_LAND;


    if (token == null || token === "") {
        return "error";
    }

    const response = await fetch(`${LAND_URL}/details?token=${encodeURIComponent(token)}`, {
        method: "GET",
        headers: {"Content-Type": "application/json"},
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