import { useState, useCallback } from 'react';
import { getCookie, setCookie, deleteCookie } from '../utils/cookieUtils';

/**
 * Хук для работы с куками, безопасный для SSR.
 * @param {string} name - Имя куки
 * @param {Object} options - Настройки (maxAge, secure, sameSite)
 */
export const useCookie = (name, options = {}) => {
    const [value, setValue] = useState(() => {
        if (typeof window !== 'undefined') {
            return getCookie(name);
        }
        return null;
    });

    const updateCookie = useCallback((newValue, overrideOptions = {}) => {
        if (typeof window !== 'undefined') {
            const finalOptions = { ...options, ...overrideOptions };

            // Передаем весь объект опций вместо просто количества дней
            setCookie(name, newValue, finalOptions);
            setValue(newValue);
        }
    }, [name, options]);

    const removeCookie = useCallback(() => {
        if (typeof window !== 'undefined') {
            deleteCookie(name);
            setValue(null);
        }
    }, [name]);

    return [value, updateCookie, removeCookie];
};
