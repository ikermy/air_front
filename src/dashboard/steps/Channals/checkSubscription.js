// Функция проверки доступности канала
import {validateAndRefreshToken} from "../../../utils/easyUtils";

const PAY_URL = (window.runtimeConfig && window.runtimeConfig.REACT_APP_PAY) || process.env.REACT_APP_PAY;
const showSimpleAuth = process.env.REACT_APP_SHOW_SIMPLE_AUTH === "true";

export const checkSubscription = async () => {
    if (showSimpleAuth) {
        // Фактическая проверка при взаимодействии осуществляется на сервере, ткчто это безопасно
        return true;
    }
    const token = await validateAndRefreshToken(localStorage.getItem("authToken"))
    if (token != null) {
        try {
            const response = await fetch(`${PAY_URL}/subscription`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    a: token,
                }),
            });

            if (!response.ok) {
                // If response is not ok, parse the error message
                const errorData = await response.json();
                console.error("SUBSCR_ERROR", errorData.error);
                return false;
            }

            return true;
        } catch (error) {
            console.error("SUBSCR_EXCEPTION", error);
            return false;
        }
    } else {
        return false
    }
};

