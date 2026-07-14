import { authFetch } from "../../../utils/easyUtils";


// ─── Типы ────────────────────────────────────────────────────────────────────

export interface GOAuth {
    calendar: boolean;
    sheets: boolean;
}

export interface EsperoConfig {
    wait: number;
    limit: number;
    ignore?: boolean;
}

export interface GoogleRealtimeVAD {
    voice_name?: string | null;
    language_code?: string | null;
    input_audio_transcription?: boolean | null;
    output_audio_transcription?: boolean | null;
    automatic_activity_detection?: boolean | null;
    barge_in?: boolean | null;
    silence_duration_ms?: number | null;
}

export interface RealtimeVAD {
    threshold?: number | null;
    prefix_padding_ms?: number | null;
    silence_duration_ms?: number | null;
    interrupt_response?: boolean | null;
    temperature?: number | null;
    /** 0 = "inf" (IntOrInf{Value:0}), >0 = число токенов; сервер отдаёт строку "inf" или число */
    max_response_output_tokens?: number | string | null;
    input_audio_transcription?: boolean | null;
    initial_greeting?: boolean | null;
    greeting?: string | null;
    voice?: string | null;
    /** Google-специфичные параметры */
    google?: GoogleRealtimeVAD | null;
}

export interface GptTypeValue {
    name: string;
    id?: number | null;
}

export interface DocumentMetadata {
    source?: string;
    createdAt?: string;
    [key: string]: any;
}

export interface Document {
    id: string;
    name: string;
    content?: string;
    metadata?: DocumentMetadata;
    createdAt?: string;
    [key: string]: any;
}

export interface ModelFormValues {
    name: string;
    prompt?: string;
    action?: string;
    triggers?: string[];
    fileids?: string[];
    search?: boolean;
    interpreter?: boolean;
    espero?: EsperoConfig;
    gpttype?: GptTypeValue | string | null;
    s3files?: boolean;
    operator?: boolean;
    image?: boolean;
    web_search?: boolean;
    video?: boolean;
    haunter?: boolean;
    google_oauth?: GOAuth | false;
    realtime?: boolean;
    realtime_vad?: RealtimeVAD | null;
    google_realtime?: boolean;
    /** Контейнер, который прокидывает компонент Google_Realtime через Form.Item */
    google_realtime_vad?: { google_realtime: boolean; google_realtime_vad: (GoogleRealtimeVAD & { initial_greeting?: boolean | null; greeting?: string | null }) | null } | null;
}

export interface SaveModelParams {
    values: ModelFormValues;
    isUpdate?: boolean;
    provider?: string | null;
    gpttype?: GptTypeValue | string | null;
}

export interface SaveModelResult {
    status: "ok" | "error";
}

export interface SetActiveProviderResult {
    status: "ok" | "error";
    active_channels?: boolean;
    error?: string;
}

export interface CheckDemoResult {
    success: boolean;
    status?: string;
    error?: string;
}

export interface ListModelsResponse {
    models?: Array<string | { Id?: string | number | null; Name?: string | null } | null>;
}

// ─── Типы для getModelData ────────────────────────────────────────────────────

export interface AllModelsResponse {
    models?: Record<string, ModelData>;
    active_provider?: string | null;
}

export interface ModelData {
    name?: string;
    prompt?: string;
    instructions?: string;
    mact?: string;
    trig?: string[];
    fileids?: string[];
    fileIds?: string[];
    search?: boolean;
    operator?: boolean;
    haunter?: boolean;
    interpreter?: boolean;
    interp?: boolean;
    s3?: boolean;
    s3_enabled?: boolean;
    s3files?: boolean;
    image?: boolean;
    web_search?: boolean;
    video?: boolean;
    g_oauth?: GOAuth;
    espero?: EsperoConfig;
    gpttype?: GptTypeValue | string | null;
    model?: string;
    realtime?: boolean;
    realtime_vad?: RealtimeVAD | null;
    google_realtime?: boolean;
    embedding_docs?: Document[];
    [key: string]: any;
}

// ─── getModelData ─────────────────────────────────────────────────────────────

export async function getListModelNames(provider?: string | null): Promise<GptTypeValue[]> {
    const providerParam = provider ? `?provider=${provider}` : "";
    const response = await authFetch(`/v1/model/list${providerParam}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
    });


    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Ошибка сервера: ${response.status}`);
    }

    const data = await response.json() as ListModelsResponse;
    const rawModels = Array.isArray(data?.models) ? data.models : [];

    return rawModels
        .filter((item): item is string | { Id?: string | number | null; Name?: string | null } => item != null)
        .map((item) => {
            if (typeof item === "string") {
                return { name: item, id: 0 };
            }

            if (typeof item === "object") {
                const name = typeof item.Name === "string" && item.Name.trim()
                    ? item.Name.trim()
                    : "";
                const rawId = item.Id;
                const id = typeof rawId === "number"
                    ? rawId
                    : typeof rawId === "string" && rawId.trim()
                        ? Number(rawId)
                        : undefined;

                const finalId = id !== undefined && Number.isFinite(id) ? id : 0;
                return name ? { name, id: finalId } : { name: "", id: 0 };
            }

            return { name: "", id: 0 };
        })
        .filter((model) => Boolean(model.name));
}

export async function getModelData(): Promise<AllModelsResponse | null> {
    const response = await authFetch(`/v1/model`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Ошибка сервера: ${response.status}`);
    }

    return await response.json() as AllModelsResponse;
}

export function extractAllModels(data: AllModelsResponse | null): Record<string, ModelData> {
    return data?.models ?? {};
}

export function getActiveProviderName(data: AllModelsResponse | null): string | null {
    return data?.active_provider ?? null;
}

// ─── saveModelData ────────────────────────────────────────────────────────────

export const saveModelData = async ({
    values,
    isUpdate = false,
    provider = null,
    gpttype = null,
}: SaveModelParams): Promise<SaveModelResult> => {
    const endpoint = isUpdate ? "/v1/model/update" : "/v1/model/create";
    const providerParam = provider ? `?provider=${provider}` : "";

    try {
        const mrt = values.realtime_vad?.max_response_output_tokens;
        const maxResponseOutputTokens =
            mrt == null || mrt === 0 || mrt === "inf" ? 0 : Number(mrt);

        const normalizeGptType = (source: unknown): GptTypeValue | undefined => {
            if (source && typeof source === "object") {
                const record = source as Record<string, unknown>;
                const name = typeof record.name === "string" && record.name.trim()
                    ? record.name.trim()
                    : typeof record.Name === "string" && record.Name.trim()
                        ? record.Name.trim()
                        : undefined;
                const id = typeof record.id === "number"
                    ? record.id
                    : typeof record.ID === "number"
                        ? record.ID
                        : typeof record.id === "string" && record.id.trim()
                            ? Number(record.id)
                            : typeof record.ID === "string" && record.ID.trim()
                                ? Number(record.ID)
                                : undefined;

                if (name) {
                    return {name, id: id ?? 0};
                }
            }

            if (typeof source === "string") {
                const trimmed = source.trim();
                return trimmed ? {name: trimmed, id: 0} : undefined;
            }

            return undefined;
        };

        const resolvedGptType = normalizeGptType(gpttype ?? values.gpttype);

        // ── Google Realtime VAD ───────────────────────────────────────────────
        const googleRtContainer = values.google_realtime_vad as any;
        const googleRtEnabled = Boolean(googleRtContainer?.google_realtime);
        const googleVadRaw: (GoogleRealtimeVAD & { initial_greeting?: boolean | null; greeting?: string | null }) | null =
            googleRtContainer?.google_realtime_vad ?? null;

        let googleVadResult: GoogleRealtimeVAD | null = null;
        // Поля initial_greeting и greeting — общие для RealtimeVAD (не входят в GoogleRealtimeVAD Go-структуру)
        let googleCommonFields: { initial_greeting?: boolean; greeting?: string } = {};

        if (googleRtEnabled && googleVadRaw) {
            googleVadResult = {};
            if (googleVadRaw.voice_name != null)                   googleVadResult.voice_name = googleVadRaw.voice_name;
            if (googleVadRaw.language_code != null)                googleVadResult.language_code = googleVadRaw.language_code;
            if (googleVadRaw.input_audio_transcription != null)    googleVadResult.input_audio_transcription = googleVadRaw.input_audio_transcription;
            if (googleVadRaw.output_audio_transcription != null)   googleVadResult.output_audio_transcription = googleVadRaw.output_audio_transcription;
            if (googleVadRaw.automatic_activity_detection != null) googleVadResult.automatic_activity_detection = googleVadRaw.automatic_activity_detection;
            if (googleVadRaw.barge_in != null)                     googleVadResult.barge_in = googleVadRaw.barge_in;
            if (googleVadRaw.silence_duration_ms != null)          googleVadResult.silence_duration_ms = googleVadRaw.silence_duration_ms;
            // initial_greeting и greeting идут на верхний уровень RealtimeVAD
            if (googleVadRaw.initial_greeting != null) googleCommonFields.initial_greeting = googleVadRaw.initial_greeting;
            if (googleVadRaw.greeting != null)         googleCommonFields.greeting = googleVadRaw.greeting;
        }

        // ── OpenAI Realtime VAD ───────────────────────────────────────────────
        let openaiVadResult: (Partial<RealtimeVAD> & { max_response_output_tokens?: number }) | null = null;
        if (Boolean(values.realtime) && values.realtime_vad) {
            const vadContainer = values.realtime_vad as any;
            const vad = vadContainer.realtime_vad || vadContainer;
            openaiVadResult = {};
            if (vad.threshold != null)           openaiVadResult.threshold = vad.threshold;
            if (vad.prefix_padding_ms != null)   openaiVadResult.prefix_padding_ms = vad.prefix_padding_ms;
            if (vad.silence_duration_ms != null) openaiVadResult.silence_duration_ms = vad.silence_duration_ms;
            if (vad.interrupt_response != null)  openaiVadResult.interrupt_response = vad.interrupt_response;
            if (vad.temperature != null)         openaiVadResult.temperature = vad.temperature;
            openaiVadResult.max_response_output_tokens = maxResponseOutputTokens;
            if (vad.input_audio_transcription != null) openaiVadResult.input_audio_transcription = vad.input_audio_transcription;
            if (vad.initial_greeting != null)          openaiVadResult.initial_greeting = vad.initial_greeting;
            if (vad.greeting != null)                  openaiVadResult.greeting = vad.greeting;
            if (vad.voice != null && vad.voice !== "verse") openaiVadResult.voice = vad.voice;
        }

        // realtime_vad объединяет OpenAI-поля, общие поля Google и вложенный google-блок
        const realtimeVadPayload =
            openaiVadResult || googleVadResult
                ? {
                      ...(openaiVadResult ?? {}),
                      ...(googleVadResult ? { ...googleCommonFields, google: googleVadResult } : {}),
                  }
                : null;

        const requestData = {
            name: values.name,
            prompt: values.prompt || "",
            mact: values.action || "",
            trig: values.triggers || [],
            search: Boolean(values.search),
            interpreter: Boolean(values.interpreter),
            espero: values.espero,
            gpttype: resolvedGptType ?? null,
            fileids: Boolean(values.s3files) ? (values.fileids || []) : [],
            s3: Boolean(values.s3files),
            operator: Boolean(values.operator),
            image: Boolean(values.image),
            web_search: Boolean(values.web_search),
            video: Boolean(values.video),
            haunter: Boolean(values.haunter),
            g_oauth:
                values.google_oauth && typeof values.google_oauth === "object"
                    ? {
                          calendar: Boolean(values.google_oauth.calendar),
                          sheets: Boolean(values.google_oauth.sheets),
                      }
                    : { calendar: false, sheets: false },
            // OpenAI Realtime API или Google Realtime — оба используют поле realtime на сервере
            realtime: Boolean(values.realtime) || googleRtEnabled,
            // Объединённый VAD (OpenAI-поля + общие поля + google-блок)
            realtime_vad: realtimeVadPayload,
        };

        const response = await authFetch(`${endpoint}${providerParam}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify(requestData),
        });

        const result = await response.json();

        if (response.ok && (result.message === "ok" || result.status === "ok")) {
            if (!isUpdate) {
                localStorage.setItem("userModel", "true");
            }
            return { status: "ok" };
        }

        return { status: "error" };
    } catch (error) {
        console.error(`Ошибка при ${isUpdate ? "обновлении" : "создании"} модели:`, error);
        return { status: "error" };
    }
};

// ─── setActiveProvider ────────────────────────────────────────────────────────

export const setActiveProvider = async (provider: string): Promise<SetActiveProviderResult> => {
    try {
        const url = `/v1/model/set-active?provider=${encodeURIComponent(provider)}`;
        const response = await authFetch(url, {
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
        });

        if (response.ok) {
            const result = await response.json();
            return { status: "ok", active_channels: result.active_channels };
        } else {
            const result = await response.json();
            return { status: "error", error: result.error || "Не удалось изменить активную модель" };
        }
    } catch (error: unknown) {
        console.error("Ошибка при установке активного провайдера:", error);
        return { status: "error", error: error instanceof Error ? error.message : String(error) };
    }
};

// ─── checkDemo ────────────────────────────────────────────────────────────────

export async function checkDemo(): Promise<CheckDemoResult> {
    try {
        const response = await authFetch(`/v1/model/demo`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(`Ошибка при проверке демо статуса: ${response.status}`, errorData);
            return { success: false, error: errorData.error || `HTTP ${response.status}` };
        }

        const result = await response.json();
        return { success: true, status: result.status };
    } catch (error: unknown) {
        console.error("Ошибка при проверке демо статуса:", error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}
