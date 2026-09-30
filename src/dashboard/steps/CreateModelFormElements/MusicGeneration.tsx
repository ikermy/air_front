import React, {useCallback, useEffect, useMemo, useState} from "react";
import {Button, Checkbox, Form, Input, InputNumber, Radio, Select, Space, Switch} from "antd";
import {AudioOutlined, CustomerServiceOutlined, DeleteOutlined, PlusOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import {type GptTypeValue, type VoiceSelection} from "./modUtils";
import {fetchVoiceSettings} from "./providersUtils";

interface MusicGenerationProps {
    /** Уведомляет родителя об изменении Voice/CreateMusic (setFieldsValue не вызывает onValuesChange). */
    onChange?: (changedValues: Record<string, unknown>) => void;
}

interface MusicChunk {
    text: string;
    duration_ms: number;
}

const DEFAULT_MUSIC_MODEL = "music_v1";

const FALLBACK_MUSIC_MODELS = ["music_v2_5", "music_v2", DEFAULT_MUSIC_MODEL];

const FORMAT_OPTIONS = [
    "auto",
    "mp3_44100_128",
    "mp3_44100_192",
    "mp3_44100_96",
    "pcm_44100",
    "pcm_16000",
    "mp3_22050_32",
];

const isElevenLabs = (value: unknown): boolean => String(value ?? "").toLowerCase() === "elevenlabs";

/**
 * Самостоятельный блок формы «Генерация музыки».
 * Флаг create_music включает MCP-инструмент; параметры хранятся в
 * UniversalModelData.Voice.music (model/format/length_ms/force_instrumental/
 * seed/composition_plan), см. план §4.5.
 */
export const MusicGeneration: React.FC<MusicGenerationProps> = ({onChange}) => {
    const {t} = useTranslation();
    const form = Form.useFormInstance();
    // preserve: true — поля Voice/CreateMusic не зарегистрированы через Form.Item.
    const createMusic = Boolean(Form.useWatch("CreateMusic", {form, preserve: true}));
    const voice = Form.useWatch("Voice", {form, preserve: true}) as VoiceSelection | null | undefined;

    const [available, setAvailable] = useState(false);
    const [models, setModels] = useState<GptTypeValue[]>([]);
    const [loading, setLoading] = useState(false);

    // Один запрос: доступность + музыкальные модели.
    const loadCatalogs = useCallback(async () => {
        setLoading(true);
        try {
            const result = await fetchVoiceSettings("elevenlabs");
            const data = result.data;
            setAvailable(Boolean(data?.available));
            setModels(((data?.models ?? [])
                .filter((model) => model.kind === "music")
                .map((model) => ({
                    name: model.name ?? model.Name ?? "",
                    id: (model.Id ?? 0) as number,
                    kind: model.kind ?? null,
                    is_default: model.is_default ?? null,
                    display_name: model.display_name ?? null,
                    languages: Array.isArray(model.languages) ? model.languages : null,
                }))
                .filter((model) => model.name)) as GptTypeValue[]);
        } catch {
            setAvailable(false);
            setModels([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadCatalogs();
    }, [loadCatalogs]);

    const music = (voice?.music ?? null) as Record<string, any> | null;
    const planChunks: MusicChunk[] = Array.isArray(music?.composition_plan?.chunks)
        ? (music?.composition_plan?.chunks as MusicChunk[])
        : [];
    const mode: "prompt" | "composition_plan" = planChunks.length > 0 ? "composition_plan" : "prompt";

    const modelOptions = useMemo(() => {
        const list = models.length > 0 ? models.map((item) => item.name) : FALLBACK_MUSIC_MODELS;
        return Array.from(new Set([...list, music?.model].filter(Boolean) as string[]))
            .map((name) => ({label: name, value: name}));
    }, [models, music?.model]);

    const formatOptions = useMemo(
        () => FORMAT_OPTIONS.map((value) => ({label: value, value})),
        [],
    );

    const updateMusic = (patch: Record<string, unknown>) => {
        const stored = (form.getFieldValue("Voice") as VoiceSelection | null | undefined) ?? {};
        const nextVoice: VoiceSelection = {
            ...(stored && typeof stored === "object" ? stored : {}),
            music_backend: "elevenlabs",
            music: {...(stored?.music ?? {}), ...patch},
        };
        form.setFieldsValue({Voice: nextVoice});
        onChange?.({Voice: nextVoice});
    };

    const handleToggle = (next: boolean) => {
        if (!available) return;
        const stored = (form.getFieldValue("Voice") as VoiceSelection | null | undefined) ?? {};
        const nextVoice: VoiceSelection = {...(stored && typeof stored === "object" ? stored : {})};
        if (next) {
            nextVoice.music_backend = "elevenlabs";
            nextVoice.music = {
                ...(nextVoice.music && typeof nextVoice.music === "object" ? nextVoice.music : {}),
                model: nextVoice.music?.model || DEFAULT_MUSIC_MODEL,
            };
        } else {
            nextVoice.music_backend = null;
            nextVoice.music = null;
        }
        form.setFieldsValue({CreateMusic: next});
        form.setFieldsValue({Voice: nextVoice});
        onChange?.({CreateMusic: next, Voice: nextVoice});
    };

    const setMode = (value: "prompt" | "composition_plan") => {
        if (value === "composition_plan") {
            const chunks = planChunks.length > 0 ? planChunks : [{text: "", duration_ms: 30000}];
            updateMusic({composition_plan: {chunks}});
        } else {
            updateMusic({composition_plan: null});
        }
    };

    const updateChunk = (index: number, patch: Partial<MusicChunk>) => {
        const chunks = planChunks.map((chunk, i) => (i === index ? {...chunk, ...patch} : chunk));
        updateMusic({composition_plan: {chunks}});
    };

    const addChunk = () => {
        if (planChunks.length >= 30) return;
        updateMusic({composition_plan: {chunks: [...planChunks, {text: "", duration_ms: 30000}]}});
    };

    const removeChunk = (index: number) => {
        const chunks = planChunks.filter((_, i) => i !== index);
        updateMusic({composition_plan: {chunks: chunks.length > 0 ? chunks : [{text: "", duration_ms: 30000}]}});
    };

    const musicOn = createMusic && (isElevenLabs(voice?.music_backend) || Boolean(music));

    return (
        <div>
            <div className="section-title">
                <AudioOutlined/> {t("voiceCreateMusic") || "Генерация музыки"}
            </div>
            <div className="section-description">
                {t("musicGenerationDesc") || "Агент сможет генерировать музыку по запросу пользователя (инструмент generate_music)."}
            </div>
            <div className="step">
                <span>
                    {!available && <CustomerServiceOutlined style={{marginRight: 6}}/>}
                    {t("musicGenerationEnable") || "Включить генерацию музыки"}
                </span>
                <Switch
                    checked={createMusic && available}
                    disabled={!available}
                    onChange={handleToggle}
                    checkedChildren={<span style={{color: "black"}}>{t("Yes") || "Да"}</span>}
                    unCheckedChildren={<span style={{color: "black"}}>{t("No") || "Нет"}</span>}
                />
            </div>

            {available && musicOn && (
                <Form layout="vertical" style={{marginTop: 12, maxWidth: 520}}>
                    <Form.Item label={t("voiceMusicModel") || "Модель генерации музыки"}>
                        <Select
                            showSearch
                            optionFilterProp="label"
                            loading={loading}
                            value={music?.model ?? DEFAULT_MUSIC_MODEL}
                            options={modelOptions}
                            onChange={(value) => updateMusic({model: value ?? null})}
                        />
                    </Form.Item>
                    <Form.Item label={t("musicFormat") || "Формат аудио"}>
                        <Select
                            allowClear
                            value={music?.format ?? undefined}
                            options={formatOptions}
                            placeholder={t("musicFormatAuto") || "auto (по умолчанию)"}
                            onChange={(value) => updateMusic({format: value ?? null})}
                        />
                    </Form.Item>

                    <Form.Item label={t("musicMode") || "Режим генерации"}>
                        <Radio.Group
                            value={mode}
                            onChange={(event) => setMode(event.target.value)}
                            options={[
                                {label: t("musicModePrompt") || "По описанию (prompt)", value: "prompt"},
                                {label: t("musicModePlan") || "По плану композиции", value: "composition_plan"},
                            ]}
                        />
                    </Form.Item>

                    {mode === "prompt" ? (
                        <>
                            <Form.Item label={t("musicLength") || "Длительность, мс"}>
                                <InputNumber
                                    min={3000}
                                    max={600000}
                                    step={1000}
                                    style={{width: 200}}
                                    value={music?.length_ms ?? undefined}
                                    placeholder="30000"
                                    onChange={(value) => updateMusic({length_ms: value ?? null})}
                                />
                            </Form.Item>
                            <Form.Item>
                                <Checkbox
                                    checked={Boolean(music?.force_instrumental)}
                                    onChange={(event) => updateMusic({force_instrumental: event.target.checked})}
                                >
                                    {t("musicInstrumental") || "Только инструментал (без вокала)"}
                                </Checkbox>
                            </Form.Item>
                        </>
                    ) : (
                        <>
                            <div className="section-description" style={{margin: "8px 0"}}>
                                {t("musicChunks") || "Секции композиции"}
                            </div>
                            {planChunks.map((chunk, index) => (
                                <Space key={index} align="start" style={{display: "flex", marginBottom: 8}}>
                                    <Input
                                        style={{width: 320}}
                                        placeholder={t("musicChunkText") || "Описание секции"}
                                        value={chunk.text}
                                        onChange={(event) => updateChunk(index, {text: event.target.value})}
                                    />
                                    <InputNumber
                                        min={3000}
                                        max={120000}
                                        step={1000}
                                        style={{width: 140}}
                                        value={chunk.duration_ms}
                                        onChange={(value) => updateChunk(index, {duration_ms: value ?? 3000})}
                                    />
                                    <Button
                                        danger
                                        type="text"
                                        icon={<DeleteOutlined/>}
                                        onClick={() => removeChunk(index)}
                                    />
                                </Space>
                            ))}
                            <Button
                                icon={<PlusOutlined/>}
                                disabled={planChunks.length >= 30}
                                onClick={addChunk}
                            >
                                {t("musicAddChunk") || "Добавить секцию"}
                            </Button>
                            <Form.Item label={t("musicSeed") || "Seed (только для плана)"} style={{marginTop: 12}}>
                                <InputNumber
                                    min={0}
                                    max={2147483647}
                                    style={{width: 200}}
                                    value={music?.seed ?? undefined}
                                    onChange={(value) => updateMusic({seed: value ?? null})}
                                />
                            </Form.Item>
                        </>
                    )}
                </Form>
            )}
        </div>
    );
};
