// Утилиты для работы с cookie
export const setCookie = (name, value, options = {}) => {
    if (typeof window === 'undefined') return;

    let { days, maxAge, secure, sameSite = 'lax', path = '/' } = options;

    // Поддержка старого сигнатуры (name, value, days)
    if (typeof options === 'number') {
        days = options;
    }

    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    } else if (maxAge) {
        expires = "; max-age=" + maxAge;
    }

    const secureFlag = secure ? "; secure" : "";
    const sameSiteFlag = "; samesite=" + sameSite;

    document.cookie = `${name}=${value || ""}${expires}; path=${path}${sameSiteFlag}${secureFlag}`;
};

export const getCookie = (name) => {
    if (typeof window === 'undefined') return null;
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
    if (typeof window === 'undefined') return;
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
    // Также пробуем удалить с текущего хоста без path если он был установлен иначе
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
};

// Специальные функции для tour панелей
export const getTourPanelState = (componentName) => {
    const cookieName = `tourPanel_${componentName}`;
    const value = getCookie(cookieName);
    return value !== 'false'; // По умолчанию true для первого посещения
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
