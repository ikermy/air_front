import { authFetch } from '../../../utils/easyUtils';

export interface ProvidersAvailability {
    available: string[];
    unavailable: string[];
    /**
     * Возможности провайдеров, например:
     * { "elevenlabs": ["tts","stt","voice_clone","music"], "openai": ["llm"] }
     */
    capabilities?: Record<string, string[]>;
}

export interface ProvidersAvailabilityResult {
    success: boolean;
    data?: ProvidersAvailability;
    error?: string;
}

// Кэш /provider/available: один запрос на форму, дедупликация параллельных вызовов.
let providersAvailabilityCache: { data: ProvidersAvailability; ts: number } | null = null;
let providersAvailabilityInFlight: Promise<ProvidersAvailabilityResult> | null = null;
const PROVIDERS_AVAILABILITY_TTL_MS = 30_000;

/** Сбросить кэш /provider/available (например, после set/revoke ключа). */
export function invalidateProvidersAvailability(): void {
    providersAvailabilityCache = null;
    providersAvailabilityInFlight = null;
}

/**
 * Получает список провайдеров с установленным и без API-ключа для текущего пользователя.
 * GET /provider/available
 *
 * Результат кэшируется на короткий TTL и дедуплицируется, чтобы несколько
 * компонентов формы не создавали burst запросов.
 */
export async function fetchProvidersAvailability(options?: { force?: boolean }): Promise<ProvidersAvailabilityResult> {
    const now = Date.now();
    if (!options?.force && providersAvailabilityCache && now - providersAvailabilityCache.ts < PROVIDERS_AVAILABILITY_TTL_MS) {
        return { success: true, data: providersAvailabilityCache.data };
    }
    if (!options?.force && providersAvailabilityInFlight) {
        return providersAvailabilityInFlight;
    }

    providersAvailabilityInFlight = (async (): Promise<ProvidersAvailabilityResult> => {
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
            providersAvailabilityCache = { data, ts: Date.now() };
            return { success: true, data };
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            console.error('fetchProvidersAvailability: ошибка запроса', message);
            return { success: false, error: message };
        } finally {
            providersAvailabilityInFlight = null;
        }
    })();

    return providersAvailabilityInFlight;
}

export interface VoiceSettingsModel {
    Id?: string | number | null;
    Name?: string | null;
    name?: string | null;
    kind?: string | null;
    is_default?: boolean | null;
    display_name?: string | null;
    languages?: string[] | null;
}

export interface VoiceSettingsResponse {
    provider?: string;
    voice_only?: boolean;
    available?: boolean;
    capabilities?: string[];
    models?: VoiceSettingsModel[];
    voices?: { items?: unknown[] } & Record<string, unknown>;
    voices_error?: string;
}

export interface VoiceSettingsResult {
    success: boolean;
    data?: VoiceSettingsResponse;
    error?: string;
}

/**
 * Один агрегирующий запрос для голосовой панели.
 * GET /model/voice/settings?provider=...
 *
 * Кэшируется на короткий TTL и дедуплицируется (панель вызывается из
 * нескольких компонентов формы).
 */
const voiceSettingsCache = new Map<string, { data: VoiceSettingsResponse; ts: number }>();
const voiceSettingsInFlight = new Map<string, Promise<VoiceSettingsResult>>();
const VOICE_SETTINGS_TTL_MS = 15_000;

export function invalidateVoiceSettings(provider?: string): void {
    if (provider) {
        voiceSettingsCache.delete(provider);
        voiceSettingsInFlight.delete(provider);
    } else {
        voiceSettingsCache.clear();
        voiceSettingsInFlight.clear();
    }
}

export async function fetchVoiceSettings(provider: string): Promise<VoiceSettingsResult> {
    const cached = voiceSettingsCache.get(provider);
    if (cached && Date.now() - cached.ts < VOICE_SETTINGS_TTL_MS) {
        return { success: true, data: cached.data };
    }
    const inFlight = voiceSettingsInFlight.get(provider);
    if (inFlight) {
        return inFlight;
    }

    const promise = (async (): Promise<VoiceSettingsResult> => {
        try {
            const response = await authFetch(`/v1/model/voice/settings?provider=${encodeURIComponent(provider)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return { success: false, error: (errorData as {error?: string}).error || `HTTP ${response.status}` };
            }

            const data = (await response.json()) as VoiceSettingsResponse;
            voiceSettingsCache.set(provider, { data, ts: Date.now() });
            return { success: true, data };
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            return { success: false, error: message };
        } finally {
            voiceSettingsInFlight.delete(provider);
        }
    })();

    voiceSettingsInFlight.set(provider, promise);
    return promise;
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
        invalidateProvidersAvailability();
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
        invalidateProvidersAvailability();
        return { success: true, restart: !!data.restart };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('setProviderKey: ошибка запроса', message);
        return { success: false, error: message };
    }
}
