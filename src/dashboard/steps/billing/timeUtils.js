/**
 * Утилиты для работы с временными полями платежей
 * Поддерживает как старые MySQL datetime поля, так и новые Unix timestamp поля
 */

/**
 * Получает Unix timestamp из данных платежа для указанного поля
 * Приоритетно использует поля с суффиксом "Unix" для точного отображения времени
 *
 * @param {Object} paymentData - Объект с данными платежа
 * @param {string} fieldName - Название поля времени (например, 'expiresAt', 'createdAt')
 * @returns {number|null} Unix timestamp в секундах или null если поле не найдено
 */
export function getUnixTimestamp(paymentData, fieldName) {
    if (!paymentData || !fieldName) return null;

    // Приоритет 1: Пытаемся найти Unix версию поля
    const unixFieldName = fieldName + 'Unix';
    if (paymentData[unixFieldName] && Number.isFinite(paymentData[unixFieldName])) {
        return paymentData[unixFieldName];
    }

    // Приоритет 2: Используем основное поле, если это число
    const fieldValue = paymentData[fieldName];
    if (!fieldValue) return null;

    if (typeof fieldValue === 'number' && Number.isFinite(fieldValue)) {
        return fieldValue;
    }

    // Приоритет 3: Парсим строковое значение как Unix timestamp
    const s = String(fieldValue).trim();
    if (/^\d+$/.test(s)) {
        const unixTime = parseInt(s, 10);
        return unixTime;
    }

    // Приоритет 4: Fallback к парсингу MySQL datetime (может быть неточным)
    console.warn(`Fallback to MySQL datetime parsing for ${fieldName}:`, fieldValue, '- may be inaccurate due to timezone issues');
    const iso = s.replace(' ', 'T'); // конвертируем в ISO формат
    const d = new Date(iso);
    const ts = Math.floor(d.getTime() / 1000);
    return Number.isFinite(ts) ? ts : null;
}

/**
 * Форматирует Unix timestamp в читаемую дату и время
 *
 * @param {number} unixTimestamp - Unix timestamp в секундах
 * @param {Object} options - Опции форматирования
 * @returns {string} Отформатированная дата и время
 */
export function formatTimestamp(unixTimestamp, options = {}) {
    if (!unixTimestamp || !Number.isFinite(unixTimestamp)) {
        return 'Неизвестно';
    }

    const {
        includeTime = true,
        includeSeconds = false,
        locale = 'ru-RU',
        timeZone = 'Europe/Moscow'
    } = options;

    try {
        const date = new Date(unixTimestamp * 1000);

        const dateOptions = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            timeZone
        };

        if (includeTime) {
            dateOptions.hour = '2-digit';
            dateOptions.minute = '2-digit';
            if (includeSeconds) {
                dateOptions.second = '2-digit';
            }
        }

        return date.toLocaleString(locale, dateOptions);
    } catch (error) {
        console.error('Error formatting timestamp:', error);
        return 'Неизвестно';
    }
}

/**
 * Форматирует оставшееся время в читаемый вид
 *
 * @param {number} seconds - Количество секунд
 * @returns {string} Отформатированное время (например, "15 мин 30 сек")
 */
export function formatTimeLeft(seconds) {
    if (!seconds || seconds <= 0) {
        return '0 сек';
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts = [];
    if (hours > 0) parts.push(`${hours} ч`);
    if (minutes > 0) parts.push(`${minutes} мин`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs} сек`);

    return parts.join(' ');
}

/**
 * Получает время истечения платежа в удобном формате
 *
 * @param {Object} paymentData - Данные платежа
 * @returns {Object} Объект с информацией о времени истечения
 */
export function getExpirationInfo(paymentData) {
    const expiresAtUnix = getUnixTimestamp(paymentData, 'expiresAt');

    if (!expiresAtUnix) {
        return {
            expiresAt: null,
            timeLeft: 0,
            isExpired: true,
            formattedExpiration: 'Неизвестно',
            formattedTimeLeft: '0 сек'
        };
    }

    const now = Math.floor(Date.now() / 1000);
    const timeLeft = Math.max(0, expiresAtUnix - now);
    const isExpired = timeLeft <= 0;

    return {
        expiresAt: expiresAtUnix,
        timeLeft,
        isExpired,
        formattedExpiration: formatTimestamp(expiresAtUnix),
        formattedTimeLeft: formatTimeLeft(timeLeft)
    };
}

/**
 * Получает информацию о времени создания платежа
 *
 * @param {Object} paymentData - Данные платежа
 * @returns {Object} Объект с информацией о времени создания
 */
export function getCreationInfo(paymentData) {
    const createdAtUnix = getUnixTimestamp(paymentData, 'createdAt');

    if (!createdAtUnix) {
        return {
            createdAt: null,
            formattedCreation: 'Неизвестно'
        };
    }

    return {
        createdAt: createdAtUnix,
        formattedCreation: formatTimestamp(createdAtUnix)
    };
}

/**
 * Получает информацию о времени подтверждения платежа
 *
 * @param {Object} paymentData - Данные платежа
 * @returns {Object} Объект с информацией о времени подтверждения
 */
export function getConfirmationInfo(paymentData) {
    const confirmedAtUnix = getUnixTimestamp(paymentData, 'confirmedAt');

    if (!confirmedAtUnix) {
        return {
            confirmedAt: null,
            formattedConfirmation: null
        };
    }

    return {
        confirmedAt: confirmedAtUnix,
        formattedConfirmation: formatTimestamp(confirmedAtUnix)
    };
}
