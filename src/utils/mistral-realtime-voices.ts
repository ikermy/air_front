import {authFetch} from "./easyUtils";

export interface MistralVoice {
    id: string;
    name?: string;
    languages?: string[];
    description?: string;
}

export interface MistralVoiceList {
    items: MistralVoice[];
}

export function createMistralVoiceApi() {
    return {
        async list(params: {limit?: number; offset?: number; type?: string} = {}): Promise<MistralVoiceList> {
            const query = new URLSearchParams();
            if (params.limit !== undefined) query.set("limit", String(params.limit));
            if (params.offset !== undefined) query.set("offset", String(params.offset));
            if (params.type !== undefined) query.set("type", params.type);
            const response = await authFetch(`/v1/model/voices?${query.toString()}`);
            if (!response.ok) throw new Error(await response.text());
            return response.json() as Promise<MistralVoiceList>;
        },
    };
}
