import {authFetch} from "../../../utils/easyUtils";

export function providerToName(provider?: string | number | null): string | null {
    const name = String(provider ?? "").toLowerCase();
    if (name === "gemini") return "google";
    return ["openai", "mistral", "google", "elevenlabs"].includes(name) ? name : null;
}


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

export interface MistralVoiceCloneConfig {
    enabled: boolean;
    profile_id: string;
    reference_audio_id: string;
    reference_format: string;
    reference_duration_ms: number;
}

export interface MistralRealtimeVAD {
    initial_greeting?: boolean | null;
    greeting?: string | null;
    stt_model?: string | null;
    tts_model?: string | null;
    voice?: string | null;
    voice_id?: string | null;
    reference_audio_id?: string | null;
    voice_clone?: MistralVoiceCloneConfig | null;
    speech_format?: string | null;
    stt_language?: string | null;
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
    mistral?: MistralRealtimeVAD | null;
}

export interface GptTypeValue {
    name: string;
    id?: number | null;
    /** Пусто/undefined — LLM-модель (general/realtime); tts|stt|music|sts — голосовая */
    kind?: string | null;
    is_default?: boolean | null;
    display_name?: string | null;
    languages?: string[] | null;
}

/** Ссылка на голосовую модель внутри comdom.VoiceConfig */
export interface VoiceModelRef {
    model?: string | null;
    voice_id?: string | null;
    [key: string]: unknown;
}

/**
 * Выбор голосового провайдера (ElevenLabs) — соответствует comdom.VoiceConfig
 * (json-поле `voice` у UniversalModelData). Backend'ы на верхнем уровне,
 * voice_id/voice_name тоже на верхнем уровне, отдельного поля music нет
 * (музыка управляется флагом create_music).
 */
export interface VoiceSelection {
    tts?: VoiceModelRef | null;
    stt?: VoiceModelRef | null;
    sts?: VoiceModelRef | null;
    music?: VoiceModelRef | null;
    tts_backend?: string | number | null;
    stt_backend?: string | number | null;
    realtime_backend?: string | number | null;
    music_backend?: string | number | null;
    voice_id?: string | null;
    voice_name?: string | null;
    elevenlabs?: Record<string, unknown> | null;
    [key: string]: unknown;
}

/** ProviderType -> строка (сервер отдаёт backend'ы числами). */
const PROVIDER_ID_TO_NAME: Record<number, string> = {
    1: "openai",
    2: "mistral",
    3: "google",
    4: "elevenlabs",
};

export function normalizeVoiceBackend(value: unknown): string | null {
    if (value === null || value === undefined || value === "") {
        return null;
    }
    if (typeof value === "number") {
        return PROVIDER_ID_TO_NAME[value] ?? String(value);
    }
    const normalized = String(value).trim().toLowerCase();
    return normalized || null;
}

/** Приводит ответ сервера (json `voice`) к форме VoiceSelection. */
export function normalizeVoiceConfig(raw: unknown): VoiceSelection | null {
    if (!raw || typeof raw !== "object") {
        return null;
    }
    const value = raw as Record<string, any>;
    return {
        // Сохраняем все прочие поля конфигурации (format, language, elevenlabs и т.п.).
        ...value,
        tts_backend: normalizeVoiceBackend(value.tts_backend),
        stt_backend: normalizeVoiceBackend(value.stt_backend),
        realtime_backend: normalizeVoiceBackend(value.realtime_backend),
        music_backend: normalizeVoiceBackend(value.music_backend),
        tts: value.tts && typeof value.tts === "object" ? {...value.tts} : null,
        stt: value.stt && typeof value.stt === "object" ? {...value.stt} : null,
        sts: value.sts && typeof value.sts === "object" ? {...value.sts} : null,
        music: value.music && typeof value.music === "object" ? {...value.music} : null,
        voice_id: value.voice_id ?? null,
        voice_name: value.voice_name ?? null,
    };
}

/** Формирует тело поля `voice` для /model/create и /model/update (backend'ы — строками). */
export function buildVoicePayload(voice: VoiceSelection | null | undefined): Record<string, unknown> | null {
    if (!voice) {
        return null;
    }
    const backend = (value: string | number | null | undefined) =>
        value === null || value === undefined || value === "" ? undefined : String(value);

    const payload: Record<string, unknown> = {};
    const ttsBackend = backend(voice.tts_backend);
    const sttBackend = backend(voice.stt_backend);
    const realtimeBackend = backend(voice.realtime_backend);
    const musicBackend = backend(voice.music_backend);
    if (ttsBackend) payload.tts_backend = ttsBackend;
    if (sttBackend) payload.stt_backend = sttBackend;
    if (realtimeBackend) payload.realtime_backend = realtimeBackend;
    if (musicBackend) payload.music_backend = musicBackend;
    if (voice.tts && Object.keys(voice.tts).length > 0) payload.tts = {...voice.tts};
    if (voice.stt && Object.keys(voice.stt).length > 0) payload.stt = {...voice.stt};
    if (voice.sts && Object.keys(voice.sts).length > 0) payload.sts = {...voice.sts};
    if (voice.music && Object.keys(voice.music).length > 0) payload.music = {...voice.music};
    if (voice.elevenlabs) payload.elevenlabs = {...voice.elevenlabs};
    if (voice.voice_id) payload.voice_id = voice.voice_id;
    if (voice.voice_name) payload.voice_name = voice.voice_name;

    return Object.keys(payload).length > 0 ? payload : null;
}

export interface UseModelName {
    gpttype?: GptTypeValue | null;
    realtime?: GptTypeValue | null;
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
    realtime_gpttype?: GptTypeValue | string | null;
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
    /** Выбор голосового провайдера (ElevenLabs) — UniversalModelData.Voice */
    Voice?: VoiceSelection | null;
    /** Генерация музыки (MCP-инструмент) */
    CreateMusic?: boolean;

    /** Контейнер, который прокидывает компонент Google_Realtime через Form.Item */
    google_realtime_vad?: { google_realtime: boolean; google_realtime_vad: (GoogleRealtimeVAD & { initial_greeting?: boolean | null; greeting?: string | null }) | null } | null;
}

export interface SaveModelParams {
    values: ModelFormValues;
    isUpdate?: boolean;
    provider?: string | null;
    useModelName?: UseModelName | null;
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
    models?: Array<string | ProviderModel | null>;
}

export interface ProviderModel {
    Id?: string | number | null;
    Name?: string | null;
    kind?: string | null;
    is_default?: boolean | null;
    display_name?: string | null;
    languages?: string[] | null;
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
    /** Выбранные модели для обычного и realtime-режимов. */
    use_model_name?: UseModelName | null;
    realtime?: boolean;
    realtime_vad?: RealtimeVAD | null;
    google_realtime?: boolean;
    /** Выбор голосового провайдера (ElevenLabs) */
    Voice?: VoiceSelection | null;
    /** Генерация музыки */
    CreateMusic?: boolean;
    embedding_docs?: Document[];
    [key: string]: any;
}

// ─── getModelData ─────────────────────────────────────────────────────────────

export async function getListModelNames(
    provider?: string | null,
    modelType: "general" | "realtime" = "general",
): Promise<GptTypeValue[]> {
    const providerName = providerToName(provider);
    const params = new URLSearchParams();
    params.set("provider", String(providerName));
    params.set("type", modelType);
    const query = params.toString();
    const response = await authFetch(`/v1/model/list${query ? `?${query}` : ""}`, {
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

    const data = await response.json() as ListModelsResponse | Array<string | ProviderModel | null>;
    const rawModels = Array.isArray(data) ? data : (Array.isArray(data?.models) ? data.models : []);
    return rawModels
        .filter((item): item is string | ProviderModel => item != null)
        .map((item) => {
            if (typeof item === "string") {
                return {name: item, id: 0};
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
                return name
                    ? {
                          name,
                          id: finalId,
                          kind: item.kind ?? null,
                          is_default: item.is_default ?? null,
                          display_name: item.display_name ?? null,
                          languages: Array.isArray(item.languages) ? item.languages : null,
                      }
                    : {name: "", id: 0};
            }

            return {name: "", id: 0};
        })
        .filter((model) => Boolean(model.name));
}

export async function getModelData(provider?: string | number | null): Promise<AllModelsResponse | null> {
    const providers = providerToName(provider)
        ? [providerToName(provider)!]
        : ["openai", "mistral", "google"];
    const responses = await Promise.all(providers.map((providerName) => authFetch(`/v1/model?provider=${providerName}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    })));
    const data = await Promise.all(responses.map(async (response) => {
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Ошибка сервера: ${response.status}`);
        }
        return await response.json() as AllModelsResponse;
    }));
    return {
        models: Object.assign({}, ...data.map((item) => item?.models ?? {})),
        active_provider: data.find((item) => item?.active_provider)?.active_provider ?? null,
    };
}

export function extractAllModels(data: AllModelsResponse | null): Record<string, ModelData> {
    const models = data?.models ?? {};
    const result: Record<string, ModelData> = {};
    for (const [key, model] of Object.entries(models)) {
        const raw = model as ModelData & {voice?: unknown; create_music?: unknown};
        result[key] = {
            ...raw,
            // Сервер отдаёт json-поля `voice` (backend'ы числами) и `create_music`.
            Voice: normalizeVoiceConfig(raw.voice ?? raw.Voice),
            CreateMusic: Boolean(raw.create_music ?? raw.CreateMusic),
        };
    }
    return result;
}

export function getActiveProviderName(data: AllModelsResponse | null): string | null {
    return data?.active_provider ?? null;
}

// ─── saveModelData ────────────────────────────────────────────────────────────

export const saveModelData = async ({
    values,
    isUpdate = false,
    provider = null,
    useModelName = null,
}: SaveModelParams): Promise<SaveModelResult> => {
    const endpoint = isUpdate ? "/v1/model/update" : "/v1/model/create";
    const providerName = providerToName(provider);
    const providerParam = providerName ? `?provider=${providerName}` : "";

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

        const resolvedModelName = normalizeGptType(useModelName?.gpttype ?? values.gpttype);
        const resolvedRealtimeModelName = normalizeGptType(useModelName?.realtime ?? values.realtime_gpttype);

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
        if (provider !== "mistral" && Boolean(values.realtime) && values.realtime_vad) {
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

        // ── Mistral Realtime ─────────────────────────────────────────────────
        const mistralContainer = values.realtime_vad as any;
        const mistralFormValue = mistralContainer && Object.prototype.hasOwnProperty.call(mistralContainer, "realtime_vad")
            ? mistralContainer.realtime_vad
            : mistralContainer;
        const mistralVadResult: MistralRealtimeVAD | null = provider === "mistral" && mistralFormValue
            ? (mistralFormValue.mistral || mistralFormValue)
            : null;
        const mistralCommonFields = mistralVadResult
            ? {
                  ...(mistralVadResult.initial_greeting != null ? {initial_greeting: mistralVadResult.initial_greeting} : {}),
                  ...(mistralVadResult.greeting != null ? {greeting: mistralVadResult.greeting} : {}),
              }
            : {};

        // realtime_vad объединяет OpenAI-поля, общие поля Google и вложенный google-блок
        const realtimeVadPayload =
            openaiVadResult || googleVadResult || mistralVadResult
                ? {
                      ...(openaiVadResult ?? {}),
                      ...(googleVadResult ? { ...googleCommonFields, google: googleVadResult } : {}),
                      ...(mistralVadResult ? {
                          ...mistralCommonFields,
                          mistral: (() => {
                              const {initial_greeting: _initialGreeting, greeting: _greeting, ...mistral} = mistralVadResult;
                              return mistral;
                          })(),
                      } : {}),
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
            // Поле формы остаётся gpttype для совместимости с Form.Item,
            // но API хранит обычную и realtime-модели раздельно.
            use_model_name: {
                // Обе модели сохраняются одновременно: realtime не заменяет general.
                gpttype: resolvedModelName ?? null,
                realtime: provider === "mistral"
                    ? null
                    : (Boolean(values.realtime) || googleRtEnabled ? (resolvedRealtimeModelName ?? null) : null),
            },
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
                realtime: Boolean(values.realtime) || googleRtEnabled || Boolean(mistralVadResult),
            // Объединённый VAD (OpenAI-поля + общие поля + google-блок)
            realtime_vad: realtimeVadPayload,
            // Выбор голосового провайдера (ElevenLabs): comdom.VoiceConfig.
            voice: buildVoicePayload(values.Voice),
            // MCP-инструмент генерации музыки.
            create_music: Boolean(values.CreateMusic),
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
        const providerName = providerToName(provider);
        if (!providerName) {
            return { status: "error", error: "Неизвестный провайдер" };
        }
        const url = `/v1/model/set-active?provider=${providerName}`;
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

// ─── checkHayModel ────────────────────────────────────────────────────────────────
// CheckDemoResult тот же самый ответ BOOL поэтому так
export async function checkHayModel(): Promise<CheckDemoResult> {
    try {
        const response = await authFetch(`/v1/model/fast-chek`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(`Ошибка при проверке наличия модели: ${response.status}`, errorData);
            return { success: false, error: errorData.error || `HTTP ${response.status}` };
        }

        const result = await response.json();
        return { success: true, status: result.status };
    } catch (error: unknown) {
        console.error("Ошибка при проверке наличия модели:", error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}
