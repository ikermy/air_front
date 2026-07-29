import React, { useEffect, useState } from "react";
import { Switch, Slider, InputNumber, Tooltip, Collapse, Select, Input, Form } from "antd";
import type { CollapseProps } from "antd";
import { AudioOutlined, SettingOutlined, InfoCircleOutlined, TranslationOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import "./Espero.css";
import {TypesGPT} from "./TypesGPT";

export interface GoogleRealtimeVADValue {
    voice_name?: string | null;
    language_code?: string | null;
    input_audio_transcription?: boolean | null;
    output_audio_transcription?: boolean | null;
    automatic_activity_detection?: boolean | null;
    barge_in?: boolean | null;
    silence_duration_ms?: number | null;
    initial_greeting?: boolean | null;
    greeting?: string | null;
}

interface GoogleRealtimeProps {
    onChange?: (value: { google_realtime: boolean; google_realtime_vad: GoogleRealtimeVADValue | null }) => void;
    toForm?: any;
    initialRealtime?: boolean;
    initialRealtimeVAD?: GoogleRealtimeVADValue | null;
    provider?: string | null;
}

const DEFAULT_VAD: Required<GoogleRealtimeVADValue> = {
    voice_name: "Puck",
    language_code: "ru-RU",
    input_audio_transcription: true,
    output_audio_transcription: false,
    automatic_activity_detection: true,
    barge_in: true,
    silence_duration_ms: 500,
    initial_greeting: true,
    greeting: null,
};

interface BuildParams {
    vn: string;
    lc: string;
    iat: boolean;
    oat: boolean;
    aad: boolean;
    bi: boolean;
    sdms: number;
    ig: boolean;
    gr: string | null;
}

const buildVAD = ({ vn, lc, iat, oat, aad, bi, sdms, ig, gr }: BuildParams): GoogleRealtimeVADValue => ({
    voice_name: vn,
    language_code: lc,
    input_audio_transcription: iat,
    output_audio_transcription: oat,
    automatic_activity_detection: aad,
    barge_in: bi,
    silence_duration_ms: sdms,
    initial_greeting: ig,
    greeting: gr || null,
});

export const Google_Realtime: React.FC<GoogleRealtimeProps> = ({
    onChange,
    toForm,
    initialRealtime,
    initialRealtimeVAD,
    provider,
}) => {
    const { t } = useTranslation();

    const [realtimeEnabled, setRealtimeEnabled] = useState<boolean>(false);
    const [voiceName, setVoiceName] = useState<string>(DEFAULT_VAD.voice_name);
    const [languageCode, setLanguageCode] = useState<string>(DEFAULT_VAD.language_code);
    const [inputAudioTranscription, setInputAudioTranscription] = useState<boolean>(DEFAULT_VAD.input_audio_transcription);
    const [outputAudioTranscription, setOutputAudioTranscription] = useState<boolean>(DEFAULT_VAD.output_audio_transcription);
    const [automaticActivityDetection, setAutomaticActivityDetection] = useState<boolean>(DEFAULT_VAD.automatic_activity_detection);
    const [bargeIn, setBargeIn] = useState<boolean>(DEFAULT_VAD.barge_in);
    const [silenceDurationMs, setSilenceDurationMs] = useState<number>(DEFAULT_VAD.silence_duration_ms);
    const [initialGreeting, setInitialGreeting] = useState<boolean>(DEFAULT_VAD.initial_greeting);
    const [greeting, setGreeting] = useState<string>("");

    useEffect(() => {
        const rtEnabled = typeof initialRealtime === "boolean" ? initialRealtime : false;
        setRealtimeEnabled(rtEnabled);

        if (initialRealtimeVAD) {
            setVoiceName(initialRealtimeVAD.voice_name ?? DEFAULT_VAD.voice_name);
            setLanguageCode(initialRealtimeVAD.language_code ?? DEFAULT_VAD.language_code);
            setInputAudioTranscription(initialRealtimeVAD.input_audio_transcription ?? DEFAULT_VAD.input_audio_transcription);
            setOutputAudioTranscription(initialRealtimeVAD.output_audio_transcription ?? DEFAULT_VAD.output_audio_transcription);
            setAutomaticActivityDetection(initialRealtimeVAD.automatic_activity_detection ?? DEFAULT_VAD.automatic_activity_detection);
            setBargeIn(initialRealtimeVAD.barge_in ?? DEFAULT_VAD.barge_in);
            setSilenceDurationMs(initialRealtimeVAD.silence_duration_ms ?? DEFAULT_VAD.silence_duration_ms);
            setInitialGreeting(initialRealtimeVAD.initial_greeting ?? DEFAULT_VAD.initial_greeting);
            setGreeting(initialRealtimeVAD.greeting ?? "");
        }

        if (toForm) {
            toForm.setFieldsValue({
                google_realtime: rtEnabled,
                google_realtime_vad: buildVAD({
                    vn: initialRealtimeVAD?.voice_name ?? DEFAULT_VAD.voice_name,
                    lc: initialRealtimeVAD?.language_code ?? DEFAULT_VAD.language_code,
                    iat: initialRealtimeVAD?.input_audio_transcription ?? DEFAULT_VAD.input_audio_transcription,
                    oat: initialRealtimeVAD?.output_audio_transcription ?? DEFAULT_VAD.output_audio_transcription,
                    aad: initialRealtimeVAD?.automatic_activity_detection ?? DEFAULT_VAD.automatic_activity_detection,
                    bi: initialRealtimeVAD?.barge_in ?? DEFAULT_VAD.barge_in,
                    sdms: initialRealtimeVAD?.silence_duration_ms ?? DEFAULT_VAD.silence_duration_ms,
                    ig: initialRealtimeVAD?.initial_greeting ?? DEFAULT_VAD.initial_greeting,
                    gr: initialRealtimeVAD?.greeting ?? null,
                }),
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialRealtime, initialRealtimeVAD]);

    const currentParams = (): BuildParams => ({
        vn: voiceName,
        lc: languageCode,
        iat: inputAudioTranscription,
        oat: outputAudioTranscription,
        aad: automaticActivityDetection,
        bi: bargeIn,
        sdms: silenceDurationMs,
        ig: initialGreeting,
        gr: greeting || null,
    });

    const notifyChange = (params: BuildParams & { rtEnabled: boolean }) => {
        const { rtEnabled, ...vadParams } = params;
        const vadValue = buildVAD(vadParams);
        if (typeof onChange === "function") {
            onChange({
                google_realtime: rtEnabled,
                google_realtime_vad: rtEnabled ? vadValue : null,
            });
        }
    };

    const handleRealtimeChange = (checked: boolean) => {
        setRealtimeEnabled(checked);
        notifyChange({ ...currentParams(), rtEnabled: checked });
    };
    const handleVoiceNameChange = (val: string) => {
        setVoiceName(val);
        notifyChange({ ...currentParams(), rtEnabled: realtimeEnabled, vn: val });
    };
    const handleLanguageCodeChange = (val: string) => {
        setLanguageCode(val);
        notifyChange({ ...currentParams(), rtEnabled: realtimeEnabled, lc: val });
    };
    const handleInputTranscriptionChange = (checked: boolean) => {
        setInputAudioTranscription(checked);
        notifyChange({ ...currentParams(), rtEnabled: realtimeEnabled, iat: checked });
    };
    const handleOutputTranscriptionChange = (checked: boolean) => {
        setOutputAudioTranscription(checked);
        notifyChange({ ...currentParams(), rtEnabled: realtimeEnabled, oat: checked });
    };
    const handleAutoVADChange = (checked: boolean) => {
        setAutomaticActivityDetection(checked);
        notifyChange({ ...currentParams(), rtEnabled: realtimeEnabled, aad: checked });
    };
    const handleBargeInChange = (checked: boolean) => {
        setBargeIn(checked);
        notifyChange({ ...currentParams(), rtEnabled: realtimeEnabled, bi: checked });
    };
    const handleSilenceDurationChange = (val: number | null) => {
        const v = val ?? DEFAULT_VAD.silence_duration_ms;
        setSilenceDurationMs(v);
        notifyChange({ ...currentParams(), rtEnabled: realtimeEnabled, sdms: v });
    };
    const handleInitialGreetingChange = (checked: boolean) => {
        setInitialGreeting(checked);
        notifyChange({ ...currentParams(), rtEnabled: realtimeEnabled, ig: checked });
    };
    const handleGreetingChange = (val: string) => {
        setGreeting(val);
        notifyChange({ ...currentParams(), rtEnabled: realtimeEnabled, gr: val || null });
    };

    const GOOGLE_VOICES = [
        { value: "Puck",           descKey: "googleRealtimeVoicePuckDesc",           fallback: "позитивный" },
        { value: "Zephyr",         descKey: "googleRealtimeVoiceZephyrDesc",         fallback: "яркий" },
        { value: "Charon",         descKey: "googleRealtimeVoiceCharonDesc",         fallback: "информативный" },
        { value: "Kore",           descKey: "googleRealtimeVoiceKoreDesc",           fallback: "твёрдый" },
        { value: "Fenrir",         descKey: "googleRealtimeVoiceFenrirDesc",         fallback: "энергичный" },
        { value: "Leda",           descKey: "googleRealtimeVoiceLedaDesc",           fallback: "молодой" },
        { value: "Orus",           descKey: "googleRealtimeVoiceOrusDesc",           fallback: "уверенный" },
        { value: "Aoede",          descKey: "googleRealtimeVoiceAoedeDesc",          fallback: "лёгкий" },
        { value: "Callirrhoe",     descKey: "googleRealtimeVoiceCallirrhoeDesc",     fallback: "непринуждённый" },
        { value: "Autonoe",        descKey: "googleRealtimeVoiceAutonoeDesc",        fallback: "яркий, дружелюбный" },
        { value: "Enceladus",      descKey: "googleRealtimeVoiceEnceladusDesc",      fallback: "бархатистый" },
        { value: "Iapetus",        descKey: "googleRealtimeVoiceIapetusDesc",        fallback: "чёткий" },
        { value: "Umbriel",        descKey: "googleRealtimeVoiceUmbrielDesc",        fallback: "беззаботный" },
        { value: "Algieba",        descKey: "googleRealtimeVoiceAlgiebaDesc",        fallback: "плавный" },
        { value: "Despina",        descKey: "googleRealtimeVoiceDespinaDesc",        fallback: "плавный, мягкий" },
        { value: "Erinome",        descKey: "googleRealtimeVoiceErinomeDesc",        fallback: "чёткий, спокойный" },
        { value: "Algenib",        descKey: "googleRealtimeVoiceAlgenibDesc",        fallback: "с хрипотцой" },
        { value: "Rasalgethi",     descKey: "googleRealtimeVoiceRasalghiDesc",       fallback: "информативный" },
        { value: "Laomedeia",      descKey: "googleRealtimeVoiceLaomedeiaDesc",      fallback: "живой, позитивный" },
        { value: "Achernar",       descKey: "googleRealtimeVoiceAchernarDesc",       fallback: "мягкий" },
        { value: "Alnilam",        descKey: "googleRealtimeVoiceAlnilamDesc",        fallback: "твёрдый, ровный" },
        { value: "Schedar",        descKey: "googleRealtimeVoiceSchedarDesc",        fallback: "ровный" },
        { value: "Gacrux",         descKey: "googleRealtimeVoiceGacruxDesc",         fallback: "зрелый" },
        { value: "Pulcherrima",    descKey: "googleRealtimeVoicePulcherrimaDesc",    fallback: "уверенный, напористый" },
        { value: "Achird",         descKey: "googleRealtimeVoiceAchirdDesc",         fallback: "дружелюбный" },
        { value: "Zubenelgenubi",  descKey: "googleRealtimeVoiceZubenelgenubiDesc",  fallback: "непринуждённый, разговорный" },
        { value: "Vindemiatrix",   descKey: "googleRealtimeVoiceVindemiatrixDesc",   fallback: "деликатный" },
        { value: "Sadachbia",      descKey: "googleRealtimeVoiceSadachbiaDesc",      fallback: "живой, общительный" },
        { value: "Sadaltager",     descKey: "googleRealtimeVoiceSadaltagerDesc",     fallback: "знающий" },
        { value: "Sulafat",        descKey: "googleRealtimeVoiceSulafatDesc",        fallback: "тёплый" },
    ];

    const LANGUAGE_OPTIONS = [
        { value: "ru", label: "Русский (ru)" },
        { value: "en", label: "English (en)" },
        { value: "de", label: "Deutsch (de)" },
        { value: "fr", label: "Français (fr)" },
        { value: "es", label: "Español (es)" },
        { value: "it", label: "Italiano (it)" },
        { value: "pt", label: "Português (pt)" },
        { value: "uk", label: "Українська (uk)" },
        { value: "pl", label: "Polski (pl)" },
        { value: "nl", label: "Nederlands (nl)" },
        { value: "sv", label: "Svenska (sv)" },
        { value: "tr", label: "Türkçe (tr)" },
        { value: "ar", label: "العربية (ar)" },
        { value: "hi", label: "हिन्दी (hi)" },
        { value: "cmn", label: "中文普通话 (cmn)" },
        { value: "ja", label: "日本語 (ja)" },
        { value: "ko", label: "한국어 (ko)" },
        { value: "id", label: "Indonesia (id)" },
        { value: "vi", label: "Tiếng Việt (vi)" },
        { value: "th", label: "ภาษาไทย (th)" },
        { value: "ro", label: "Română (ro)" },
        { value: "cs", label: "Čeština (cs)" },
        { value: "sk", label: "Slovenčina (sk)" },
        { value: "hu", label: "Magyar (hu)" },
        { value: "fi", label: "Suomi (fi)" },
        { value: "da", label: "Dansk (da)" },
        { value: "nb", label: "Norsk bokmål (nb)" },
        { value: "el", label: "Ελληνικά (el)" },
        { value: "bg", label: "Български (bg)" },
        { value: "hr", label: "Hrvatski (hr)" },
        { value: "sr", label: "Српски (sr)" },
        { value: "he", label: "עברית (he)" },
        { value: "fa", label: "فارسی (fa)" },
        { value: "bn", label: "বাংলা (bn)" },
        { value: "ta", label: "தமிழ் (ta)" },
        { value: "te", label: "తెలుగు (te)" },
        { value: "mr", label: "मराठी (mr)" },
        { value: "ur", label: "اردو (ur)" },
        { value: "af", label: "Afrikaans (af)" },
        { value: "sw", label: "Kiswahili (sw)" },
    ];

    const collapseItems: CollapseProps["items"] = [
        {
            key: "voice-settings",
            label: (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <AudioOutlined />
                    {t("googleRealtimeVoiceSettingsTitle") || "Голос и язык"}
                </span>
            ),
            children: (
                <div className="espero-channel-item" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {/* Voice name */}
                    <div className="espero-form-item">
                        <div className="espero-form-label">
                            {t("googleRealtimeVoiceLabel") || "Голос модели"}
                            <Tooltip title={t("googleRealtimeVoiceTip") || "Выберите один из HD-голосов Gemini для синтеза речи. По умолчанию: Puck"}>
                                <InfoCircleOutlined style={{ color: "#999", marginLeft: 6 }} />
                            </Tooltip>
                        </div>
                        <Select
                            value={voiceName}
                            onChange={handleVoiceNameChange}
                            disabled={!realtimeEnabled}
                            style={{ width: "100%" }}
                            showSearch
                            optionFilterProp="label"
                            options={GOOGLE_VOICES.map(v => ({
                                value: v.value,
                                label: `${v.value} — ${t(v.descKey) || v.fallback}`,
                            }))}
                        />
                    </div>
                    {/* Language code */}
                    <div className="espero-form-item">
                        <div className="espero-form-label">
                            <TranslationOutlined style={{ marginRight: 4 }} />
                            {t("googleRealtimeLangLabel") || "Язык синтеза речи"}
                            <Tooltip title={t("googleRealtimeLangTip") || "Базовая локаль для синтеза речи (speech_config.language_code). Нативные аудио-модели могут переключаться между языками на лету, но этот параметр задаёт акцент по умолчанию."}>
                                <InfoCircleOutlined style={{ color: "#999", marginLeft: 6 }} />
                            </Tooltip>
                        </div>
                        <Select
                            value={languageCode}
                            onChange={handleLanguageCodeChange}
                            disabled={!realtimeEnabled}
                            style={{ width: "100%" }}
                            showSearch
                            optionFilterProp="label"
                            options={LANGUAGE_OPTIONS}
                        />
                    </div>
                </div>
            ),
        },
        {
            key: "transcription-settings",
            label: (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <AudioOutlined />
                    {t("googleRealtimeTranscriptionTitle") || "Транскрипция"}
                </span>
            ),
            children: (
                <div className="espero-channel-item" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {/* Input audio transcription */}
                    <div className="espero-form-item">
                        <div className="espero-switch-container">
                            <div className="espero-switch-label">
                                {t("googleRealtimeInputTranscriptionLabel") || "Транскрибировать речь пользователя (STT)"}
                                <Tooltip title={t("googleRealtimeInputTranscriptionTip") || "Входящая речь пользователя параллельно транскрибируется в текст для сохранения истории диалога. По умолчанию: включено"}>
                                    <InfoCircleOutlined style={{ color: "#999", marginLeft: 6 }} />
                                </Tooltip>
                            </div>
                            <Switch
                                checked={inputAudioTranscription}
                                onChange={handleInputTranscriptionChange}
                                disabled={!realtimeEnabled}
                                checkedChildren={<span style={{ color: "black" }}>{t("Yes") || "Да"}</span>}
                                unCheckedChildren={<span style={{ color: "black" }}>{t("No") || "Нет"}</span>}
                            />
                        </div>
                    </div>
                    {/* Output audio transcription */}
                    <div className="espero-form-item">
                        <div className="espero-switch-container">
                            <div className="espero-switch-label">
                                {t("googleRealtimeOutputTranscriptionLabel") || "Транскрибировать речь модели (субтитры)"}
                                <Tooltip title={t("googleRealtimeOutputTranscriptionTip") || "Генерировать текст одновременно с голосом модели — для отображения субтитров. По умолчанию: выключено"}>
                                    <InfoCircleOutlined style={{ color: "#999", marginLeft: 6 }} />
                                </Tooltip>
                            </div>
                            <Switch
                                checked={outputAudioTranscription}
                                onChange={handleOutputTranscriptionChange}
                                disabled={!realtimeEnabled}
                                checkedChildren={<span style={{ color: "black" }}>{t("Yes") || "Да"}</span>}
                                unCheckedChildren={<span style={{ color: "black" }}>{t("No") || "Нет"}</span>}
                            />
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
                            <Switch
                                checked={initialGreeting}
                                onChange={handleInitialGreetingChange}
                                disabled={!realtimeEnabled}
                                checkedChildren={<span style={{ color: "black" }}>{t("Yes") || "Да"}</span>}
                                unCheckedChildren={<span style={{ color: "black" }}>{t("No") || "Нет"}</span>}
                            />
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
                    {t("googleRealtimeVADTitle") || "Параметры VAD"}
                </span>
            ),
            children: (
                <div className="espero-channel-item" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {/* Automatic activity detection */}
                    <div className="espero-form-item">
                        <div className="espero-switch-container">
                            <div className="espero-switch-label">
                                {t("googleRealtimeAutoVADLabel") || "Автоматическое определение голоса (VAD)"}
                                <Tooltip title={t("googleRealtimeAutoVADTip") || "Если включено — модель сама определяет, когда пользователь говорит. Если выключено — требуется ручная отправка сигнала конца речи (Push-to-Talk). По умолчанию: включено"}>
                                    <InfoCircleOutlined style={{ color: "#999", marginLeft: 6 }} />
                                </Tooltip>
                            </div>
                            <Switch
                                checked={automaticActivityDetection}
                                onChange={handleAutoVADChange}
                                disabled={!realtimeEnabled}
                                checkedChildren={<span style={{ color: "black" }}>{t("Yes") || "Да"}</span>}
                                unCheckedChildren={<span style={{ color: "black" }}>{t("No") || "Нет"}</span>}
                            />
                        </div>
                    </div>
                    {/* Barge-in */}
                    <div className="espero-form-item">
                        <div className="espero-switch-container">
                            <div className="espero-switch-label">
                                {t("googleRealtimeBargeInLabel") || "Режим перебивания (barge-in)"}
                                <Tooltip title={t("googleRealtimeBargeInTip") || "Если включено — пользователь может перебить модель: генерация немедленно прерывается и буфер воспроизведения очищается. По умолчанию: включено"}>
                                    <InfoCircleOutlined style={{ color: "#999", marginLeft: 6 }} />
                                </Tooltip>
                            </div>
                            <Switch
                                checked={bargeIn}
                                onChange={handleBargeInChange}
                                disabled={!realtimeEnabled || !automaticActivityDetection}
                                checkedChildren={<span style={{ color: "black" }}>{t("Yes") || "Да"}</span>}
                                unCheckedChildren={<span style={{ color: "black" }}>{t("No") || "Нет"}</span>}
                            />
                        </div>
                    </div>
                    {/* Silence duration ms */}
                    <div className="espero-form-item">
                        <div className="espero-form-label">
                            {t("googleRealtimeSilenceLabel") || "Длительность тишины до начала ответа (мс)"}
                            <Tooltip title={t("googleRealtimeSilenceTip") || "Сколько миллисекунд тишины модель выдерживает после того, как пользователь замолчал, прежде чем запустить генерацию ответа. По умолчанию: 500 мс"}>
                                <InfoCircleOutlined style={{ color: "#999", marginLeft: 6 }} />
                            </Tooltip>
                        </div>
                        <div className="espero-slider-container">
                            <div className="espero-slider-row">
                                <Slider
                                    className="espero-slider"
                                    min={100} max={3000} step={100}
                                    value={silenceDurationMs}
                                    onChange={(v) => handleSilenceDurationChange(v)}
                                    disabled={!realtimeEnabled || !automaticActivityDetection}
                                    tooltip={{ formatter: (v) => `${v} мс` }}
                                />
                                <InputNumber
                                    className="espero-input-number"
                                    min={100} max={3000} step={100}
                                    value={silenceDurationMs}
                                    onChange={handleSilenceDurationChange}
                                    disabled={!realtimeEnabled || !automaticActivityDetection}
                                    addonAfter="мс"
                                />
                            </div>
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
                {t("googleRealtimeTitle") || "Голосовой режим (Google Multimodal Live)"}
            </div>
            <div className="section-description">
                {t("googleRealtimeDesc") || "Включает режим реального времени Google Multimodal Live API для голосового взаимодействия с агентом. Поддерживает потоковую передачу речи, VAD и транскрипцию."}
            </div>

            <div className="step" style={{ marginBottom: realtimeEnabled ? 16 : 0 }}>
                <span>
                    {t("googleRealtimeEnableLabel") || "Включить голосовой режим реального времени"}&nbsp;
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

