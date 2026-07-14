import { authFetch } from '../../../utils/easyUtils';

export interface ProvidersAvailability {
    available: string[];
    unavailable: string[];
}

export interface ProvidersAvailabilityResult {
    success: boolean;
    data?: ProvidersAvailability;
    error?: string;
}

/**
 * Получает список провайдеров с установленным и без API-ключа для текущего пользователя.
 * GET /provider/available
 */
export async function fetchProvidersAvailability(): Promise<ProvidersAvailabilityResult> {
    try {
        const response = await authFetch(`/v1/provider/available`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include'
        });

        if (!response.ok) {
            if (response.status === 401) {
                console.error('fetchProvidersAvailability: ошибка авторизации (401)');
                return { success: false, error: 'Unauthorized' };
            }
            const errorData = await response.json().catch(() => ({}));
            console.error(`fetchProvidersAvailability: HTTP ${response.status}`, errorData);
            return { success: false, error: errorData.error || `HTTP ${response.status}` };
        }

        const data: ProvidersAvailability = await response.json();
        return { success: true, data };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('fetchProvidersAvailability: ошибка запроса', message);
        return { success: false, error: message };
    }
}

export interface RevokeProviderKeyResult {
    success: boolean;
    restart?: boolean;
    error?: string;
}

/**
 * Отзывает API-ключ пользователя для выбранного провайдера.
 * DELETE /provider/revoke?providerStr=...
 */
export async function revokeProviderKey(provider: string): Promise<RevokeProviderKeyResult> {
    try {
        const response = await authFetch(`/v1/provider/revoke?providerStr=${encodeURIComponent(provider)}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include'
        });

        if (!response.ok) {
            if (response.status === 401) {
                console.error('revokeProviderKey: ошибка авторизации (401)');
                return { success: false, error: 'Unauthorized' };
            }
            const errorData = await response.json().catch(() => ({}));
            console.error(`revokeProviderKey: HTTP ${response.status}`, errorData);
            return { success: false, error: errorData.error || `HTTP ${response.status}` };
        }

        const data = await response.json().catch(() => ({}));
        return { success: true, restart: !!data.restart };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('revokeProviderKey: ошибка запроса', message);
        return { success: false, error: message };
    }
}

export interface SetProviderKeyResult {
    success: boolean;
    restart?: boolean;
    error?: string;
}

/**
 * Устанавливает API-ключ пользователя для выбранного провайдера.
 * POST /provider/set-key?providerStr=...
 */
export async function setProviderKey(provider: string, key: string): Promise<SetProviderKeyResult> {
    try {
        const response = await authFetch(`/v1/provider/set-key?providerStr=${encodeURIComponent(provider)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ key }),
        });


        if (!response.ok) {
            if (response.status === 401) {
                console.error('setProviderKey: ошибка авторизации (401)');
                return { success: false, error: 'Unauthorized' };
            }
            const errorData = await response.json().catch(() => ({}));
            console.error(`setProviderKey: HTTP ${response.status}`, errorData);
            return { success: false, error: errorData.error || `HTTP ${response.status}` };
        }

        const data = await response.json().catch(() => ({}));
        return { success: true, restart: !!data.restart };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('setProviderKey: ошибка запроса', message);
        return { success: false, error: message };
    }
}
