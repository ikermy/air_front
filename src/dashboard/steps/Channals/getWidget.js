const WIDGET_URL = window.runtimeConfig?.REACT_APP_WIDGET || process.env.REACT_APP_WIDGET;

export const getWidgetCode = async (token) => {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await fetch(`${WIDGET_URL}/widgetcode?token=${token}`, {
                method: "GET",
                headers: {"Content-Type": "application/json"},
            });
            const data = await response.json();
            if (response.ok) {
                resolve(data.widgetCode);
            } else {
                reject(data.message || "Failed to fetch widget code");
            }
        } catch (error) {
            reject(error);
        }
    });
};