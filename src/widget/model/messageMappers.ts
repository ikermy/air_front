import {AddMessageInput, ChatFiles} from './message.types';

export interface ProcessedMessage {
    text: string;
    imageUrl: string | null;
}

export function processMessageWithImages(message: unknown): ProcessedMessage {
    if (typeof message !== 'string') {
        if (message && typeof message === 'object' && 'message' in message) {
            return processMessageWithImages((message as {message: unknown}).message);
        }
        return {text: typeof message === 'object' ? JSON.stringify(message) : String(message), imageUrl: null};
    }

    const match = message.match(/<img[^>]*src=\\?"([^"\\]+)\\?"[^>]*>/);
    if (!match) return {text: message, imageUrl: null};
    return {text: message.replace(match[0], '').trim(), imageUrl: match[1]};
}

export function mapChatFiles(
    files: AddMessageInput['files'],
    imageUrl: string | null,
): ChatFiles | null {
    if (files?.length) {
        const map = (types: string[]) => files
            .filter((file) => types.includes(file.type || ''))
            .map((file) => ({
                url: file.url,
                file_name: file.fileName || file.file_name || 'file',
                type: file.type,
            }));

        return {
            images: map(['photo', 'image']),
            videos: map(['video']),
            audio: map(['audio']),
            documents: map(['doc', 'document']),
        };
    }

    return imageUrl ? {
        images: [{url: imageUrl, file_name: 'image'}],
        videos: [],
        audio: [],
        documents: [],
    } : null;
}

export function createChatMessage(input: AddMessageInput, id = `${input.timestamp.getTime()}-${Math.random()}`) {
    const processed = processMessageWithImages(input.message);
    const finalImageUrl = input.imageUrl || processed.imageUrl;
    return {
        id,
        text: processed.text,
        name: input.name,
        side: input.side,
        timestamp: input.timestamp,
        imageUrl: finalImageUrl,
        files: mapChatFiles(input.files, finalImageUrl),
    };
}
