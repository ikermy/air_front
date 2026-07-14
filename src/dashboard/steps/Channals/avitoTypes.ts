/**
 * Типы для Avito OAuth интеграции
 */

export interface AvitoAuthURLResponse {
    auth_url: string;
}

export interface AvitoAuthError {
    error: string;
    details?: string;
}

export interface AvitoChannelData {
    key: string;
    label: string;
    icon: React.ReactNode;
    isExpanded: boolean;
    isEnabled: boolean;
    data: string;
    isConnected?: boolean;
    connectionStatus?: 'connected' | 'disconnected' | 'error';
}

export interface AvitoAuthCallbacks {
    onSuccess?: () => void;
    onError?: (error: string) => void;
    onUpdateToken?: () => void;
}

/**
 * Типы для Avito Chats API
 */

export interface AvitoMessage {
    id: string;
    text: string;
    created: number; // Unix timestamp
    direction: 'in' | 'out';
    author: {
        id: number;
        name?: string;
    };
}

export interface ChatUser {
    id: number;
    name: string;
}

export interface ChatContext {
    type: 'item' | 'user';
    value: any;
}

export interface Chat {
    id: string;
    created: number;
    updated: number;
    context: ChatContext;
    users: ChatUser[];
    last_message?: AvitoMessage;
}

export interface ChatsResponse {
    chats: Chat[];
}

export interface ChatsQueryParams {
    limit?: number;      // 1-100, default 10
    offset?: number;     // 0-1000, default 0
    unread_only?: boolean; // default false
}

/**
 * Типы для Avito Webhooks API
 */

export interface Subscription {
    url: string;
}

export interface SubscriptionsResponse {
    subscriptions: Subscription[];
}

export interface WebhookActionResponse {
    status: string;
    url: string;
}

export interface ErrorResponse {
    error: string;
}
