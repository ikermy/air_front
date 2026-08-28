import React, {useCallback, useEffect, useRef, useState} from "react";
import {Button, Col, Collapse, Form, Input, Row, Select, Space, Spin, Segmented, Switch, Upload, message} from "antd";
import type {UploadFile} from "antd";
import {AudioOutlined, DeleteOutlined, InfoCircleOutlined, PlayCircleOutlined, UploadOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import {authFetch} from "../../../utils/easyUtils";
import {getListModelNames, type GptTypeValue, type MistralRealtimeVAD} from "./modUtils";
import {createMistralVoiceApi} from "../../../utils/mistral-realtime-voices";
import {Tooltip} from "antd";

interface MistralVoice {
    id: string;
    name?: string;
    languages?: string[];
    description?: string;
}

interface MistralRealtimeProps {
    onChange?: (value: { realtime: boolean; realtime_vad: MistralRealtimeVAD | null }) => void;
    toForm?: any;
    initialRealtime?: boolean;
    initialRealtimeVAD?: MistralRealtimeVAD | null;
    provider?: string | null;
    modelData?: unknown;
}

const DEFAULTS: Required<Pick<MistralRealtimeVAD, "speech_format" | "stt_language">> = {
    speech_format: "pcm", stt_language: "",
};

const mistralVoiceApi = createMistralVoiceApi();

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

export const Mistral_Realtime: React.FC<MistralRealtimeProps> = ({
                                                                     onChange,
                                                                     toForm,
                                                                     initialRealtime,
                                                                     initialRealtimeVAD,
                                                                     provider,
                                                                     modelData
                                                                 }) => {
    const {t} = useTranslation();
    const [enabled, setEnabled] = useState(Boolean(initialRealtime));
    const [config, setConfig] = useState<MistralRealtimeVAD>({...DEFAULTS, ...(initialRealtimeVAD || {})});
    const [initialGreeting, setInitialGreeting] = useState(initialRealtimeVAD?.initial_greeting ?? false);
    const [greetingCollapseOpen, setGreetingCollapseOpen] = useState(Boolean(initialRealtimeVAD?.initial_greeting));
    const [greeting, setGreeting] = useState(initialRealtimeVAD?.greeting ?? "");
    const [realtimeModels, setRealtimeModels] = useState<GptTypeValue[]>([]);
    const [ttsModels, setTtsModels] = useState<GptTypeValue[]>([]);
    const [presetVoices, setPresetVoices] = useState<MistralVoice[]>([]);
    const [customVoices, setCustomVoices] = useState<MistralVoice[]>([]);
    const [playingVoice, setPlayingVoice] = useState<string | null>(null);
    const audioUrlRef = useRef<string | null>(null);
    const [voiceMode, setVoiceMode] = useState<"preset" | "custom">(initialRealtimeVAD?.voice_clone?.profile_id ? "custom" : "preset");
    const [cloneFormOpen, setCloneFormOpen] = useState(!initialRealtimeVAD?.voice_clone?.profile_id);
    const [loading, setLoading] = useState(false);
    const [cloneLoading, setCloneLoading] = useState(false);
    const [editVoiceId, setEditVoiceId] = useState<string | null>(null);
    const [editLoading, setEditLoading] = useState(false);
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const [recording, setRecording] = useState(false);
    const [recordingSeconds, setRecordingSeconds] = useState(0);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const recordingContextRef = useRef<AudioContext | null>(null);
    const recordingSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const recordingProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const recordingSamplesRef = useRef<Float32Array[]>([]);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<number | null>(null);
    const [cloneForm] = Form.useForm();
    const [editForm] = Form.useForm();

    const emit = useCallback((nextEnabled: boolean, nextConfig: MistralRealtimeVAD) => {
        const value = {realtime: nextEnabled, realtime_vad: nextEnabled ? nextConfig : null};
        toForm?.setFieldsValue({realtime: nextEnabled, realtime_vad: nextEnabled ? nextConfig : null});
        onChange?.(value);
    }, [onChange, toForm]);

    useEffect(() => {
        const next = {...DEFAULTS, ...(initialRealtimeVAD || {})};
        setEnabled(Boolean(initialRealtime));
        setConfig(next);
        const nextInitialGreeting = initialRealtimeVAD?.initial_greeting ?? false;
        setInitialGreeting(nextInitialGreeting);
        setGreetingCollapseOpen(nextInitialGreeting);
        setGreeting(initialRealtimeVAD?.greeting ?? "");
        if (toForm) toForm.setFieldsValue({
            realtime: Boolean(initialRealtime),
            realtime_vad: initialRealtime ? next : null
        });
    }, [initialRealtime, initialRealtimeVAD, toForm]);

    const loadCatalogs = useCallback(async () => {
        if (!provider) return;
        setLoading(true);
        try {
            const models = await getListModelNames(provider, "realtime");
            const uniqueBy = (field: "stt" | "tts") => {
                const seen = new Set<string>();
                return models.filter((model) => {
                    const value = model[field];
                    if (!value || seen.has(value)) return false;
                    seen.add(value);
                    return true;
                }).map((model) => ({...model, name: model[field] as string}));
            };
            const nextSttModels = uniqueBy("stt");
            const nextTtsModels = uniqueBy("tts");
            setRealtimeModels(nextSttModels);
            setTtsModels(nextTtsModels);

            const [presetResult, customResult] = await Promise.allSettled([
                mistralVoiceApi.list({limit: 100, type: "preset"}),
                mistralVoiceApi.list({limit: 100, type: "custom"}),
            ]);
            if (presetResult.status === "fulfilled") setPresetVoices(presetResult.value.items || []);
            if (customResult.status === "fulfilled") setCustomVoices(customResult.value.items || []);
            if (presetResult.status === "rejected" || customResult.status === "rejected") {
            }
        } catch (error) {
            message.error(error instanceof Error ? error.message : t("mistralLoadError") || "Не удалось загрузить настройки Mistral");
        } finally {
            setLoading(false);
        }
    }, [provider]);

    useEffect(() => {
        if (enabled) void loadCatalogs();
    }, [enabled, loadCatalogs, provider]);

    useEffect(() => {
    }, [realtimeModels, ttsModels]);

    const update = (patch: Partial<MistralRealtimeVAD>) => {
        const next = {...config, ...patch};
        setConfig(next);
        emit(enabled, next);
    };

    const updateGreeting = (patch: Pick<MistralRealtimeVAD, "initial_greeting" | "greeting">) => {
        const next = {...config, ...patch};
        setConfig(next);
        emit(enabled, next);
    };

    const playSample = async (voiceId: string) => {
        try {
            if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
            const response = await authFetch(`/v1/model/voices/${encodeURIComponent(voiceId)}/sample`);
            if (!response.ok) throw new Error(t("mistralSampleError") || "Не удалось получить sample");
            const url = URL.createObjectURL(await response.blob());
            audioUrlRef.current = url;
            const audio = new Audio(url);
            audio.onended = () => {
                setPlayingVoice(null);
                URL.revokeObjectURL(url);
                audioUrlRef.current = null;
            };
            setPlayingVoice(voiceId);
            await audio.play();
        } catch (error) {
            setPlayingVoice(null);
            message.error(error instanceof Error ? error.message : t("mistralPlaybackError") || "Ошибка воспроизведения");
        }
    };

    const deleteVoice = async (voiceId: string) => {
        try {
            const response = await authFetch(`/v1/model/voices/${encodeURIComponent(voiceId)}`, {method: "DELETE"});
            if (!response.ok) throw new Error((await response.json().catch(() => ({})))?.error || "Не удалось удалить голос");
            if (config.voice_clone?.profile_id === voiceId) update({voice_clone: null});
            setCustomVoices((items) => items.filter((voice) => voice.id !== voiceId));
            message.success(t("mistralVoiceDeleted") || "Голос удалён");
        } catch (error) {
            message.error(error instanceof Error ? error.message : t("mistralDeleteError") || "Ошибка удаления голоса");
        }
    };

    const updateVoice = async (values: { name?: string; languages?: string; description?: string; tags?: string }) => {
        if (!editVoiceId) return;
        setEditLoading(true);
        try {
            const response = await authFetch(`/v1/model/voices/${encodeURIComponent(editVoiceId)}`, {
                method: "PATCH",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    ...values,
                    languages: values.languages ? values.languages.split(/[,;\n]/).map((value) => value.trim()).filter(Boolean) : undefined,
                    tags: values.tags ? values.tags.split(/[,;\n]/).map((value) => value.trim()).filter(Boolean) : undefined,
                }),
            });
            if (!response.ok) throw new Error((await response.json().catch(() => ({})))?.error || "Не удалось обновить голос");
            const updated = await response.json() as MistralVoice;
            setCustomVoices((items) => items.map((voice) => voice.id === updated.id ? updated : voice));
            setEditVoiceId(null);
            message.success(t("mistralVoiceUpdated") || "Данные голоса обновлены");
        } catch (error) {
            message.error(error instanceof Error ? error.message : t("mistralUpdateError") || "Ошибка обновления голоса");
        } finally {
            setEditLoading(false);
        }
    };

    const cloneVoice = async (values: {
        name: string;
        languages?: string;
        gender?: string;
        description?: string;
        tags?: string
    }) => {
        const file = fileList[0]?.originFileObj;
        if (!file) {
            message.error(t("mistralSelectAudio") || "Выберите аудиофайл");
            return;
        }
        const extension = file.name.toLowerCase().split(".").pop();
        if (!extension || !["wav", "mp3", "flac", "ogg", "pcm", "webm"].includes(extension)) {
            message.error(t("mistralUnsupportedAudio") || "Неподдерживаемый формат аудио");
            return;
        }
        if (file.size > 25 * 1024 * 1024) {
            message.error(t("mistralFileTooLarge") || "Аудиофайл не должен превышать 25 MB");
            return;
        }
        if (recordingSeconds > 0 && recordingSeconds < 3) {
            message.error(t("mistralRecordingTooShort") || "Запись должна длиться минимум 3 секунды");
            return;
        }
        setCloneLoading(true);
        try {
            const body = new FormData();
            body.append("file", file, file.name || "voice-sample.wav");
            body.set("provider", "mistral");
            Object.entries(values).forEach(([key, value]) => {
                if (value) body.set(key, value);
            });

            const response = await authFetch("/v1/model/voice/clone", {method: "POST", body});
            const responseText = await response.text();
            if (!response.ok) {
                let errorMessage = responseText || `Ошибка сервера: ${response.status}`;
                try { errorMessage = JSON.parse(responseText).error || errorMessage; } catch (_) { /* plain text */ }
                throw new Error(errorMessage);
            }
            const result = JSON.parse(responseText) as {voice: MistralVoice};
            const voice = result.voice;
            setCustomVoices((current) => [voice, ...current.filter((item) => item.id !== voice.id)]);
            setVoiceMode("custom");
            setCloneFormOpen(false);
            update({
                voice: null,
                voice_id: null,
                voice_clone: {
                    enabled: true,
                    profile_id: voice.id,
                    reference_audio_id: "",
                    reference_format: "wav",
                    reference_duration_ms: 0
                }
            });
            setFileList([]);
            cloneForm.resetFields();
            message.success(t("mistralVoiceCreated") || "Голос создан");
        } catch (error) {
            message.error(error instanceof Error ? error.message : t("mistralCreateError") || "Не удалось создать голос");
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
            const wav = new File([encodeWav(all, context.sampleRate)], "voice-sample.wav", {type: "audio/wav"});
            setFileList([({uid: `recording-${Date.now()}`, name: wav.name, status: "done", originFileObj: wav} as unknown) as UploadFile]);
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
        if (timerRef.current !== null) window.clearInterval(timerRef.current);
        timerRef.current = null;
        setRecording(false);
    }, []);

    const startRecording = async () => {
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
            timerRef.current = window.setInterval(() => {
                setRecordingSeconds((seconds) => {
                    if (seconds + 1 >= 10) stopRecording();
                    return seconds + 1;
                });
            }, 1000);
        } catch (error) {
            message.error(error instanceof Error ? error.message : t("mistralMicrophoneAccessError") || "Не удалось получить доступ к микрофону");
        }
    };

    useEffect(() => () => {
        stopRecording();
        if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    }, [stopRecording]);

    const handleEnabled = (checked: boolean) => {
        setEnabled(checked);
        emit(checked, config);
    };

    return <>
        <div className="section-title"><AudioOutlined/>{t("mistralRealtimeTitle") || "Mistral realtime"}</div>
        <div
            className="section-description">{t("mistralRealtimeDesc") || "Голосовой режим Mistral Voxtral STT/TTS"}</div>
        <div className="step" style={{marginBottom: enabled ? 16 : 0}}>
            <span>{t("mistralRealtimeEnableLabel") || "Включить голосовой режим"}&nbsp;</span>
            <Tooltip
                title={!modelData ? (t("operatorNeedCreateModel") || "Сначала нужно создать модель!") : ""}
                placement="top"
            >
                <Switch
                    checked={enabled}
                    onChange={handleEnabled}
                    disabled={!modelData}
                    checkedChildren={<span style={{color: "black"}}>{t("Yes") || "Да"}</span>}
                    unCheckedChildren={<span style={{color: "black"}}>{t("No") || "Нет"}</span>}
                />
            </Tooltip>
        </div>
        {enabled && <Space orientation="vertical" style={{width: "100%"}} size="middle">
            {loading ? <Spin/> : <>
                <Row gutter={[16, 0]}>
                    <Col xs={24} md={8}>
                        <Form.Item label={t("mistralSttModel") || "STT модель"}>
                            <Select value={config.stt_model || undefined}
                                    options={realtimeModels.map((m) => ({label: m.name, value: m.name}))}
                                    onChange={(value) => update({stt_model: value})}/>
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item label={t("mistralTtsModel") || "TTS модель"}>
                            <Select value={config.tts_model || undefined}
                                    options={ttsModels.map((m) => ({label: m.name, value: m.name}))}
                                    onChange={(value) => update({tts_model: value})}/>
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item label={t("mistralSttLanguage") || "Язык STT"}>
                            <Select
                                allowClear
                                placeholder={t("mistralLanguageOptional") || "Не обязательно"}
                                value={config.stt_language || undefined}
                                options={["en", "fr", "de", "es", "it", "pt", "nl", "ru", "zh", "ja", "ko", "ar", "pl"]
                                    .map((language) => ({label: language, value: language}))}
                                onChange={(value) => update({stt_language: value || ""})}
                            />
                        </Form.Item>
                    </Col>
                </Row>
                <Collapse
                    ghost
                    activeKey={greetingCollapseOpen ? ["initial-greeting"] : []}
                    onChange={(keys) => setGreetingCollapseOpen(keys.includes("initial-greeting"))}
                    items={[{
                        key: "initial-greeting",
                        label: t("realtimeInitialGreetingLabel") || "Приветствие при начале диалога",
                        children: <div className="espero-form-item">
                    <div className="espero-switch-container">
                        <div className="espero-switch-label">
                            {t("realtimeInitialGreetingLabel") || "Приветствие при начале диалога"}
                            <Tooltip
                                title={t("realtimeInitialGreetingTip") || "Модель произносит приветствие до первого сообщения пользователя."}>
                                <InfoCircleOutlined style={{color: "#999", marginLeft: 6}}/>
                            </Tooltip>
                        </div>
                        <Switch checked={initialGreeting} onChange={(value) => {
                            setInitialGreeting(value);
                            setGreetingCollapseOpen(value);
                            updateGreeting({initial_greeting: value});
                        }}
                                checkedChildren={<span style={{color: "black"}}>{t("Yes") || "Да"}</span>}
                                unCheckedChildren={<span style={{color: "black"}}>{t("No") || "Нет"}</span>}
                        />
                    </div>
                    {initialGreeting && <div className="espero-form-item">
                        <div className="espero-form-label">
                            {t("realtimeGreetingLabel") || "Текст приветствия"}
                            <Tooltip
                                title={t("realtimeGreetingTip") || "Если оставить пустым, модель сформирует приветствие по промпту."}>
                                <InfoCircleOutlined style={{color: "#999", marginLeft: 6}}/>
                            </Tooltip>
                        </div>
                        <Input.TextArea value={greeting} onChange={(event) => {
                            setGreeting(event.target.value);
                            updateGreeting({greeting: event.target.value});
                        }}
                                        placeholder={t("realtimeGreetingPlaceholder") || "Оставьте пустым, чтобы использовать приветствие из промпта"}
                                        autoSize={{minRows: 2, maxRows: 5}}/>
                    </div>}
                        </div>
                    }]}
                />
                <Form.Item label={t("mistralVoice") || "Голос"}>
                    <Space>
                        <Segmented
                            value={voiceMode}
                            onChange={(val) => setVoiceMode(val as "custom" | "preset")}
                            options={[
                                {
                                    label: <span style={{ color: "black" }}>{t("mistralVoiceCustom") || "Клонированный"}</span>,
                                    value: "custom",
                                },
                                {
                                    label: <span style={{ color: "black" }}>{t("mistralVoicePreset") || "Предустановленный"}</span>,
                                    value: "preset",
                                },
                            ]}
                        />
                    </Space>
                </Form.Item>
                {voiceMode === "preset" ? <Form.Item label={t("mistralPresetVoice") || "Preset voice"}><Select value={config.voice || undefined}
                                                                                  options={presetVoices.map((voice) => ({
                                                                                      label: voice.name || voice.id,
                                                                                      value: voice.id
                                                                                  }))} onChange={(value) => update({
                    voice: value,
                    voice_id: null,
                    voice_clone: null
                })}/></Form.Item> : <>
                    <Form.Item label={t("mistralCustomVoice") || "Custom voice"}><Select value={config.voice_clone?.profile_id || undefined}
                                                            options={customVoices.map((voice) => ({
                                                                label: voice.name || voice.id,
                                                                value: voice.id
                                                            }))} onChange={(value) => update({
                        voice: null,
                        voice_id: null,
                        voice_clone: {
                            enabled: true,
                            profile_id: value,
                            reference_audio_id: "",
                            reference_format: "",
                            reference_duration_ms: 0
                        }
                    })}/></Form.Item>
                    <Space wrap>{customVoices.map((voice) => <Space key={voice.id}>
                        <Button size="small" icon={<PlayCircleOutlined/>} loading={playingVoice === voice.id}
                                onClick={() => void playSample(voice.id)}>{t("mistralListen") || "Прослушать"} {voice.name || voice.id}</Button>
                        <Button size="small" onClick={() => setEditVoiceId(voice.id)}>{t("mistralEditVoice") || "Изменить"}</Button>
                    </Space>)}</Space>
                    {editVoiceId && <Form form={editForm} component="div" layout="vertical" onFinish={updateVoice} initialValues={(() => {
                        const voice = customVoices.find((item) => item.id === editVoiceId);
                        return {
                            name: voice?.name,
                            languages: voice?.languages?.join(","),
                            description: voice?.description
                        };
                    })()}>
                        <Form.Item name="name" label={t("mistralName") || "Имя"}><Input/></Form.Item>
                        <Form.Item name="languages" label={t("mistralLanguage") || "Язык"}><Input/></Form.Item>
                        <Form.Item name="description" label={t("mistralDescription") || "Описание"}><Input.TextArea rows={2}/></Form.Item>
                        <Form.Item name="tags" label="Tags"><Input/></Form.Item>
                        <Space><Button onClick={() => editForm.submit()} type="primary" loading={editLoading}>{t("save") || "Сохранить"}</Button><Button
                            onClick={() => setEditVoiceId(null)}>{t("cancel") || "Отмена"}</Button></Space>
                    </Form>}
                    <Collapse
                        ghost
                        activeKey={cloneFormOpen ? ["create-clone"] : []}
                        onChange={(keys) => setCloneFormOpen(keys.includes("create-clone"))}
                        items={[{
                            key: "create-clone",
                            label: t("mistralCreateNewClone") || "Создать новый клонированный голос",
                            children: <Form form={cloneForm} component="div" layout="vertical" onFinish={cloneVoice}>
                        <Form.Item name="name" label={t("mistralNewVoiceName") || "Имя нового голоса"} rules={[{required: true}]}><Input/></Form.Item>
                        <Form.Item name="languages" label={t("mistralLanguage") || "Язык"}><Input placeholder="en"/></Form.Item>
                        <Form.Item name="gender" label={t("mistralGender") || "Пол"}>
                            <Select placeholder={t("mistralChooseGender") || "Выберите пол"}>
                                <Select.Option value="male">Male</Select.Option>
                                <Select.Option value="female">Female</Select.Option>
                                <Select.Option value="neutral">Neutral</Select.Option>
                            </Select>
                        </Form.Item>                        <Form.Item name="description" label={t("mistralDescription") || "Описание"}><Input.TextArea rows={2}/></Form.Item>
                        <Form.Item name="tags" label="Tags"><Input placeholder="support, warm"/></Form.Item>
                        <Form.Item label={t("mistralAudioSample") || "Аудиосэмпл (WAV/MP3/FLAC/OGG/PCM)"}>
                            <Upload
                                beforeUpload={() => false}
                                maxCount={1}
                                fileList={fileList}
                                onChange={({fileList: next}) => setFileList(next)}
                                accept=".wav,.mp3,.flac,.ogg,.pcm"
                            >
                                <Button icon={<UploadOutlined/>} disabled={recording}>{t("mistralChooseFile") || "Выбрать файл"}</Button>
                            </Upload>
                            <Button onClick={recording ? stopRecording : startRecording} danger={recording}
                                    style={{marginTop: 8}}>
                                {recording ? `Остановить запись (${recordingSeconds}/10 с)` : "Записать с микрофона"}
                            </Button>
                            {!recording && recordingSeconds > 0 && recordingSeconds < 3 &&
                                <div>{t("mistralMinRecording") || "Минимальная длительность записи — 3 секунды"}</div>}
                        </Form.Item>
                        <Button onClick={() => cloneForm.submit()} type="primary" loading={cloneLoading}>{t("mistralCreateClone") || "Создать клон"}</Button>
                            </Form>
                        }]}
                    />
                    {config.voice_clone?.profile_id && <Button danger icon={<DeleteOutlined/>}
                                                               onClick={() => {
                                                                   setCloneFormOpen(true);
                                                                   void deleteVoice(config.voice_clone!.profile_id);
                                                               }}>{t("mistralDeleteSelectedVoice") || "Удалить выбранный клонированный голос"}</Button>}
                </>}
            </>}
        </Space>}
    </>;
};
