import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Alert, Button, Col, Collapse, Form, Input, Row, Select, Space, Spin, Switch, Upload, message} from "antd";
import type {UploadFile} from "antd";
import {AudioOutlined, CustomerServiceOutlined, InfoCircleOutlined, PlayCircleOutlined, UploadOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import {type GptTypeValue, type ModelData, type VoiceSelection} from "./modUtils";
import {createVoiceApi, type Voice} from "../../../utils/mistral-realtime-voices";
import {fetchVoiceSettings} from "./providersUtils";

const elevenLabsVoiceApi = createVoiceApi("elevenlabs");

const encodeWav = (samples: Float32Array, sampleRate: number): ArrayBuffer => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    const write = (offset: number, value: string) => {
        for (let index = 0; index < value.length; index++) {
            view.setUint8(offset + index, value.charCodeAt(index));
        }
    };
    write(0, "RIFF"); view.setUint32(4, 36 + samples.length * 2, true); write(8, "WAVE");
    write(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true); view.setUint16(34, 16, true); write(36, "data");
    view.setUint32(40, samples.length * 2, true);
    for (let i = 0; i < samples.length; i++) view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 0x7fff, true);
    return buffer;
};

interface VoiceSettingsProps {
    /** Текущий провайдер модели (openai|google|mistral) */
    provider?: string | null;
    modelData?: ModelData | null;
    initialVoice?: VoiceSelection | null;
    toForm?: any;
    /** Уведомляет родителя об изменении Voice/CreateMusic (setFieldsValue не вызывает onValuesChange). */
    onChange?: (changedValues: Record<string, unknown>) => void;
    /**
     * Встроенный режим: управление включением/каскадом берёт на себя родитель
     * (например, Mistral realtime). Всегда использует ElevenLabs и realtime_backend=elevenlabs.
     */
    embedded?: boolean;
}

const hasElevenLabs = (voice?: VoiceSelection | null): boolean => {
    if (!voice) {
        return false;
    }
    const backends = [voice.tts_backend, voice.stt_backend, voice.realtime_backend].filter(Boolean);
    if (backends.length > 0) {
        return backends.includes("elevenlabs");
    }
    // Старые записи без backends считаем ElevenLabs, если заданы голосовые модели.
    return Boolean(voice.tts || voice.stt || voice.sts);
};

/**
 * Настройки голоса текущей модели: выбор ElevenLabs (voice-only провайдер),
 * голосовых моделей и клонирование голоса. Сохраняется в UniversalModelData.Voice
 * и CreateMusic (см. elevenlabs-orchestrator-frontend-migration.md §4.3/§4.5).
 */
export const VoiceSettings: React.FC<VoiceSettingsProps> = ({modelData, initialVoice, toForm, onChange, embedded}) => {
    const {t} = useTranslation();
    const [voiceOnlyAvailable, setVoiceOnlyAvailable] = useState<boolean | null>(null);
    const [capabilities, setCapabilities] = useState<string[]>([]);
    const [useElevenLabs, setUseElevenLabs] = useState<boolean>(
        embedded ? true : hasElevenLabs(initialVoice ?? modelData?.Voice)
    );

    const [ttsModel, setTtsModel] = useState<string | undefined>(initialVoice?.tts?.model ?? undefined);
    const [sttModel, setSttModel] = useState<string | undefined>(initialVoice?.stt?.model ?? undefined);
    const [sttRealtimeModel, setSttRealtimeModel] = useState<string | undefined>(
        initialVoice?.stt?.realtime_model != null ? String(initialVoice.stt.realtime_model) : undefined
    );
    const [stsModel, setStsModel] = useState<string | undefined>(initialVoice?.sts?.model ?? undefined);
    const [voiceId, setVoiceId] = useState<string | undefined>(initialVoice?.voice_id ?? undefined);
    const [voiceName, setVoiceName] = useState<string | undefined>(initialVoice?.voice_name ?? undefined);
    // Каскад STT→LLM→TTS для звонков включается только при realtime_backend=elevenlabs.
    const [useRealtimeCascade, setUseRealtimeCascade] = useState<boolean>(
        String(initialVoice?.realtime_backend ?? "").toLowerCase() === "elevenlabs"
    );

    // Исходная голосовая конфигурация (может быть не-ElevenLabs — её не затираем).
    const initialVoiceRef = useRef<VoiceSelection | null>(initialVoice ?? null);

    const [models, setModels] = useState<GptTypeValue[]>([]);
    const [voices, setVoices] = useState<Voice[]>([]);
    const [loading, setLoading] = useState(false);
    const [playingVoice, setPlayingVoice] = useState<string | null>(null);
    const [cloneOpen, setCloneOpen] = useState(false);
    const [cloneLoading, setCloneLoading] = useState(false);
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const [cloneForm] = Form.useForm();

    // Запись сэмпла с микрофона
    const [recording, setRecording] = useState(false);
    const [recordingSeconds, setRecordingSeconds] = useState(0);
    const streamRef = useRef<MediaStream | null>(null);
    const recordingContextRef = useRef<AudioContext | null>(null);
    const recordingSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const recordingProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const recordingSamplesRef = useRef<Float32Array[]>([]);
    const recordingTimerRef = useRef<number | null>(null);

    const canClone = capabilities.includes("voice_clone");

    // PVC: голос обучается асинхронно — опрашиваем статус до fine_tuned/failed.
    const [trainingVoiceId, setTrainingVoiceId] = useState<string | null>(null);

    // onChange храним в ref, чтобы не перезапускать emit на каждый ре-рендер родителя.
    const onChangeRef = useRef(onChange);
    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    // Первый emit при монтировании только синхронизирует форму — не помечаем модель изменённой.
    const skipNextEmitRef = useRef(true);

    const modelsByKind = useMemo(() => {
        const pick = (kind: string) => models.filter((model) => model.kind === kind).map((model) => ({
            label: model.display_name || model.name,
            value: model.name,
        }));
        const sttAll = pick("stt");
        const isRealtime = (model: {value?: string}) => String(model.value ?? "").includes("realtime");
        return {
            tts: pick("tts"),
            music: pick("music"),
            sts: pick("sts"),
            // batch-модели (scribe_v2/scribe_v1) — для голосовых сообщений;
            // realtime-модели (scribe_v2_realtime) — только для каскада звонков.
            sttBatch: sttAll.filter((model) => !isRealtime(model)),
            sttRealtime: sttAll.filter(isRealtime),
            sttAll,
        };
    }, [models]);

    // Один агрегирующий запрос вместо трёх: доступность + модели + голоса.
    const loadCatalogs = useCallback(async () => {
        setLoading(true);
        try {
            const result = await fetchVoiceSettings("elevenlabs");
            if (!result.success || !result.data) {
                throw new Error(result.error || (t("voiceSettingsLoadError") || "Не удалось загрузить голосовые модели"));
            }
            const data = result.data;
            setCapabilities(Array.isArray(data.capabilities) ? data.capabilities : []);
            setVoiceOnlyAvailable(Boolean(data.available));
            // /model/voice/settings отдаёт модели с полем Name (как /model/list) — нормализуем.
            setModels((data.models ?? [])
                .filter((model) => model.kind)
                .map((model) => ({
                    name: (model.name ?? model.Name ?? "") as string,
                    id: (model.Id ?? 0) as number,
                    kind: model.kind ?? null,
                    is_default: model.is_default ?? null,
                    display_name: model.display_name ?? null,
                    languages: Array.isArray(model.languages) ? model.languages : null,
                }))
                .filter((model) => model.name) as GptTypeValue[]);
            setVoices(((data.voices?.items ?? []) as Voice[]));
            if (data.voices_error) {
                message.warning(data.voices_error);
            }
        } catch (error) {
            message.error(error instanceof Error ? error.message : (t("voiceSettingsLoadError") || "Не удалось загрузить голосовые модели"));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        void loadCatalogs();
    }, [loadCatalogs]);

    useEffect(() => {
        if (!trainingVoiceId) return;
        let cancelled = false;
        const poll = async () => {
            try {
                const updated = await elevenLabsVoiceApi.get(trainingVoiceId, "elevenlabs");
                if (cancelled) return;
                setVoices((current) => current.map((voice) => (voice.id === updated.id ? updated : voice)));
                if (updated.fine_tuning_state === "fine_tuned" || updated.fine_tuning_state === "failed") {
                    setTrainingVoiceId(null);
                    if (updated.fine_tuning_state === "fine_tuned") {
                        message.success(t("voiceTrainingDone") || "Голос обучен и готов к использованию");
                    }
                }
            } catch {
                /* повторяем опрос */
            }
        };
        void poll();
        const timer = window.setInterval(poll, 5000);
        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [trainingVoiceId, t]);

    const emit = useCallback(() => {
        // База — текущее значение Voice из формы (в нём могут быть правки музыки),
        // иначе исходная конфигурация.
        const stored = toForm?.getFieldValue?.("Voice") as VoiceSelection | null | undefined;
        const base = stored && typeof stored === "object" ? stored : initialVoiceRef.current;
        let selection: VoiceSelection | null;
        if (useElevenLabs) {
            const hasStt = Boolean(sttModel) || Boolean(sttRealtimeModel);
            selection = {
                // Сохраняем прочие поля исходной конфигурации (format, language, elevenlabs).
                ...(base ?? {}),
                tts: ttsModel ? {...(base?.tts ?? {}), model: ttsModel, voice_id: voiceId || null} : null,
                stt: hasStt
                    ? {
                        ...(base?.stt ?? {}),
                        model: sttModel || null,
                        realtime_model: sttRealtimeModel || null,
                    }
                    : null,
                sts: stsModel ? {...(base?.sts ?? {}), model: stsModel} : null,
                tts_backend: ttsModel ? "elevenlabs" : null,
                stt_backend: hasStt ? "elevenlabs" : null,
                // Каскад звонков включается только при realtime_backend=elevenlabs.
                realtime_backend: embedded ? "elevenlabs" : (useRealtimeCascade ? "elevenlabs" : null),
                voice_id: voiceId || null,
                voice_name: voiceName || null,
            };
        } else {
            // Не затираем не-ElevenLabs голосовую конфигурацию (например, Mistral).
            selection = hasElevenLabs(base) ? null : (base ?? null);
        }

        toForm?.setFieldsValue({Voice: selection});
        if (skipNextEmitRef.current) {
            skipNextEmitRef.current = false;
            return;
        }
        onChangeRef.current?.({Voice: selection});
    }, [useElevenLabs, ttsModel, voiceId, voiceName, sttModel, sttRealtimeModel, stsModel, useRealtimeCascade, embedded, toForm]);

    useEffect(() => {
        emit();
    }, [emit]);

    const playSample = async (id: string) => {
        try {
            const blob = await elevenLabsVoiceApi.sample(id, "elevenlabs");
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audio.onended = () => {
                setPlayingVoice(null);
                URL.revokeObjectURL(url);
            };
            setPlayingVoice(id);
            await audio.play();
        } catch (error) {
            setPlayingVoice(null);
            message.error(error instanceof Error ? error.message : (t("voiceSampleError") || "Ошибка воспроизведения"));
        }
    };

    const cloneVoice = async (values: {
        name: string;
        clone_mode?: string;
        language?: string;
        model_id?: string;
        languages?: string;
        description?: string;
        tags?: string;
    }) => {
        const files = fileList
            .map((item) => item.originFileObj as File | undefined)
            .filter((file): file is File => Boolean(file));
        if (files.length === 0) {
            message.error(t("voiceSelectAudio") || "Выберите аудиофайл");
            return;
        }
        if (values.clone_mode === "professional" && !values.language) {
            message.error(t("voiceLanguageRequired") || "Для профессионального клонирования укажите язык");
            return;
        }
        setCloneLoading(true);
        try {
            const voice = await elevenLabsVoiceApi.clone(values, files, "elevenlabs");
            setVoices((current) => [voice, ...current.filter((item) => item.id !== voice.id)]);
            const pending = voice.clone_mode === "professional" && voice.fine_tuning_state !== "fine_tuned";
            if (pending) {
                setTrainingVoiceId(voice.id);
                message.info(t("voiceTrainingStarted") || "Обучение голоса запущено. Дождитесь завершения.");
            } else {
                setVoiceId(voice.id);
                setVoiceName(voice.name || undefined);
                message.success(t("voiceCreated") || "Голос создан");
            }
            setFileList([]);
            setCloneOpen(false);
            cloneForm.resetFields();
        } catch (error) {
            message.error(error instanceof Error ? error.message : (t("voiceCreateError") || "Не удалось создать голос"));
        } finally {
            setCloneLoading(false);
        }
    };

    const stopRecording = useCallback(() => {
        const context = recordingContextRef.current;
        const samples = recordingSamplesRef.current;
        if (samples.length && context) {
            const all = new Float32Array(samples.reduce((total, chunk) => total + chunk.length, 0));
            let offset = 0;
            samples.forEach((chunk) => { all.set(chunk, offset); offset += chunk.length; });
            const wav = new File([encodeWav(all, context.sampleRate)], `voice-sample-${Date.now()}.wav`, {type: "audio/wav"});
            setFileList((prev) => [
                ...prev.filter((item) => !String(item.uid).startsWith("recording-")),
                ({uid: `recording-${Date.now()}`, name: wav.name, status: "done", originFileObj: wav} as unknown) as UploadFile,
            ]);
        }
        recordingProcessorRef.current?.disconnect();
        recordingSourceRef.current?.disconnect();
        void context?.close();
        recordingProcessorRef.current = null;
        recordingSourceRef.current = null;
        recordingContextRef.current = null;
        recordingSamplesRef.current = [];
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (recordingTimerRef.current !== null) window.clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
        setRecording(false);
    }, []);

    const startRecording = useCallback(async () => {
        if (!navigator.mediaDevices?.getUserMedia) {
            message.error(t("mistralMicrophoneUnsupported") || "Микрофон не поддерживается браузером");
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({audio: true});
            const context = new AudioContext();
            const source = context.createMediaStreamSource(stream);
            const processor = context.createScriptProcessor(4096, 1, 1);
            recordingSamplesRef.current = [];
            processor.onaudioprocess = (event) => recordingSamplesRef.current.push(new Float32Array(event.inputBuffer.getChannelData(0)));
            source.connect(processor);
            processor.connect(context.destination);
            recordingContextRef.current = context;
            recordingSourceRef.current = source;
            recordingProcessorRef.current = processor;
            streamRef.current = stream;
            setRecording(true);
            setRecordingSeconds(0);
            recordingTimerRef.current = window.setInterval(() => {
                setRecordingSeconds((seconds) => {
                    if (seconds + 1 >= 10) stopRecording();
                    return seconds + 1;
                });
            }, 1000);
        } catch (error) {
            message.error(error instanceof Error ? error.message : (t("mistralMicrophoneAccessError") || "Не удалось получить доступ к микрофону"));
        }
    }, [stopRecording, t]);

    useEffect(() => () => {
        stopRecording();
    }, [stopRecording]);

    if (voiceOnlyAvailable === false) {
        return (
            <Alert
                type="info"
                showIcon
                icon={<CustomerServiceOutlined/>}
                message={t("voiceSettingsNoKeyTitle") || "ElevenLabs не подключён"}
                description={t("voiceSettingsNoKeyDesc") || "Добавьте API-ключ ElevenLabs в настройках, чтобы использовать голоса TTS/STT и генерацию музыки."}
            />
        );
    }

    const voiceOptions = voices.map((voice) => {
        const pending = voice.clone_mode === "professional" && voice.fine_tuning_state !== "fine_tuned";
        const progress = typeof voice.fine_tuning_progress === "number" ? ` ${voice.fine_tuning_progress}%` : "";
        const status = pending ? ` — ${voice.fine_tuning_state || "training"}${progress}` : "";
        return {
            label: `${voice.name || voice.id}${status}`,
            value: voice.id,
            // Обучение PVC ещё не завершено — голос выбирать нельзя.
            disabled: pending,
        };
    });

    return (
        <div>
            {!embedded && (
                <>
                    <div className="section-title">
                        <AudioOutlined/> {t("voiceSettingsTitle") || "ElevenLabs голос"}
                    </div>
                    <div className="section-description">
                        {t("voiceSettingsDesc") || "Выберите голосовые модели ElevenLabs для текущей модели агента."}
                    </div>

                    <div className="espero-form-item">
                        <div className="espero-switch-label">
                            {t("voiceUseElevenLabs") || "Использовать ElevenLabs"}
                            <InfoCircleOutlined style={{color: "#999", marginLeft: 6}}
                                                 title={t("voiceUseElevenLabsTip") || "Заменяет штатный голос модели на голос ElevenLabs"}/>
                        </div>
                        <Switch
                            checked={useElevenLabs}
                            onChange={setUseElevenLabs}
                            checkedChildren={<span style={{color: "black"}}>{t("Yes") || "Да"}</span>}
                            unCheckedChildren={<span style={{color: "black"}}>{t("No") || "Нет"}</span>}
                        />
                    </div>
                </>
            )}

            {useElevenLabs && (
                <Spin spinning={loading}>
                    <Form layout="vertical">
                        <Row gutter={[16, 0]}>
                            <Col xs={24} md={8}>
                                <Form.Item label={t("voiceTtsModel") || "TTS модель"}>
                                    <Select allowClear value={ttsModel} options={modelsByKind.tts}
                                            placeholder={t("voiceSelectModel") || "Выберите модель"}
                                            onChange={(value) => setTtsModel(value)}/>
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                                <Form.Item label={t("voiceSttModel") || "STT модель (голосовые сообщения)"}>
                                    <Select allowClear value={sttModel} options={modelsByKind.sttBatch}
                                            placeholder={t("voiceSelectModel") || "Выберите модель"}
                                            onChange={(value) => setSttModel(value)}/>
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                                <Form.Item label={t("voiceStsModel") || "STS модель"}>
                                    <Select allowClear value={stsModel} options={modelsByKind.sts}
                                            placeholder={t("voiceSelectModel") || "Выберите модель"}
                                            onChange={(value) => setStsModel(value)}/>
                                </Form.Item>
                            </Col>
                            {useRealtimeCascade && (
                                <Col xs={24} md={8}>
                                    <Form.Item label={t("voiceSttRealtimeModel") || "STT модель для realtime (звонки)"}>
                                        <Select
                                            allowClear
                                            value={sttRealtimeModel}
                                            options={modelsByKind.sttRealtime.length > 0
                                                ? modelsByKind.sttRealtime
                                                : [{label: "scribe_v2_realtime", value: "scribe_v2_realtime"}]}
                                            placeholder="scribe_v2_realtime"
                                            onChange={(value) => setSttRealtimeModel(value)}
                                        />
                                    </Form.Item>
                                </Col>
                            )}
                            <Col xs={24}>
                                <Form.Item label={t("voiceTtsVoice") || "Голос"}>
                                    <Space.Compact style={{width: "100%"}}>
                                        <Select
                                            allowClear
                                            showSearch
                                            optionFilterProp="label"
                                            value={voiceId}
                                            options={voiceOptions}
                                            placeholder={t("voiceSelectVoice") || "Выберите голос"}
                                            onChange={(value) => {
                                                setVoiceId(value);
                                                const selected = voices.find((voice) => voice.id === value);
                                                setVoiceName(selected?.name || undefined);
                                            }}
                                            style={{flex: 1}}
                                        />
                                        {voiceId && (
                                            <Button icon={<PlayCircleOutlined/>} loading={playingVoice === voiceId}
                                                    onClick={() => void playSample(voiceId)}>
                                                {t("voiceListen") || "Прослушать"}
                                            </Button>
                                        )}
                                    </Space.Compact>
                                </Form.Item>
                            </Col>
                            {!embedded && (
                                <Col xs={24} md={12}>
                                    <Form.Item label="&nbsp;">
                                        <Space>
                                            <Switch
                                                checked={useRealtimeCascade}
                                                onChange={setUseRealtimeCascade}
                                                checkedChildren={<span style={{color: "black"}}>{t("Yes") || "Да"}</span>}
                                                unCheckedChildren={<span style={{color: "black"}}>{t("No") || "Нет"}</span>}
                                            />
                                            <span>{t("voiceRealtimeCascade") || "Каскад ElevenLabs для звонков (STT → LLM → TTS)"}</span>
                                            <InfoCircleOutlined
                                                style={{color: "#999"}}
                                                title={t("voiceRealtimeCascadeTip") || "Без этого звонки идут нативным audio-to-audio активного провайдера"}
                                            />
                                        </Space>
                                    </Form.Item>
                                </Col>
                            )}
                        </Row>
                    </Form>

                    {canClone && (
                        <Collapse
                            ghost
                            activeKey={cloneOpen ? ["clone"] : []}
                            onChange={(keys) => setCloneOpen(keys.includes("clone"))}
                            items={[{
                                key: "clone",
                                label: t("voiceCloneNew") || "Создать клонированный голос",
                                children: (
                                    <Form form={cloneForm} component="div" layout="vertical"
                                          initialValues={{clone_mode: "instant"}}
                                          onFinish={cloneVoice}>
                                        <Row gutter={[16, 0]}>
                                            <Col xs={24} md={8}>
                                                <Form.Item name="name" label={t("voiceName") || "Имя"}
                                                           rules={[{required: true}]}>
                                                    <Input/>
                                                </Form.Item>
                                            </Col>
                                            <Col xs={24} md={8}>
                                                <Form.Item name="clone_mode" label={t("voiceCloneMode") || "Режим клонирования"}>
                                                    <Select
                                                        options={[
                                                            {label: t("voiceCloneModeInstant") || "Быстрый (IVC)", value: "instant"},
                                                            {label: t("voiceCloneModeProfessional") || "Профессиональный (PVC)", value: "professional"},
                                                        ]}
                                                    />
                                                </Form.Item>
                                            </Col>
                                            <Col xs={24} md={8}>
                                                <Form.Item name="languages" label={t("voiceLanguagesOptional") || "Языки (опционально)"}>
                                                    <Input placeholder="ru,en"/>
                                                </Form.Item>
                                            </Col>
                                            <Form.Item shouldUpdate noStyle>
                                                {() => cloneForm.getFieldValue("clone_mode") === "professional" && (
                                                    <Row gutter={[16, 0]}>
                                                        <Col xs={24} md={8}>
                                                            <Form.Item name="language" label={t("voiceLanguage") || "Язык"}
                                                                       rules={[{required: true, message: t("voiceLanguageRequired") || "Укажите язык"}]}>
                                                                <Input placeholder="ru"/>
                                                            </Form.Item>
                                                        </Col>
                                                        <Col xs={24} md={8}>
                                                            <Form.Item name="model_id" label={t("voiceCloneModelId") || "Модель для обучения"}>
                                                                <Input placeholder="eleven_multilingual_v2"/>
                                                            </Form.Item>
                                                        </Col>
                                                    </Row>
                                                )}
                                            </Form.Item>
                                            <Col xs={24} md={16}>
                                                <Form.Item name="description" label={t("voiceDescription") || "Описание"}>
                                                    <Input.TextArea rows={1}/>
                                                </Form.Item>
                                            </Col>
                                            <Col xs={24} md={24}>
                                                <Form.Item label={t("voiceAudioSample") || "Аудиосэмпл"}>
                                                    <Space wrap>
                                                        <Upload beforeUpload={() => false} maxCount={5} multiple fileList={fileList}
                                                                onChange={({fileList: next}) => setFileList(next)}
                                                                accept=".wav,.mp3,.flac,.ogg,.pcm">
                                                            <Button icon={<UploadOutlined/>} disabled={recording}>{t("voiceChooseFile") || "Выбрать файл"}</Button>
                                                        </Upload>
                                                        <Button onClick={recording ? stopRecording : startRecording} danger={recording}>
                                                            {recording
                                                                ? `${t("voiceStopRecording") || "Остановить запись"} (${recordingSeconds}/10)`
                                                                : t("voiceRecordFromMic") || "Записать с микрофона"}
                                                        </Button>
                                                        {!recording && recordingSeconds > 0 && recordingSeconds < 3 &&
                                                            <span>{t("mistralMinRecording") || "Минимальная длительность записи — 3 секунды"}</span>}
                                                    </Space>
                                                </Form.Item>
                                            </Col>
                                        </Row>
                                        <Button type="primary" loading={cloneLoading}
                                                onClick={() => cloneForm.submit()}>
                                            {t("voiceCreateClone") || "Создать клон"}
                                        </Button>
                                    </Form>
                                ),
                            }]}
                        />
                    )}
                </Spin>
            )}
        </div>
    );
};
