import React from 'react';
import type {WidgetAuthorizationState} from '../hooks/useWidgetAuthorization';

export interface AccessStateProps {
    state: WidgetAuthorizationState | string | null;
}

const messages: Record<string, string> = {
    disconnected: 'Нет соединения с сервером',
    unauthorized: 'В авторизации отказано',
    invalidRequest: 'Неверный запрос проверьте ключ',
    forbiddenOrigin: 'Текущий сайт не входит в список разрешённых',
    paymentRequired: 'Необходимо продлить подписку',
    botNotFound: 'Бот не найден проверьте ключ',
    tooManyRequests: 'Слишком много запросов!',
    serverError: 'Внутренняя ошибка сервера',
    botStopped: 'Бот остановлен',
    networkError: 'Ошибка сети',
    unknownError: 'Неизвестная ошибка',
};

export function AccessState({state}: AccessStateProps) {
    const message = state ? messages[state] : undefined;
    return message ? <div className="error-message">{message}</div> : null;
}
