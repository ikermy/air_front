// package: calls.v1
// file: src/dashboard/steps/Services/VoiceCalls/calls.proto

import * as jspb from "google-protobuf";

export class StartOutgoingCallRequest extends jspb.Message {
  getProvider(): CallProviderMap[keyof CallProviderMap];
  setProvider(value: CallProviderMap[keyof CallProviderMap]): void;

  getTarget(): string;
  setTarget(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): StartOutgoingCallRequest.AsObject;
  static toObject(includeInstance: boolean, msg: StartOutgoingCallRequest): StartOutgoingCallRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: StartOutgoingCallRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): StartOutgoingCallRequest;
  static deserializeBinaryFromReader(message: StartOutgoingCallRequest, reader: jspb.BinaryReader): StartOutgoingCallRequest;
}

export namespace StartOutgoingCallRequest {
  export type AsObject = {
    provider: CallProviderMap[keyof CallProviderMap],
    target: string,
  }
}

export class StartOutgoingCallResponse extends jspb.Message {
  getCallId(): string;
  setCallId(value: string): void;

  getStatus(): string;
  setStatus(value: string): void;

  getAiProvider(): string;
  setAiProvider(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): StartOutgoingCallResponse.AsObject;
  static toObject(includeInstance: boolean, msg: StartOutgoingCallResponse): StartOutgoingCallResponse.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: StartOutgoingCallResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): StartOutgoingCallResponse;
  static deserializeBinaryFromReader(message: StartOutgoingCallResponse, reader: jspb.BinaryReader): StartOutgoingCallResponse;
}

export namespace StartOutgoingCallResponse {
  export type AsObject = {
    callId: string,
    status: string,
    aiProvider: string,
  }
}

export class SubscribeCallEventsRequest extends jspb.Message {
  getCallId(): string;
  setCallId(value: string): void;

  getAfterSequence(): number;
  setAfterSequence(value: number): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SubscribeCallEventsRequest.AsObject;
  static toObject(includeInstance: boolean, msg: SubscribeCallEventsRequest): SubscribeCallEventsRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: SubscribeCallEventsRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SubscribeCallEventsRequest;
  static deserializeBinaryFromReader(message: SubscribeCallEventsRequest, reader: jspb.BinaryReader): SubscribeCallEventsRequest;
}

export namespace SubscribeCallEventsRequest {
  export type AsObject = {
    callId: string,
    afterSequence: number,
  }
}

export class HangupCallRequest extends jspb.Message {
  getCallId(): string;
  setCallId(value: string): void;

  getReason(): string;
  setReason(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): HangupCallRequest.AsObject;
  static toObject(includeInstance: boolean, msg: HangupCallRequest): HangupCallRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: HangupCallRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): HangupCallRequest;
  static deserializeBinaryFromReader(message: HangupCallRequest, reader: jspb.BinaryReader): HangupCallRequest;
}

export namespace HangupCallRequest {
  export type AsObject = {
    callId: string,
    reason: string,
  }
}

export class HangupCallResponse extends jspb.Message {
  getCallId(): string;
  setCallId(value: string): void;

  getStatus(): string;
  setStatus(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): HangupCallResponse.AsObject;
  static toObject(includeInstance: boolean, msg: HangupCallResponse): HangupCallResponse.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: HangupCallResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): HangupCallResponse;
  static deserializeBinaryFromReader(message: HangupCallResponse, reader: jspb.BinaryReader): HangupCallResponse;
}

export namespace HangupCallResponse {
  export type AsObject = {
    callId: string,
    status: string,
  }
}

export class CallEvent extends jspb.Message {
  getCallId(): string;
  setCallId(value: string): void;

  getSequence(): number;
  setSequence(value: number): void;

  getTimestampUnixMs(): number;
  setTimestampUnixMs(value: number): void;

  getProvider(): CallProviderMap[keyof CallProviderMap];
  setProvider(value: CallProviderMap[keyof CallProviderMap]): void;

  getType(): CallEventTypeMap[keyof CallEventTypeMap];
  setType(value: CallEventTypeMap[keyof CallEventTypeMap]): void;

  getDelta(): string;
  setDelta(value: string): void;

  getText(): string;
  setText(value: string): void;

  getResponseId(): string;
  setResponseId(value: string): void;

  getReason(): string;
  setReason(value: string): void;

  getError(): string;
  setError(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): CallEvent.AsObject;
  static toObject(includeInstance: boolean, msg: CallEvent): CallEvent.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: CallEvent, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): CallEvent;
  static deserializeBinaryFromReader(message: CallEvent, reader: jspb.BinaryReader): CallEvent;
}

export namespace CallEvent {
  export type AsObject = {
    callId: string,
    sequence: number,
    timestampUnixMs: number,
    provider: CallProviderMap[keyof CallProviderMap],
    type: CallEventTypeMap[keyof CallEventTypeMap],
    delta: string,
    text: string,
    responseId: string,
    reason: string,
    error: string,
  }
}

export interface CallProviderMap {
  CALL_PROVIDER_UNSPECIFIED: 0;
  CALL_PROVIDER_WHATSAPP: 1;
  CALL_PROVIDER_TELEGRAM: 2;
}

export const CallProvider: CallProviderMap;

export interface CallEventTypeMap {
  CALL_EVENT_TYPE_UNSPECIFIED: 0;
  CALL_STARTED: 1;
  REALTIME_STARTING: 2;
  REALTIME_STARTED: 3;
  REALTIME_SUBSCRIBED: 4;
  AUDIO_BRIDGE_STARTED: 5;
  CALL_CONNECTED: 6;
  INPUT_TRANSCRIPT_DELTA: 7;
  INPUT_TRANSCRIPT_DONE: 8;
  RESPONSE_STARTED: 9;
  RESPONSE_TEXT_DELTA: 10;
  RESPONSE_DONE: 11;
  ERROR: 12;
  CALL_ENDED: 13;
}

export const CallEventType: CallEventTypeMap;

