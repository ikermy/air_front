import { useEffect, useRef } from 'react';

const DEMO_URL = window.runtimeConfig?.REACT_APP_DEMO || process.env.REACT_APP_DEMO;

export function SimpleReceiver({ addMessage, token, setIsModalOpen, setModelName }) {
    const esRef = useRef(null);
    const reconnectTimerRef = useRef(null);

    useEffect(() => {
        const connect = () => {
            // Close existing before creating new
            if (esRef.current) {
                try {
                    esRef.current.close();
                } catch (e) {
                    console.warn('Error closing existing EventSource', e);
                }
                esRef.current = null;
            }

            const url = `${DEMO_URL}/events?token=${encodeURIComponent(token || '')}`;

            let eventSource;
            try {
                eventSource = new EventSource(url);
            } catch (err) {
                console.error('Failed to create EventSource', err);
                scheduleReconnect();
                return;
            }

            esRef.current = eventSource;

            eventSource.onopen = () => {
            };

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'assist') {
                        let imageUrl = null;
                        let content = data.content;
                        const imgRegex = /<img[^>]*src=['"]([^'"]+)['"][^>]*>/;
                        const match = content.match(imgRegex);
                        if (match) {
                            imageUrl = match[1];
                            content = content.replace(imgRegex, '');
                        }
                        setModelName(data.name); // Обновляем имя модели
                        addMessage(content.trim(), data.name, 'right', new Date(data.timestamp), imageUrl);
                    } else if (data.type === 'user') {
                        addMessage(data.content, data.name, 'left', new Date(data.timestamp));
                    }
                } catch (err) {
                    console.error('Ошибка при парсинге JSON:', err);
                }
            };

            eventSource.addEventListener('shutdown', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.warn('Server shutdown:', data?.message);
                    eventSource.close();
                } catch (err) {
                    console.error('Ошибка при обработке shutdown события:', err);
                }
            });

            eventSource.addEventListener('timeout', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.warn('Connection timeout:', data?.message);
                    // Попробовать переподключиться
                    scheduleReconnect();
                } catch (err) {
                    console.error('Ошибка при обработке timeout события:', err);
                }
            });

            eventSource.onerror = (error) => {
                console.error('EventSource error, readyState=', eventSource.readyState, error);
                // При ошибке пробуем переподключиться (backoff)
                if (eventSource.readyState === EventSource.CLOSED || eventSource.readyState === EventSource.CONNECTING) {
                    scheduleReconnect();
                }
            };
        };

        const scheduleReconnect = () => {
            if (reconnectTimerRef.current) return;
            reconnectTimerRef.current = setTimeout(() => {
                reconnectTimerRef.current = null;
                connect();
            }, 2000);
        };

        connect();

        return () => {
            if (esRef.current) {
                try {
                    esRef.current.close();
                } catch (e) {
                    console.warn('Error closing EventSource on cleanup', e);
                }
                esRef.current = null;
            }
            if (reconnectTimerRef.current) {
                clearTimeout(reconnectTimerRef.current);
                reconnectTimerRef.current = null;
            }
        };
    }, [addMessage, setIsModalOpen, setModelName, token]);

    return null;
}