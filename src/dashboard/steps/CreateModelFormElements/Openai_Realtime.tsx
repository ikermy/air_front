import React, { useEffect, useState } from "react";
import { Switch, Slider, InputNumber, Tooltip, Collapse, Input, Select, Form } from "antd";
import type { CollapseProps } from "antd";
import { AudioOutlined, SettingOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import "./Espero.css";
import {TypesGPT} from "./TypesGPT";

export interface RealtimeVADValue {
    threshold?: number | null;
    prefix_padding_ms?: number | null;
    silence_duration_ms?: number | null;
    interrupt_response?: boolean | null;
    temperature?: number | null;
    max_response_output_tokens?: number | string | null; // сервер отдаёт число или "inf"
    input_audio_transcription?: boolean | null; // дефолт true
    initial_greeting?: boolean | null;          // дефолт true
    greeting?: string | null;                   // nil → дефолт из промпта
    voice?: string | null; // имя голоса: verse, echo, alloy, shimmer, fable, onyx (дефолт verse)
}

    interface OpenaiRealtimeProps {
    onChange?: (value: { realtime: boolean; realtime_vad: RealtimeVADValue | null }) => void;
    toForm?: any;
    initialRealtime?: boolean;
    initialRealtimeVAD?: RealtimeVADValue | null;
    provider?: string | null;
}

const DEFAULT_VAD: RealtimeVADValue = {
    threshold: 0.5,
    prefix_padding_ms: 200,
    silence_duration_ms: 500,
    interrupt_response: true,
    temperature: 0.8,
    max_response_output_tokens: null,
    input_audio_transcription: true,
    initial_greeting: true,
    greeting: null,
};

export const Openai_Realtime: React.FC<OpenaiRealtimeProps> = ({
    onChange,
    toForm,
    initialRealtime,
    initialRealtimeVAD,
    provider,
}) => {
    const { t } = useTranslation();

    const [realtimeEnabled, setRealtimeEnabled] = useState<boolean>(false);
    const [threshold, setThreshold] = useState<number>(DEFAULT_VAD.threshold!);
    const [prefixPaddingMs, setPrefixPaddingMs] = useState<number>(DEFAULT_VAD.prefix_padding_ms!);
    const [silenceDurationMs, setSilenceDurationMs] = useState<number>(DEFAULT_VAD.silence_duration_ms!);
    const [interruptResponse, setInterruptResponse] = useState<boolean>(DEFAULT_VAD.interrupt_response!);
    const [temperature, setTemperature] = useState<number>(DEFAULT_VAD.temperature!);
    const [useInfTokens, setUseInfTokens] = useState<boolean>(true);
    const [maxTokens, setMaxTokens] = useState<number>(4096);
    const [inputAudioTranscription, setInputAudioTranscription] = useState<boolean>(true);
    const [initialGreeting, setInitialGreeting] = useState<boolean>(true);
    const [greeting, setGreeting] = useState<string>("");
    const [voice, setVoice] = useState<string>("verse");

    // Инициализация при загрузке
    useEffect(() => {
        const rtEnabled = typeof initialRealtime === "boolean" ? initialRealtime : false;
        setRealtimeEnabled(rtEnabled);

        if (initialRealtimeVAD) {
            setThreshold(initialRealtimeVAD.threshold ?? DEFAULT_VAD.threshold!);
            setPrefixPaddingMs(initialRealtimeVAD.prefix_padding_ms ?? DEFAULT_VAD.prefix_padding_ms!);
            setSilenceDurationMs(initialRealtimeVAD.silence_duration_ms ?? DEFAULT_VAD.silence_duration_ms!);
            setInterruptResponse(initialRealtimeVAD.interrupt_response ?? DEFAULT_VAD.interrupt_response!);
            setTemperature(initialRealtimeVAD.temperature ?? DEFAULT_VAD.temperature!);
            setInputAudioTranscription(initialRealtimeVAD.input_audio_transcription ?? true);
            setInitialGreeting(initialRealtimeVAD.initial_greeting ?? true);
            setGreeting(initialRealtimeVAD.greeting ?? "");
            setVoice(initialRealtimeVAD.voice ?? "verse");

            const mrt = initialRealtimeVAD.max_response_output_tokens;
            // сервер отдаёт "inf" (строка) или число; 0 / "inf" / null = без ограничений
            if (mrt == null || mrt === 0 || mrt === "inf") {
                setUseInfTokens(true);
            } else {
                setUseInfTokens(false);
                setMaxTokens(Number(mrt));
            }
        }

        if (toForm) {
            toForm.setFieldsValue({
                realtime: rtEnabled,
                realtime_vad: buildVAD({
                    thr: initialRealtimeVAD?.threshold ?? DEFAULT_VAD.threshold!,
                    ppms: initialRealtimeVAD?.prefix_padding_ms ?? DEFAULT_VAD.prefix_padding_ms!,
                    sdms: initialRealtimeVAD?.silence_duration_ms ?? DEFAULT_VAD.silence_duration_ms!,
                    intResp: initialRealtimeVAD?.interrupt_response ?? DEFAULT_VAD.interrupt_response!,
                    temp: initialRealtimeVAD?.temperature ?? DEFAULT_VAD.temperature!,
                    maxTok: (() => { const mrt = initialRealtimeVAD?.max_response_output_tokens; return (mrt == null || mrt === 0 || mrt === "inf") ? 0 : Number(mrt); })(),
                    iat: initialRealtimeVAD?.input_audio_transcription ?? true,
                    ig: initialRealtimeVAD?.initial_greeting ?? true,
                    gr: initialRealtimeVAD?.greeting ?? null,
                    v: initialRealtimeVAD?.voice ?? "verse",
                }),
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialRealtime, initialRealtimeVAD]);

    interface BuildVADParams {
        thr: number; ppms: number; sdms: number; intResp: boolean;
        temp: number; maxTok: number;
        iat: boolean; ig: boolean; gr: string | null; v: string;
    }

    const buildVAD = ({ thr, ppms, sdms, intResp, temp, maxTok, iat, ig, gr, v }: BuildVADParams): RealtimeVADValue => ({
        threshold: thr,
        prefix_padding_ms: ppms,
        silence_duration_ms: sdms,
        interrupt_response: intResp,
        temperature: temp,
        max_response_output_tokens: maxTok,
        input_audio_transcription: iat,
        initial_greeting: ig,
        greeting: gr || null,
        voice: v,
    });

    const notifyChange = (params: BuildVADParams & { rtEnabled: boolean }) => {
        const { rtEnabled, ...vadParams } = params;
        const vadValue = buildVAD(vadParams);
        const formValue = {
            realtime: rtEnabled,
            realtime_vad: rtEnabled ? vadValue : null,
        };
        if (typeof onChange === "function") onChange(formValue);
    };

    const currentParams = () => ({
        rtEnabled: realtimeEnabled,
        thr: threshold, ppms: prefixPaddingMs, sdms: silenceDurationMs,
        intResp: interruptResponse, temp: temperature,
        maxTok: useInfTokens ? 0 : maxTokens,
        iat: inputAudioTranscription, ig: initialGreeting,
        gr: greeting || null,
        v: voice,
    });

    const handleRealtimeChange = (checked: boolean) => {
        setRealtimeEnabled(checked);
        notifyChange({ ...currentParams(), rtEnabled: checked });
    };
    const handleThresholdChange = (val: number) => {
        setThreshold(val);
        notifyChange({ ...currentParams(), thr: val });
    };
    const handlePrefixPaddingChange = (val: number | null) => {
        const v = val ?? DEFAULT_VAD.prefix_padding_ms!;
        setPrefixPaddingMs(v);
        notifyChange({ ...currentParams(), ppms: v });
    };
    const handleSilenceDurationChange = (val: number | null) => {
        const v = val ?? DEFAULT_VAD.silence_duration_ms!;
        setSilenceDurationMs(v);
        notifyChange({ ...currentParams(), sdms: v });
    };
    const handleInterruptChange = (checked: boolean) => {
        setInterruptResponse(checked);
        notifyChange({ ...currentParams(), intResp: checked });
    };
    const handleTemperatureChange = (val: number) => {
        setTemperature(val);
        notifyChange({ ...currentParams(), temp: val });
    };
    const handleUseInfChange = (checked: boolean) => {
        setUseInfTokens(checked);
        notifyChange({ ...currentParams(), maxTok: checked ? 0 : maxTokens });
    };
    const handleMaxTokensChange = (val: number | null) => {
        const v = val ?? 4096;
        setMaxTokens(v);
        notifyChange({ ...currentParams(), maxTok: useInfTokens ? 0 : v });
    };
    const handleInputAudioTranscriptionChange = (checked: boolean) => {
        setInputAudioTranscription(checked);
        notifyChange({ ...currentParams(), iat: checked });
    };
    const handleInitialGreetingChange = (checked: boolean) => {
        setInitialGreeting(checked);
        notifyChange({ ...currentParams(), ig: checked });
    };
    const handleGreetingChange = (val: string) => {
        setGreeting(val);
        notifyChange({
            rtEnabled: realtimeEnabled,
            thr: threshold, ppms: prefixPaddingMs, sdms: silenceDurationMs,
            intResp: interruptResponse, temp: temperature,
            maxTok: useInfTokens ? 0 : maxTokens,
            iat: inputAudioTranscription, ig: initialGreeting,
            gr: val || null,
            v: voice,
        } as BuildVADParams & { rtEnabled: boolean });
    };
    const handleVoiceChange = (val: string) => {
        setVoice(val);
        notifyChange({
            rtEnabled: realtimeEnabled,
            thr: threshold, ppms: prefixPaddingMs, sdms: silenceDurationMs,
            intResp: interruptResponse, temp: temperature,
            maxTok: useInfTokens ? 0 : maxTokens,
            iat: inputAudioTranscription, ig: initialGreeting,
            gr: greeting || null,
            v: val,
        } as BuildVADParams & { rtEnabled: boolean });
    };

    const collapseItems: CollapseProps["items"] = [
        {
            key: "voice-settings",
            label: (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <AudioOutlined />
                    {t("realtimeVoiceSettingsTitle") || "Выбор голоса"}
                </span>
            ),
            children: (
                <div className="espero-channel-item" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div className="espero-form-item">
                        <div className="espero-form-label">
                            {t("realtimeVoiceLabel") || "Голос модели"}
                            <Tooltip title={t("realtimeVoiceTip") || "Выберите голос для генерации речи модели"}>
                                <InfoCircleOutlined style={{ color: "#999", marginLeft: 6 }} />
                            </Tooltip>
                        </div>
                        <Select
                            value={voice}
                            onChange={handleVoiceChange}
                            disabled={!realtimeEnabled}
                            style={{ width: "100%" }}
                            options={[
                                { label: `${t("realtimeVoiceVerse") || "Verse"} - ${t("realtimeVoiceVerseDesc") || "тёплый, естественный голос"}`, value: "verse" },
                                { label: `${t("realtimeVoiceAlloy") || "Alloy"} - ${t("realtimeVoiceAlloyDesc") || "молодой, дружеский голос"}`, value: "alloy" },
                                { label: `${t("realtimeVoiceEcho") || "Echo"} - ${t("realtimeVoiceEchoDesc") || "чёткий, профессиональный голос"}`, value: "echo" },
                                { label: `${t("realtimeVoiceShimmer") || "Shimmer"} - ${t("realtimeVoiceShimmerDesc") || "яркий, энергичный голос"}`, value: "shimmer" },
                                { label: `${t("realtimeVoiceAsh") || "Ash"} - ${t("realtimeVoiceAshDesc") || "спокойный, вдохновляющий голос"}`, value: "ash" },
                                { label: `${t("realtimeVoiceBallad") || "Ballad"} - ${t("realtimeVoiceBalladDesc") || "выразительный, музыкальный голос"}`, value: "ballad" },
                                { label: `${t("realtimeVoiceCoral") || "Coral"} - ${t("realtimeVoiceCoralDesc") || "тёплый, приветливый голос"}`, value: "coral" },
                                { label: `${t("realtimeVoiceSage") || "Sage"} - ${t("realtimeVoiceSageDesc") || "мудрый, задумчивый голос"}`, value: "sage" },
                                { label: `${t("realtimeVoiceMarin") || "Marin"} - ${t("realtimeVoiceMarinDesc") || "живой, динамичный голос"}`, value: "marin" },
                                { label: `${t("realtimeVoiceCedar") || "Cedar"} - ${t("realtimeVoiceCedarDesc") || "глубокий, авторитетный голос"}`, value: "cedar" },
                            ]}
                        />
                    </div>
                </div>
            ),
        },
        {
            key: "greeting-settings",
            label: (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <AudioOutlined />
                    {t("realtimeGreetingSettingsTitle") || "Приветствие и транскрипция"}
                </span>
            ),
            children: (
                <div className="espero-channel-item" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {/* Input audio transcription */}
                    <div className="espero-form-item">
                        <div className="espero-switch-container">
                            <div className="espero-switch-label">
                                {t("realtimeInputAudioTranscriptionLabel") || "Транскрибировать речь в текст"}
                                <Tooltip title={t("realtimeInputAudioTranscriptionTip") || "Входящая речь пользователя транскрибируется в текст для сохранения истории диалога в базе данных. По умолчанию: включено"}>
                                    <InfoCircleOutlined style={{ color: "#999", marginLeft: 6 }} />
                                </Tooltip>
                            </div>
                            <Switch checked={inputAudioTranscription} onChange={handleInputAudioTranscriptionChange}
                                disabled={!realtimeEnabled}
                                checkedChildren={<span style={{ color: "black" }}>{t("Yes") || "Да"}</span>}
                                unCheckedChildren={<span style={{ color: "black" }}>{t("No") || "Нет"}</span>} />
                        </div>
                    </div>

                    {/* Initial greeting */}
                    <div className="espero-form-item">
                        <div className="espero-switch-container">
                            <div className="espero-switch-label">
                                {t("realtimeInitialGreetingLabel") || "Приветствие при начале диалога"}
                                <Tooltip title={t("realtimeInitialGreetingTip") || "Модель отвечает до первого сообщения пользователя — произносит приветствие. По умолчанию: включено"}>
                                    <InfoCircleOutlined style={{ color: "#999", marginLeft: 6 }} />
                                </Tooltip>
                            </div>
                            <Switch checked={initialGreeting} onChange={handleInitialGreetingChange}
                                disabled={!realtimeEnabled}
                                checkedChildren={<span style={{ color: "black" }}>{t("Yes") || "Да"}</span>}
                                unCheckedChildren={<span style={{ color: "black" }}>{t("No") || "Нет"}</span>} />
                        </div>
                    </div>

                    {/* Greeting text */}
                    {initialGreeting && (
                        <div className="espero-form-item">
                            <div className="espero-form-label">
                                {t("realtimeGreetingLabel") || "Текст приветствия"}
                                <Tooltip title={t("realtimeGreetingTip") || "Явная фраза приветствия. Если не задана — модель сформирует приветствие самостоятельно на основе системного промпта."}>
                                    <InfoCircleOutlined style={{ color: "#999", marginLeft: 6 }} />
                                </Tooltip>
                            </div>
                            <Input.TextArea
                                value={greeting}
                                onChange={(e) => handleGreetingChange(e.target.value)}
                                disabled={!realtimeEnabled}
                                placeholder={t("realtimeGreetingPlaceholder") || "Оставьте пустым, чтобы использовать приветствие из промпта"}
                                autoSize={{ minRows: 2, maxRows: 5 }}
                                style={{ marginTop: 4 }}
                            />
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: "vad-settings",
            label: (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <SettingOutlined />
                    {t("realtimeVADSettingsTitle") || "Параметры VAD и генерации"}
                </span>
            ),
            children: (
                <div className="espero-channel-item" style={{ display: "flex", flexDirection: "column", gap: 4 }}>

                    {/* Threshold */}
                    <div className="espero-form-item">
                        <div className="espero-form-label">
                            {t("realtimeThresholdLabel") || "Порог срабатывания VAD"}
                            <Tooltip title={t("realtimeThresholdTip") || "Чувствительность детектора речи: 0.0 — очень чувствительный, 1.0 — слабая чувствительность. По умолчанию: 0.5"}>
                                <InfoCircleOutlined style={{ color: "#999", marginLeft: 6 }} />
                            </Tooltip>
                        </div>
                        <div className="espero-slider-container">
                            <div className="espero-slider-row">
                                <Slider className="espero-slider" min={0} max={1} step={0.05} value={threshold}
                                    onChange={handleThresholdChange} disabled={!realtimeEnabled}
                                    tooltip={{ formatter: (v) => v?.toFixed(2) }} />
                                <InputNumber className="espero-input-number" min={0} max={1} step={0.05}
                                    value={threshold} onChange={(v) => handleThresholdChange(v ?? DEFAULT_VAD.threshold!)}
                                    disabled={!realtimeEnabled} precision={2} />
                            </div>
                        </div>
                    </div>

                    {/* Prefix padding ms */}
                    <div className="espero-form-item">
                        <div className="espero-form-label">
                            {t("realtimePrefixPaddingLabel") || "Отступ перед речью (мс)"}
                            <Tooltip title={t("realtimePrefixPaddingTip") || "Количество миллисекунд аудио перед началом речи, включаемых в транскрипцию. По умолчанию: 200 мс"}>
                                <InfoCircleOutlined style={{ color: "#999", marginLeft: 6 }} />
                            </Tooltip>
                        </div>
                        <div className="espero-slider-container">
                            <div className="espero-slider-row">
                                <Slider className="espero-slider" min={0} max={2000} step={50} value={prefixPaddingMs}
                                    onChange={(v) => handlePrefixPaddingChange(v)} disabled={!realtimeEnabled}
                                    tooltip={{ formatter: (v) => `${v} мс` }} />
                                <InputNumber className="espero-input-number" min={0} max={2000} step={50}
                                    value={prefixPaddingMs} onChange={handlePrefixPaddingChange}
                                    disabled={!realtimeEnabled} addonAfter="мс" />
                            </div>
                        </div>
                    </div>

                    {/* Silence duration ms */}
                    <div className="espero-form-item">
                        <div className="espero-form-label">
                            {t("realtimeSilenceDurationLabel") || "Длительность тишины для конца фразы (мс)"}
                            <Tooltip title={t("realtimeSilenceDurationTip") || "Сколько миллисекунд тишины считается концом фразы. По умолчанию: 500 мс"}>
                                <InfoCircleOutlined style={{ color: "#999", marginLeft: 6 }} />
                            </Tooltip>
                        </div>
                        <div className="espero-slider-container">
                            <div className="espero-slider-row">
                                <Slider className="espero-slider" min={100} max={3000} step={100} value={silenceDurationMs}
                                    onChange={(v) => handleSilenceDurationChange(v)} disabled={!realtimeEnabled}
                                    tooltip={{ formatter: (v) => `${v} мс` }} />
                                <InputNumber className="espero-input-number" min={100} max={3000} step={100}
                                    value={silenceDurationMs} onChange={handleSilenceDurationChange}
                                    disabled={!realtimeEnabled} addonAfter="мс" />
                            </div>
                        </div>
                    </div>

                    {/* Interrupt response */}
                    <div className="espero-form-item">
                        <div className="espero-switch-container">
                            <div className="espero-form-label">
                                {t("realtimeInterruptLabel") || "Прерывать ответ при речи пользователя"}
                                <Tooltip title={t("realtimeInterruptTip") || "Если включено — модель прекращает генерацию ответа, когда пользователь начинает говорить. По умолчанию: включено"}>
                                    <InfoCircleOutlined style={{ color: "#999", marginLeft: 6 }} />
                                </Tooltip>
                            </div>
                            <Switch checked={interruptResponse} onChange={handleInterruptChange}
                                disabled={!realtimeEnabled}
                                checkedChildren={<span style={{ color: "black" }}>{t("Yes") || "Да"}</span>}
                                unCheckedChildren={<span style={{ color: "black" }}>{t("No") || "Нет"}</span>} />
                        </div>
                    </div>

                    {/* Temperature */}
                    <div className="espero-form-item">
                        <div className="espero-form-label">
                            {t("realtimeTemperatureLabel") || "Температура генерации"}
                            <Tooltip title={t("realtimeTemperatureTip") || "Случайность ответов модели: 0.6 — более детерминировано, 1.2 — более креативно. По умолчанию: 0.8"}>
                                <InfoCircleOutlined style={{ color: "#999", marginLeft: 6 }} />
                            </Tooltip>
                        </div>
                        <div className="espero-slider-container">
                            <div className="espero-slider-row">
                                <Slider className="espero-slider" min={0.6} max={1.2} step={0.05} value={temperature}
                                    onChange={handleTemperatureChange} disabled={!realtimeEnabled}
                                    tooltip={{ formatter: (v) => v?.toFixed(2) }} />
                                <InputNumber className="espero-input-number" min={0.6} max={1.2} step={0.05}
                                    value={temperature} onChange={(v) => handleTemperatureChange(v ?? DEFAULT_VAD.temperature!)}
                                    disabled={!realtimeEnabled} precision={2} />
                            </div>
                        </div>
                    </div>

                    {/* Max response output tokens */}
                    <div className="espero-form-item">
                        <div className="espero-form-label">
                            {t("realtimeMaxTokensLabel") || "Максимум токенов в ответе"}
                            <Tooltip title={t("realtimeMaxTokensTip") || "Максимальное количество токенов в одном ответе. «inf» означает без ограничений."}>
                                <InfoCircleOutlined style={{ color: "#999", marginLeft: 6 }} />
                            </Tooltip>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                            <Switch checked={useInfTokens} onChange={handleUseInfChange} disabled={!realtimeEnabled}
                                checkedChildren={<span style={{ color: "black" }}>inf</span>}
                                unCheckedChildren={<span style={{ color: "black" }}>{t("realtimeMaxTokensFixed") || "Число"}</span>} />
                            {!useInfTokens && (
                                <InputNumber className="espero-input-number" min={200} max={16384} step={256}
                                    value={maxTokens} onChange={handleMaxTokensChange} disabled={!realtimeEnabled} />
                            )}
                            <span style={{ color: "#888", fontSize: 13 }}>
                                {useInfTokens
                                    ? (t("realtimeMaxTokensInfHint") || "Без ограничений")
                                    : `${maxTokens} ${t("realtimeMaxTokensUnit") || "токенов"}`}
                            </span>
                        </div>
                    </div>

                </div>
            ),
        },
    ];

    return (
        <>
            <div className="section-title">
                <AudioOutlined />
                {t("realtimeTitle") || "Голосовой режим (Realtime API)"}
            </div>
            <div className="section-description">
                {t("realtimeDesc") || "Включает режим реального времени OpenAI Realtime API для голосового взаимодействия с агентом. Поддерживает потоковую передачу речи и VAD (Voice Activity Detection)."}
            </div>

            <div className="step" style={{ marginBottom: realtimeEnabled ? 16 : 0 }}>
                <span>
                    {t("realtimeEnableLabel") || "Включить голосовой режим реального времени"}&nbsp;
                </span>
                <Switch
                    checked={realtimeEnabled}
                    checkedChildren={<span style={{ color: "black" }}>{t("Yes") || "Да"}</span>}
                    unCheckedChildren={<span style={{ color: "black" }}>{t("No") || "Нет"}</span>}
                    onChange={handleRealtimeChange}
                />
            </div>

            {realtimeEnabled && (
                <>
                    <Form.Item name="realtime_gpttype" style={{marginBottom: 16}}>
                        <TypesGPT provider={provider} modelType="realtime" />
                    </Form.Item>
                    <Collapse ghost defaultActiveKey={[]} style={{ marginTop: 8 }} items={collapseItems} />
                </>
            )}
        </>
    );
};
