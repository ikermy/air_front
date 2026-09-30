import {authFetch} from "./easyUtils";

export interface Voice {
    id: string;
    name?: string;
    languages?: string[];
    description?: string;
    gender?: string;
    tags?: string[];
    /** instant | professional (PVC/IVC) */
    clone_mode?: string;
    /** queued | fine_tuning | fine_tuned | failed */
    fine_tuning_state?: string;
    fine_tuning_progress?: number;
    [key: string]: unknown;
}

export interface VoiceList {
    items: Voice[];
}

export interface VoiceListParams {
    provider?: string;
    limit?: number;
    offset?: number;
    type?: string;
}

export interface CloneVoiceValues {
    name: string;
    /** instant | professional */
    clone_mode?: string;
    /** language_id/ISO, обязателен для professional */
    language?: string;
    /** модель для train (professional) */
    model_id?: string;
    languages?: string;
    gender?: string;
    description?: string;
    tags?: string;
}

const withProvider = (provider?: string, fallback = "mistral") =>
    encodeURIComponent(provider || fallback);

/**
 * Универсальный клиент голосового CRUD.
 * Провайдер передаётся через `?provider=` (mistral|elevenlabs), см. план миграции §4.4.
 */
export function createVoiceApi(defaultProvider = "mistral") {
    return {
        async list(params: VoiceListParams = {}): Promise<VoiceList> {
            const query = new URLSearchParams();
            query.set("provider", params.provider || defaultProvider);
            if (params.limit !== undefined) query.set("limit", String(params.limit));
            if (params.offset !== undefined) query.set("offset", String(params.offset));
            if (params.type !== undefined) query.set("type", params.type);
            const response = await authFetch(`/v1/model/voices?${query.toString()}`);
            if (!response.ok) throw new Error(await response.text());
            return response.json() as Promise<VoiceList>;
        },

        async get(voiceId: string, provider?: string): Promise<Voice> {
            const response = await authFetch(
                `/v1/model/voices/${encodeURIComponent(voiceId)}?provider=${withProvider(provider, defaultProvider)}`,
            );
            if (!response.ok) throw new Error(await response.text());
            return response.json() as Promise<Voice>;
        },

        async update(voiceId: string, values: Record<string, unknown>, provider?: string): Promise<Voice> {
            const response = await authFetch(
                `/v1/model/voices/${encodeURIComponent(voiceId)}?provider=${withProvider(provider, defaultProvider)}`,
                {
                    method: "PATCH",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify(values),
                },
            );
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error((data as {error?: string})?.error || "Не удалось обновить голос");
            }
            return response.json() as Promise<Voice>;
        },

        async remove(voiceId: string, provider?: string): Promise<void> {
            const response = await authFetch(
                `/v1/model/voices/${encodeURIComponent(voiceId)}?provider=${withProvider(provider, defaultProvider)}`,
                {method: "DELETE"},
            );
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error((data as {error?: string})?.error || "Не удалось удалить голос");
            }
        },

        async sample(voiceId: string, provider?: string): Promise<Blob> {
            const response = await authFetch(
                `/v1/model/voices/${encodeURIComponent(voiceId)}/sample?provider=${withProvider(provider, defaultProvider)}`,
            );
            if (!response.ok) {
                const text = await response.text().catch(() => "");
                let message = text || `Не удалось получить sample (${response.status})`;
                try {
                    message = (JSON.parse(text) as {error?: string})?.error || message;
                } catch {
                    /* plain text */
                }
                throw new Error(message);
            }
            return response.blob();
        },

        async clone(values: CloneVoiceValues, files: File[], provider?: string): Promise<Voice> {
            const body = new FormData();
            // Backend принимает file/files/samples и допускает повторение поля.
            files.forEach((file) => body.append("file", file, file.name || "voice-sample.wav"));
            body.set("provider", provider || defaultProvider);
            Object.entries(values).forEach(([key, value]) => {
                if (value) body.set(key, value as string);
            });

            const response = await authFetch("/v1/model/voice/clone", {method: "POST", body});
            const responseText = await response.text();
            if (!response.ok) {
                let errorMessage = responseText || `Ошибка сервера: ${response.status}`;
                try {
                    errorMessage = JSON.parse(responseText).error || errorMessage;
                } catch {
                    /* plain text */
                }
                throw new Error(errorMessage);
            }
            const result = JSON.parse(responseText) as {voice: Voice};
            return result.voice;
        },
    };
}

/** Обратная совместимость: Mistral-клиент. */
export function createMistralVoiceApi() {
    return createVoiceApi("mistral");
}
