import {useEffect} from 'react';
import {createWidgetEventsTicket, getWidgetEventsUrl, WidgetSseAssistEvent} from "../widgetUtils";

export interface WidgetEventFile {
    type?: string;
    url: string;
    fileName?: string;
    caption?: string;
}

interface UseWidgetEventsOptions {
    token: string;
    onAssist: (content: string, name: string, timestamp: Date, files: WidgetEventFile[]) => void;
    onShutdown: () => void;
    onError: () => void;
}

export function useWidgetEvents({token, onAssist, onShutdown, onError}: UseWidgetEventsOptions) {
    useEffect(() => {
        let source: EventSource | undefined;
        let disposed = false;

        const connect = async () => {
            try {
                const ticket = await createWidgetEventsTicket(token);
                if (disposed) return;
                source = new EventSource(getWidgetEventsUrl(ticket));

                source.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data) as WidgetSseAssistEvent;
                        if (data.Type !== 'assist') return;
                        const contentObject = typeof data.Content === 'object' ? data.Content : null;
                        let content = contentObject?.message || (typeof data.Content === 'string' ? data.Content : '');
                        const files = (contentObject?.action?.send_files || []).map((file) => ({
                            type: file.type,
                            url: file.url,
                            fileName: file.file_name,
                            caption: file.caption,
                        }));
                        if (!content && files.length) content = files[0].caption || '';
                        onAssist(content.trim(), data.Name, new Date(data.Timestamp), files);
                    } catch (error) {
                        console.error('Ошибка при парсинге JSON:', error);
                    }
                };

                source.addEventListener('shutdown', () => {
                    onShutdown();
                    source?.close();
                });
                source.onerror = (error) => {
                    console.error('EventSource failed:', error);
                    onError();
                    source?.close();
                };
            } catch (error) {
                console.error('Failed to create SSE ticket:', error);
                if (!disposed) onError();
            }
        };

        void connect();
        return () => {
            disposed = true;
            source?.close();
        };
    }, [onAssist, onError, onShutdown, token]);
}
