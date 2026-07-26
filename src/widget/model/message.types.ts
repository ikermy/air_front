export type MessageSide = 'left' | 'right';

export interface ChatFile {
    url: string;
    file_name: string;
    type?: string;
}

export interface ChatFiles {
    images: ChatFile[];
    videos: ChatFile[];
    audio: ChatFile[];
    documents: ChatFile[];
}

export interface ChatMessage {
    id: string;
    text: string;
    name: string;
    side: MessageSide;
    timestamp: Date;
    imageUrl: string | null;
    files: ChatFiles | null;
}

export interface AddMessageInput {
    message: unknown;
    name: string;
    side: MessageSide;
    timestamp: Date;
    imageUrl?: string | null;
    files?: Array<{
        type?: string;
        url: string;
        fileName?: string;
        file_name?: string;
        caption?: string;
    }> | null;
}
