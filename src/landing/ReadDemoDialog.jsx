import { useEffect } from 'react';

const LAND_URL = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND) || process.env.REACT_APP_LAND;

export function ReadDemoDialog({ userName, token, onDialogData }) {
    useEffect(() => {
        async function fetchDialogData() {
            try {
                const params = new URLSearchParams({ token, name: userName });
                const url = `${LAND_URL}/demo/dialog?${params.toString()}`;

                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                // Получаем JSON-ответ от сервера
                const dialogData = await response.json();

                // Проверяем, вернул ли сервер сообщение "No dialog found"
                if (dialogData.message === "No dialog found") {
                    const fullData = {
                        noDialog: true
                    };
                    onDialogData(fullData);
                    return;
                }

                // Проверяем, существует ли поле Data и является ли оно строкой
                if (!dialogData.Data || typeof dialogData.Data !== 'string') {
                    throw new Error(`Invalid or missing Data field: ${dialogData.Data}`);
                }

                // Преобразуем поле Data (строка) в массив строк JSON
                const dataArray = JSON.parse(dialogData.Data);

                // Каждая строка распарсивается в объект; если в message содержится тег <img>, извлекаем URL изображения
                const parsedMessages = dataArray.map(item => {
                    try {
                        const message = JSON.parse(item);
                        if (message.message && typeof message.message === "string") {
                            const imgRegex = /<img[^>]*src=['"]([^'"]+)['"][^>]*>/;
                            const match = message.message.match(imgRegex);
                            if (match) {
                                message.imageUrl = match[1];
                                message.message = message.message.replace(imgRegex, '').trim();
                            }
                        }
                        return message;
                    } catch (error) {
                        console.error('Error parsing message:', item, error);
                        return null;
                    }
                }).filter(Boolean); // Убираем элементы, которые не удалось разобрать

                const fullData = {
                    User: dialogData.User,
                    Assist: dialogData.Assist,
                    Data: parsedMessages,
                    Date: dialogData.Date
                };

                onDialogData(fullData);
            } catch (error) {
                console.error('Failed to fetch dialog data:', error);
            }
        }

        fetchDialogData();
    }, [userName, token, onDialogData]);

    return null;
}
