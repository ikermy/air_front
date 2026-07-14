/**
 * Утилиты для работы с Avito каналом
 */

import { ChatsResponse, ChatsQueryParams, SubscriptionsResponse, WebhookActionResponse } from './avitoTypes';
import { authFetch } from '../../../utils/easyUtils';

/**
 * Получает статус подключения Avito
 */
export async function getAvitoStatus(): Promise<{
    connected: boolean;
    status?: string;
    error?: string;
}> {
    try {
        const response = await authFetch(`/v1/avito/status`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            return { connected: false, error: `HTTP ${response.status}` };
        }

        const data = await response.json();
        return {
            connected: data.connected || false,
            status: data.status,
        };
    } catch (error) {
        console.error('Ошибка получения статуса Avito:', error);
        return { connected: false, error: String(error) };
    }
}

/**
 * Отключает Avito канал
 */
export async function disconnectAvito(): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        const response = await authFetch(`/v1/avito/disconnect`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            return { success: false, error: errorData.error || `HTTP ${response.status}` };
        }

        return { success: true };
    } catch (error) {
        console.error('Ошибка отключения Avito:', error);
        return { success: false, error: String(error) };
    }
}

/**
 * Получает список чатов Avito
 */
export async function fetchAvitoChats(
    params?: ChatsQueryParams
): Promise<{
    success: boolean;
    data?: ChatsResponse;
    error?: string;
    status?: number;
}> {
    try {
        // Формируем query параметры
        const queryParams = new URLSearchParams();

        if (params?.limit !== undefined) {
            queryParams.append('limit', String(params.limit));
        }

        if (params?.offset !== undefined) {
            queryParams.append('offset', String(params.offset));
        }

        if (params?.unread_only !== undefined) {
            queryParams.append('unread_only', String(params.unread_only));
        }

        const queryString = queryParams.toString();
        const url = `/v1/avito/chats?${queryString}`;

        const response = await authFetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        const status = response.status;

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            return {
                success: false,
                error: errorData.error || `HTTP ${status}`,
                status
            };
        }

        const data: ChatsResponse = await response.json();
        return { success: true, data, status };
    } catch (error) {
        console.error('Ошибка получения чатов Avito:', error);
        return { success: false, error: String(error) };
    }
}

/**
 * Получает список webhook подписок Avito
 */
export async function getAvitoSubscriptions(): Promise<{
    success: boolean;
    data?: SubscriptionsResponse;
    error?: string;
    status?: number;
}> {
    try {
        const url = `/v1/avito/subscriptions`;
        const response = await authFetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        const status = response.status;

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            return {
                success: false,
                error: errorData.error || `HTTP ${status}`,
                status
            };
        }

        const data: SubscriptionsResponse = await response.json();
        return { success: true, data, status };
    } catch (error) {
        console.error('Ошибка получения подписок Avito:', error);
        return { success: false, error: String(error) };
    }
}

/**
 * Подписывается на webhook Avito
 */
export async function subscribeToAvitoWebhooks(): Promise<{
    success: boolean;
    data?: WebhookActionResponse;
    error?: string;
    status?: number;
}> {
    try {
        const url = `/v1/avito/subscribe`;
        const response = await authFetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        const status = response.status;

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            return {
                success: false,
                error: errorData.error || `HTTP ${status}`,
                status
            };
        }

        const data: WebhookActionResponse = await response.json();
        return { success: true, data, status };
    } catch (error) {
        console.error('Ошибка подписки на webhooks Avito:', error);
        return { success: false, error: String(error) };
    }
}

/**
 * Отписывается от webhook Avito
 */
export async function unsubscribeFromAvitoWebhook(
    webhookUrl: string
): Promise<{
    success: boolean;
    data?: WebhookActionResponse;
    error?: string;
    status?: number;
}> {
    try {
        const url = `/v1/avito/unsubscribe`;
        const response = await authFetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        const status = response.status;

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            return {
                success: false,
                error: errorData.error || `HTTP ${status}`,
                status
            };
        }

        const data: WebhookActionResponse = await response.json();
        return { success: true, data, status };
    } catch (error) {
        console.error('Ошибка отписки от webhook Avito:', error);
        return { success: false, error: String(error) };
    }
}
