import React, {useEffect, useRef, useState} from "react";
import {Alert, Avatar, BorderBeam, Button, Card, Form, Input, List, Radio, Space, Tag, Typography} from "antd";
import {
    GeminiFilled,
    MistralFilled,
    OpenAIFilled,
    PhoneOutlined,
    StopOutlined,
    TelegramFilled,
    UserOutlined,
    WhatsAppOutlined
} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import {grpc} from "@improbable-eng/grpc-web";
import {
    hangupCall,
    isAuthGrpcCode,
    isRetryableGrpcCode,
    startOutgoingCall,
    subscribeCallEvents,
    VoiceCallEvent,
    VoiceCallProvider
} from "./VoiceCalls/voiceCallGrpc";

const retryDelays = [1000, 2000, 5000, 10000, 30000];

export function VoiceCallService(): React.ReactElement {
    const {t} = useTranslation();
    const [form] = Form.useForm();
    const [callId, setCallId] = useState<string | null>(null);
    const [aiProvider, setAiProvider] = useState("");
    const [status, setStatus] = useState<"idle" | "starting" | "connected" | "ending" | "ended" | "error">("idle");
    const [transcriptMessages, setTranscriptMessages] = useState<Array<{
        id: string;
        role: "client" | "model";
        text: string;
        complete: boolean;
        notice?: string;
        removing?: boolean
    }>>([]);
    const [error, setError] = useState("");
    const streamRef = useRef<{ close: () => void } | null>(null);
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const sequenceRef = useRef(-1);
    const retryIndexRef = useRef(0);
    const callRef = useRef<{ provider: VoiceCallProvider; target: string; id: string } | null>(null);
    const callEndedRef = useRef(false);
    const messageRefs = useRef<Record<string, string>>({});
    const messageCounter = useRef(0);
    const disappearingTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

    const errorText = (code: number, raw?: string): string => {
        if (isAuthGrpcCode(code)) return t("voiceCallAuthError");
        if (code === grpc.Code.FailedPrecondition) return t("voiceCallModelUnavailable");
        if (code === grpc.Code.InvalidArgument) return t("voiceCallInvalidTarget");
        if (code === grpc.Code.PermissionDenied) return t("voiceCallPermissionError");
        if (code === grpc.Code.NotFound) return t("voiceCallNotFound");
        if (code === grpc.Code.Unavailable) return t("voiceCallBackendUnavailable");
        return raw || t("voiceCallGenericError");
    };

    const openStream = (id: string, afterSequence: number) => {
        const current = callRef.current;
        if (!current || current.id !== id || callEndedRef.current) return;
        streamRef.current?.close();
        streamRef.current = subscribeCallEvents(id, afterSequence, handleEvent, (code, raw) => {
            if (!callRef.current || callRef.current.id !== id || callEndedRef.current) return;
            if (isRetryableGrpcCode(code)) {
                const delay = retryDelays[Math.min(retryIndexRef.current++, retryDelays.length - 1)];
                retryTimerRef.current = setTimeout(() => openStream(id, Math.max(0, sequenceRef.current)), delay);
            } else {
                setError(errorText(code, raw));
                setStatus("error");
            }
        });
    };

    const handleEvent = (event: VoiceCallEvent) => {
        if (event.sequence <= sequenceRef.current) return;
        sequenceRef.current = event.sequence;
        if (event.type === "CALL_CONNECTED") setStatus("connected");
        if (event.type === "INPUT_TRANSCRIPT_DELTA") appendTranscriptDelta("client", event.delta);
        if (event.type === "INPUT_TRANSCRIPT_DONE") completeTranscript("client", event.text);
        if (event.type === "RESPONSE_TEXT_DELTA") {
            const text = event.delta || event.text;
            if (text.trim().toLowerCase() === "пользователь перебил ответ") markInterrupted();
            else appendTranscriptDelta("model", text);
        }
        if (event.type === "RESPONSE_DONE") completeTranscript("model", event.text);
        if (event.type === "ERROR") setError(event.error || t("voiceCallGenericError"));
        if (event.type === "CALL_ENDED") {
            callEndedRef.current = true;
            streamRef.current?.close();
            streamRef.current = null;
            callRef.current = null;
            setCallId(null);
            setStatus("ended");
        }
    };

    const start = async (values: { provider: VoiceCallProvider; target: string }) => {
        setStatus("starting");
        setError("");
        setAiProvider("");
        setTranscriptMessages([]);
        messageRefs.current = {};
        sequenceRef.current = -1;
        retryIndexRef.current = 0;
        callEndedRef.current = false;
        try {
            const started = await startOutgoingCall(values.provider, values.target);
            setAiProvider(started.aiProvider);
            callRef.current = {provider: values.provider, target: values.target, id: started.callId};
            setCallId(started.callId);
            openStream(started.callId, 0);
        } catch (e: any) {
            setError(errorText(e.code, e.message));
            setStatus("error");
        }
    };

    const stop = async () => {
        const current = callRef.current;
        if (!current || callEndedRef.current) return;
        setStatus("ending");
        try {
            await hangupCall(current.id);
        } catch (e: any) {
            setError(errorText(e.code, e.message));
            setStatus("error");
        }
    };

    const appendTranscriptDelta = (role: "client" | "model", delta = "") => {
        if (!delta) return;
        setTranscriptMessages(messages => {
            const id = messageRefs.current[role] || `${role}-${++messageCounter.current}`;
            messageRefs.current[role] = id;
            const exists = messages.some(message => message.id === id);
            if (exists) return messages.map(message => message.id === id ? {
                ...message,
                text: message.text + delta,
                removing: false
            } : message);
            const next = [...messages, {id, role, text: delta, complete: false}];
            return trimMessages(next);
        });
    };

    const trimMessages = (messages: Array<{
        id: string;
        role: "client" | "model";
        text: string;
        complete: boolean;
        notice?: string;
        removing?: boolean
    }>) => {
        if (messages.length <= 8) return messages;
        const oldest = messages[0];
        const marked = messages.map(message => message.id === oldest.id ? {...message, removing: true} : message);
        setTimeout(() => setTranscriptMessages(current => current.filter(message => message.id !== oldest.id)), 350);
        return marked;
    };

    const markInterrupted = () => {
        setTranscriptMessages(messages => {
            const index = [...messages].reverse().findIndex(message => message.role === "model");
            if (index < 0) return messages;
            const targetIndex = messages.length - 1 - index;
            return messages.map((message, currentIndex) => currentIndex === targetIndex
                ? {...message, notice: "пользователь перебил ответ"} : message);
        });
    };

    const completeTranscript = (role: "client" | "model", fallback = "") => {
        let id = messageRefs.current[role];
        if (!id && fallback) {
            id = `${role}-${++messageCounter.current}`;
            messageRefs.current[role] = id;
            setTranscriptMessages(messages => trimMessages([...messages, {id, role, text: fallback, complete: true}]));
        }
        if (!id) return;
        setTranscriptMessages(messages => messages.map(message => message.id === id
            ? {...message, text: message.text || fallback, complete: true} : message));
        delete messageRefs.current[role];
        const timer = setTimeout(() => setTranscriptMessages(messages => messages.filter(message => message.id !== id)), 8000);
        disappearingTimers.current.push(timer);
    };

    useEffect(() => () => {
        streamRef.current?.close();
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        disappearingTimers.current.forEach(clearTimeout);
        callRef.current = null;
    }, []);
    const active = ["starting", "connected", "ending"].includes(status);
    const modelIcon = (() => {
        switch (aiProvider.trim().toLowerCase()) {
            case "mistral":
                return <MistralFilled/>;
            case "openai":
                return <OpenAIFilled/>;
            case "google":
                return <GeminiFilled/>;
            default:
                return <GeminiFilled/>;
        }
    })();

    return <Card title={<span><PhoneOutlined/> {t("voiceCallService")}</span>}>
        <Typography.Paragraph type="secondary">{t("voiceCallServiceDescription")}</Typography.Paragraph>
        <Form form={form} layout="vertical" onFinish={start} disabled={active} initialValues={{provider: "whatsapp"}}>
            <Space.Compact style={{minWidth: 330, maxWidth: 500}}>
                <Form.Item name="provider" label={t("voiceCallProvider")} rules={[{required: true}]}
                           style={{width: "34%"}}>
                    <Radio.Group optionType="button" buttonStyle="solid"
                                 style={{display: "flex", width: "100%", height: 40}}>
                        <Radio.Button value="whatsapp" style={{
                            flex: 1,
                            textAlign: "center",
                            height: 40,
                            lineHeight: "38px",
                            padding: 0
                        }}><WhatsAppOutlined/></Radio.Button>
                        <Radio.Button value="telegram" style={{
                            flex: 1,
                            textAlign: "center",
                            height: 40,
                            lineHeight: "38px",
                            padding: 0
                        }}><TelegramFilled/></Radio.Button>
                    </Radio.Group>
                </Form.Item>
                <Form.Item noStyle shouldUpdate={(previous, current) => previous.provider !== current.provider}>
                    {({getFieldValue}) => {
                        const telegram = getFieldValue("provider") === "telegram";
                        return <Form.Item
                            name="target"
                            label={t("voiceCallTarget")}
                            rules={[
                                {
                                    required: true,
                                    message: t("voiceCallTargetRequired") || "Пожалуйста, введите номер или Telegram username!",
                                },
                                {
                                    whitespace: true,
                                    message: t("voiceCallTargetEmpty") || "Поле не может быть пустым!",
                                },
                                telegram
                                    ? {
                                        pattern: /^(?:\+?[0-9][0-9\s()-]{5,}|@?[a-zA-Z0-9_]{5,})$/,
                                        message: t("voiceCallTelegramInvalid") || "Введите корректное имя, например @my_group",
                                    }
                                    : {
                                        pattern: /^\+?[0-9][0-9\s()-]{5,}$/,
                                        message: t("voiceCallInvalidTarget") || "Введите корректный номер телефона",
                                    },
                            ]}
                            style={{width: "66%"}}
                        >
                            <Input placeholder={telegram ? "@pavel" : t("voiceCallTargetPlaceholder")} size="large"/>
                        </Form.Item>;
                    }}
                </Form.Item>
            </Space.Compact>
            <Button type="primary" htmlType="submit" icon={<PhoneOutlined/>} loading={status === "starting"}
                    disabled={active}>{t("voiceCallStart")}</Button>
        </Form>
        {active && <Button danger icon={<StopOutlined/>} onClick={stop} loading={status === "ending"}
                           style={{marginTop: 8}}>{t("voiceCallHangup")}</Button>}
        {callId && <Typography.Paragraph style={{marginTop: 16}}><Tag
            color={status === "connected" ? "green" : "blue"}>{t(`voiceCallStatus${status[0].toUpperCase()}${status.slice(1)}`)}</Tag> {t("voiceCallId")}: {callId}
        </Typography.Paragraph>}
        {error && <Alert type="error" showIcon title={error} style={{marginTop: 12}}/>}
        {!!transcriptMessages.length && <BorderBeam color={[
            {color: "#1677ff", percent: 0},
            {color: "#722ed1", percent: 52},
            {color: "#13c2c2", percent: 100},
        ]} duration={5} size={80} lineWidth={2}>
            <Card size="small" title={<Typography.Text strong>Live transcript</Typography.Text>}
                  style={{marginTop: 16, border: 0, background: "rgba(22, 119, 255, 0.03)"}}>
                <List dataSource={transcriptMessages} split={false} renderItem={message => <List.Item style={{
                    justifyContent: message.role === "client" ? "flex-start" : "flex-end",
                    opacity: message.removing ? 0 : message.complete ? 0.92 : 1,
                    transform: message.removing ? "translateY(-6px)" : "none",
                    transition: "opacity 350ms ease, transform 350ms ease"
                }}>
                    <Space align="start" style={{maxWidth: "85%"}}>
                        {message.role === "client" && <Avatar size="small" icon={<UserOutlined/>}/>}
                        <span><Typography.Text>{message.text}</Typography.Text>{message.notice &&
                            <Typography.Text type="secondary" style={{
                                display: "block",
                                fontSize: 12,
                                marginTop: 3
                            }}>{message.notice}</Typography.Text>}</span>
                        {message.role === "model" &&
                            <Avatar size="small" icon={modelIcon} style={{background: "#1677ff"}}/>}
                    </Space>
                </List.Item>}/>
            </Card>
        </BorderBeam>}
    </Card>;
}
