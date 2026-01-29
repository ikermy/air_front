import {useEffect} from 'react';

const LAND_URL = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND) || process.env.REACT_APP_LAND;

export function Receiver({addMessage, token, setIsModalOpen, setModelName}) {
    useEffect(() => {

        let eventSource;
        const connect = () => {
            eventSource = new EventSource(`${LAND_URL}/widget/events?token=${token}`);
            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.Type === 'assist') {
                        let content = typeof data.Content === 'object' ? data.Content.message : data.Content;
                        let files = [];

                        // Обработка файлов из action.send_files
                        if (data.Content && data.Content.action && data.Content.action.send_files) {
                            files = data.Content.action.send_files.map(file => ({
                                type: file.type, // photo, video, audio, doc
                                url: file.url,
                                fileName: file.file_name,
                                caption: file.caption
                            }));
                        }

                        // Если есть только файлы без текстового сообщения
                        if (!content && files.length > 0) {
                            content = files[0].caption || '';
                        }

                        setModelName(data.Name); // Обновляем имя модели
                        addMessage(content ? content.trim() : '', data.Name, 'right', new Date(data.Timestamp), null, files);
                    } else if (data.Type === 'user') {
                        addMessage(data.Content.message, data.Name, 'left', new Date(data.Timestamp));
                    }
                } catch (err) {
                    console.error('Ошибка при парсинге JSON:', err);
                }
            };

            eventSource.addEventListener('shutdown', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.warn('Server shutdown:', data.message);
                    setIsModalOpen(false);

                    eventSource.close();
                } catch (err) {
                    console.error('Ошибка при обработке shutdown события:', err);
                }
            });

            eventSource.addEventListener('timeout', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.warn('Connection timeout:', data.message);

                    // Автоматически переподключиться можно через небольшой timeout
                    setTimeout(() => {
                        if (eventSource.readyState === EventSource.CLOSED) {
                            connect(); // Переподключение
                        }
                    }, 2000);

                } catch (err) {
                    console.error('Ошибка при обработке timeout события:', err);
                }
            });

            eventSource.onerror = (error) => {
                console.error('EventSource failed:', error);
                        setIsModalOpen(false);
                        eventSource.close();
            };
        };

        connect();

        return () => {
            if (eventSource) {
                eventSource.close();
            }
        };
    }, [addMessage, setIsModalOpen, token, setModelName]);

    return null;
}
