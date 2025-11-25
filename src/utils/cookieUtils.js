// Утилиты для работы с cookie
export const setCookie = (name, value, days = 30) => {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
};

export const getCookie = (name) => {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
};

export const deleteCookie = (name) => {
    document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
};

// Специальные функции для tour панелей
export const getTourPanelState = (componentName) => {
    const cookieName = `tourPanel_${componentName}`;
    const value = getCookie(cookieName);
    return value === 'false' ? false : true; // По умолчанию true для первого посещения
};

export const setTourPanelState = (componentName, isVisible) => {
    const cookieName = `tourPanel_${componentName}`;
    setCookie(cookieName, isVisible.toString(), 90); // Сохраняем на N дней
};

// Специальные функции для viewMode
export const getViewModeState = (componentName) => {
    const cookieName = `viewMode_${componentName}`;
    const value = getCookie(cookieName);
    return value || 'cards'; // По умолчанию 'cards'
};

export const setViewModeState = (componentName, viewMode) => {
    const cookieName = `viewMode_${componentName}`;
    setCookie(cookieName, viewMode, 90); // Сохраняем на N дней
};
