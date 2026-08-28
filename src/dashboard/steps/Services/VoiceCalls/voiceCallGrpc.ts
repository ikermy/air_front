import { grpc } from "@improbable-eng/grpc-web";
import { getAuthToken } from "../../../../utils/easyUtils";
// Generated from calls.proto. The generated JS is kept as-is because protoc emits
// the protobuf wire implementation while this file contains the typed app API.
// The generated CommonJS file has no compatible declaration export shape;
// cast its imported namespace to the generated protobuf API.
// calls_pb.js is generated as CommonJS; require keeps the generated export shape intact.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pb: any = require("./calls_pb");

export type VoiceCallProvider = "whatsapp" | "telegram";
export type VoiceCallFile = {
    type: string;
    url: string;
    fileName: string;
    caption: string;
};
export type VoiceCallEvent = {
    callId: string;
    sequence: number;
    timestampUnixMs: number;
    provider: VoiceCallProvider;
    type: string;
    delta: string;
    text: string;
    responseId: string;
    reason: string;
    error: string;
    role: string;
    phase: string;
    usage?: unknown;
    files: VoiceCallFile[];
    payload?: unknown;
};

const GRPC_HOST = process.env.NEXT_PUBLIC_GRPC_HOST || "https://localhost:50443";

if (!pb.StartOutgoingCallRequest || !pb.CallProvider || !pb.CallEvent) {
    throw new Error("Voice call protobuf definitions could not be loaded");
}

const method = (path: string, requestType: any, responseType: any, responseStream = false): any => ({
    methodName: path.split("/").pop(),
    service: { serviceName: "calls.v1.Calls" },
    requestStream: false,
    responseStream,
    requestType,
    responseType,
});

const startMethod = method("/calls.v1.Calls/StartOutgoingCall", pb.StartOutgoingCallRequest, pb.StartOutgoingCallResponse);
const eventsMethod = method("/calls.v1.Calls/SubscribeCallEvents", pb.SubscribeCallEventsRequest, pb.CallEvent, true);
const hangupMethod = method("/calls.v1.Calls/HangupCall", pb.HangupCallRequest, pb.HangupCallResponse);

const metadata = (): any => {
    const result = new grpc.Metadata();
    const token = getAuthToken();
    if (token) result.set("authorization", `Bearer ${token}`);
    return result;
};

const providerValue = (provider: VoiceCallProvider): number => {
    const value = provider === "whatsapp"
        ? pb.CallProvider.CALL_PROVIDER_WHATSAPP
        : pb.CallProvider.CALL_PROVIDER_TELEGRAM;
    if (typeof value !== "number") throw new Error(`Unknown call provider: ${provider}`);
    return value;
};

const providerName = (value: number | string): VoiceCallProvider =>
    value === pb.CallProvider.CALL_PROVIDER_TELEGRAM || value === "telegram" ? "telegram" : "whatsapp";

export const startOutgoingCall = (provider: VoiceCallProvider, target: string): Promise<{ callId: string; aiProvider: string }> => new Promise((resolve, reject) => {
    try {
        const request = new pb.StartOutgoingCallRequest();
        request.setProvider(providerValue(provider));
        request.setTarget(target.trim());
        grpc.unary(startMethod, {
            request, host: GRPC_HOST, metadata: metadata(),
            onEnd: ({ status, statusMessage, message }: any) => {
                if (status !== grpc.Code.OK) return reject(Object.assign(new Error(statusMessage || "RPC error"), { code: status }));
                resolve({ callId: message.getCallId(), aiProvider: message.getAiProvider() });
            },
        } as any);
    } catch (error) {
        console.error("[VoiceCalls] failed before RPC request", error);
        reject(error);
    }
});

export const hangupCall = (callId: string): Promise<void> => new Promise((resolve, reject) => {
    const request = new pb.HangupCallRequest();
    request.setCallId(callId); request.setReason("user_requested");
    grpc.unary(hangupMethod, { request, host: GRPC_HOST, metadata: metadata(), onEnd: ({ status, statusMessage }: any) => {
        if (status !== grpc.Code.OK) reject(Object.assign(new Error(statusMessage || "RPC error"), { code: status })); else resolve();
    }} as any);
});

export const subscribeCallEvents = (callId: string, afterSequence: number, onEvent: (event: VoiceCallEvent) => void, onEnd: (code: number, message?: string) => void): { close: () => void } => {
    const request = new pb.SubscribeCallEventsRequest();
    request.setCallId(callId); request.setAfterSequence(afterSequence);
    const stream = grpc.invoke(eventsMethod, {
        request, host: GRPC_HOST, metadata: metadata(),
        onMessage: (message: any) => {
            const files: VoiceCallFile[] = (message.getFilesList() || []).map((file: any) => ({
                type: file.getType() || "",
                url: file.getUrl() || "",
                fileName: file.getFileName() || "",
                caption: file.getCaption() || "",
            }));
            const event: VoiceCallEvent = {
                callId: message.getCallId(),
                sequence: Number(message.getSequence()),
                timestampUnixMs: Number(message.getTimestampUnixMs()),
                provider: providerName(message.getProvider()),
                type: message.getType() || "",
                delta: message.getDelta() || "",
                text: message.getText() || "",
                responseId: message.getResponseId() || "",
                reason: message.getReason() || "",
                error: message.getError() || "",
                role: message.getRole() || "",
                phase: message.getPhase() || "",
                usage: message.getUsage() ? message.getUsage().toObject() : undefined,
                files,
                payload: message.getPayload() ? message.getPayload().toObject() : undefined,
            };
            onEvent(event);
        },
        onEnd: (code: number, message?: string) => onEnd(code, message),
    } as any);
    let closed = false;
    return {
        close: () => {
            if (closed) return;
            closed = true;
            try { stream.close(); } catch (error) {
                // grpc-web throws when close is called after the client ended.
                if (!String(error).toLowerCase().includes("already closed")) throw error;
            }
        },
    };
};

export const isRetryableGrpcCode = (code: number): boolean => code === grpc.Code.Unavailable || code === grpc.Code.Unknown;
export const isAuthGrpcCode = (code: number): boolean => code === grpc.Code.Unauthenticated;
