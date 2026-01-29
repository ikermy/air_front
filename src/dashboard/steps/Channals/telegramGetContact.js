import {validateAndRefreshToken} from "../../../utils/easyUtils";

export const telegramGetContact = async (token, onProgress = null, t = null) => {
    const LAND_WSS = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND_WSS) || process.env.REACT_APP_LAND_WSS;

    // Fallback для функции перевода
    const translate = t || ((key) => key);

    const makeWebSocketRequest = async (authToken) => {
        return new Promise((resolve, reject) => {
            // Токен передается в URL, а не в сообщении
            const ws = new WebSocket(`${LAND_WSS}/ws/tguser/contacts?token=${authToken}`);
            let timeoutId;
            let contacts = {
                humans: [],
                bots: [],
                channels: [],
                groups: [],
                supergroups: []
            };

            timeoutId = setTimeout(() => {
                ws.close();
                reject(new Error(translate("tgContactConnectionTimeout") || "Таймаут соединения WebSocket"));
            }, 30000);

            ws.onopen = () => {
                if (onProgress) {
                    onProgress({
                        type: 'status',
                        message: translate("tgContactConnectionEstablished") || "Соединение установлено",
                        progress: 0
                    });
                }
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    switch(data.type) {
                        case 'status':
                            if (onProgress) {
                                onProgress({
                                    type: 'status',
                                    message: data.message,
                                    progress: Math.round(data.progress || 0)
                                });
                            }
                            break;
                        case 'contact':
                            const contactName = data.data.first_name || data.data.title || data.data.username || translate("tgContactUnknown") || 'Неизвестно';

                            if (onProgress) {
                                onProgress({
                                    type: 'contact',
                                    message: `${translate("tgContactLoaded") || "Загружен контакт:"} ${contactName}`,
                                    current: data.current,
                                    total: data.total,
                                    progress: Math.round(data.progress || 0)
                                });
                            }

                            // Определяем категорию контакта и добавляем в соответствующий массив
                            const contact = data.data;

                            // Классифицируем контакты по типу
                            if (contact.is_bot) {
                                contacts.bots.push(contact);
                            } else if (contact.type === 'channel') {
                                contacts.channels.push(contact);
                            } else if (contact.type === 'supergroup') {
                                contacts.supergroups.push(contact);
                            } else if (contact.type === 'group') {
                                contacts.groups.push(contact);
                            } else if (contact.type === 'private' || contact.first_name || contact.last_name) {
                                // Обычные пользователи
                                contacts.humans.push(contact);
                            } else {
                                // По умолчанию считаем пользователем
                                contacts.humans.push(contact);
                            }
                            break;
                        case 'complete':
                            clearTimeout(timeoutId);
                            ws.close();

                            if (onProgress) {
                                onProgress({
                                    type: 'complete',
                                    message: `${translate("tgContactCompletionMessage") || "Загрузка завершена! Получено:"} ${contacts.humans.length + contacts.bots.length + contacts.channels.length + contacts.groups.length + contacts.supergroups.length} ${translate("tgContactCompletionSuffix") || "контактов"}`,
                                    progress: 100
                                });
                            }

                            resolve(contacts);
                            return;
                        case 'error':
                            clearTimeout(timeoutId);
                            ws.close();
                            console.error('Ошибка от сервера:', data.error);

                            let errorMessage = data.error;

                            // Специальная обработка ошибок бота
                            if (data.error === 'bot not found') {
                                errorMessage = translate("tgContactBotNotFound") || "Telegram UserBot не найден. Необходимо создать и настроить Telegram UserBot";
                            } else if (data.error === 'bot stopped') {
                                errorMessage = translate("tgContactBotStopped") || "Telegram UserBot остановлен. Включите бот в настройках канала";
                            }

                            if (onProgress) {
                                onProgress({
                                    type: 'error',
                                    message: `${translate("error") || "Ошибка"}: ${errorMessage}`,
                                    progress: 0
                                });
                            }
                            reject(new Error(errorMessage));
                            return;
                        default:
                            console.warn(`${translate("tgContactUnknownMessage") || "Неизвестный тип сообщения:"} ${data.type}`, data);
                    }
                } catch (parseError) {
                    clearTimeout(timeoutId);
                    ws.close();
                    console.error('Ошибка парсинга WebSocket сообщения:', parseError, event.data);
                    if (onProgress) {
                        onProgress({
                            type: 'error',
                            message: translate("tgContactParseError") || "Ошибка парсинга ответа сервера",
                            progress: 0
                        });
                    }
                    reject(new Error(translate("tgContactParseWSError") || "Ошибка парсинга ответа WebSocket"));
                }
            };

            ws.onerror = (error) => {
                clearTimeout(timeoutId);
                console.error('WebSocket ошибка:', error);
                if (onProgress) {
                    onProgress({
                        type: 'error',
                        message: translate("tgContactConnectionError") || "Ошибка соединения с сервером",
                        progress: 0
                    });
                }
                reject(new Error(translate("telegramAuthWebSocketError") || "Ошибка соединения WebSocket"));
            };

            ws.onclose = (event) => {
                clearTimeout(timeoutId);
                console.warn(`${translate("tgContactWSClosed") || "WebSocket соединение закрыто"} ${translate("tgContactWSClosedCode") || "с кодом:"} ${event.code}`);
                if (event.code !== 1000) { // 1000 = нормальное закрытие
                    // Обрабатываем специфические коды ошибок, которые отправляет сервер
                    let errorMessage = `${translate("tgContactWSClosedCode") || "WebSocket соединение закрыто с кодом:"} ${event.code}`;

                    if (event.code === 1011) {
                        // Сервер отправляет код 1011 для "bot not found"
                        errorMessage = translate("tgContactBotNotFound") || "Telegram UserBot не найден. Необходимо создать и настроить Telegram UserBot";
                    } else if (event.code === 1006) {
                        // Сервер отправляет код 1006 для "bot stopped"
                        errorMessage = translate("tgContactBotStopped") || "Telegram UserBot остановлен. Включите бот в настройках канала";
                    } else if (event.code === 1002) {
                        errorMessage = translate("tgContactWSProtocolError") || "Ошибка протокола WebSocket";
                    } else if (event.code === 1003) {
                        errorMessage = translate("tgContactWSUnsupportedData") || "Неподдерживаемый тип данных";
                    }

                    if (onProgress) {
                        onProgress({
                            type: 'error',
                            message: errorMessage,
                            progress: 0
                        });
                    }
                    reject(new Error(errorMessage));
                }
            };
        });
    };

    try {
        if (onProgress) {
            onProgress({
                type: 'status',
                message: translate("tgContactConnectingServer") || "Подключение к серверу...",
                progress: 0
            });
        }
        return await makeWebSocketRequest(token);
    } catch (error) {
        console.error(`${translate("tgContactErrorServerFetch") || "Ошибка получения контактов:"} ${error}`);
        if (error.message.includes('401') || error.message.includes('Unauthorized') || error.message.includes('авторизации')) {
            try {
                if (onProgress) {
                    onProgress({
                        type: 'status',
                        message: translate("tgContactUpdatingToken") || "Обновление токена авторизации...",
                        progress: 0
                    });
                }
                const newToken = await validateAndRefreshToken(token);
                return await makeWebSocketRequest(newToken);
            } catch (refreshError) {
                if (onProgress) {
                    onProgress({
                        type: 'error',
                        message: translate("tgContactTokenUpdateError") || "Ошибка обновления токена",
                        progress: 0
                    });
                }
                throw new Error(`${translate("tgContactTokenUpdateError") || "Ошибка обновления токена"}: ${refreshError.message}`);
            }
        }
        if (onProgress) {
            onProgress({
                type: 'error',
                message: error.message,
                progress: 0
            });
        }
        throw new Error(`${translate("tgContactErrorGetting") || "Ошибка при получении контактов Telegram через WebSocket:"} ${error.message}`);
    }
};