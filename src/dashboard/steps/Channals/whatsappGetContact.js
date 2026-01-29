import {validateAndRefreshToken} from "../../../utils/easyUtils";

export const whatsappGetContact = async (token, onProgress = null, t = null) => {
    const LAND_WSS = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND_WSS) || process.env.REACT_APP_LAND_WSS;

    // Fallback для функции перевода
    const translate = t || ((key) => key);

    const makeWebSocketRequest = async (authToken) => {
        return new Promise((resolve, reject) => {
            // Токен передается в URL, а не в сообщении
            const ws = new WebSocket(`${LAND_WSS}/ws/whats/contacts?token=${authToken}`);
            let timeoutId;
            let contacts = [];
            let isCompleted = false;
            let hasReceivedFinalResult = false;

            timeoutId = setTimeout(() => {
                if (!isCompleted) {
                    ws.close();
                    reject(new Error(translate("tgContactConnectionTimeout") || "Таймаут соединения WebSocket"));
                }
            }, 30000);

            ws.onopen = () => {
                if (onProgress) {
                    onProgress({
                        type: 'status',
                        message: translate("whatsContactConnectionEstablished") || "Соединение установлено, получение контактов...",
                        progress: 0
                    });
                }
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    // Обрабатываем разные типы сообщений от сервера
                    if (data.type === 'error') {
                        clearTimeout(timeoutId);
                        ws.close();
                        console.error(`${translate("whatsContactErrorServer") || "Ошибка от сервера WhatsApp:"} ${data.error}`);

                        let errorMessage = data.error;

                        // Специальная обработка ошибок бота
                        if (data.error === 'bot not found') {
                            errorMessage = translate("whatsContactBotNotFound") || "WhatsApp бот не найден. Необходимо создать и настроить WhatsApp бот";
                        } else if (data.error === 'bot stopped') {
                            errorMessage = translate("whatsContactBotStopped") || "WhatsApp бот остановлен. Включите бот в настройках канала";
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
                    }

                    // Обрабатываем сообщения о статусе
                    if (data.type === 'status') {
                        let message = '';
                        let progress = 0;

                        if (data.stage === 'contacts' && data.status === 'started') {
                            message = translate("whatsContactGettingContacts") || "Начинается получение контактов...";
                            progress = 10;
                        } else if (data.stage === 'groups' && data.status === 'started') {
                            message = translate("whatsContactGettingGroups") || "Начинается получение групп...";
                            progress = 20;
                        } else if (data.stage === 'processing_contacts') {
                            message = `${translate("whatsContactProcessingContacts") || "Обработка контактов (всего:"} ${data.total})...`;
                            progress = 30;
                        } else if (data.stage === 'processing_groups') {
                            message = `${translate("whatsContactProcessingGroups") || "Обработка групп (всего:"} ${data.total})...`;
                            progress = 50;
                        } else if (data.status === 'completed') {
                            message = `${translate("whatsContactCompletedMessage") || "Загрузка завершена! Контактов:"} ${data.total_contacts}, ${translate("whatsContactGroups") || "Групп:"} ${data.total_groups}`;
                            progress = 100;

                            // Завершаем процесс только если мы уже получили финальные данные
                            if (hasReceivedFinalResult) {
                                isCompleted = true;

                                clearTimeout(timeoutId);

                                if (onProgress) {
                                    onProgress({
                                        type: 'complete',
                                        message: `${translate("whatsContactFinalMessage") || "Загрузка завершена! Получено:"} ${contacts.length} ${translate("whatsContactAndGroups") || "контактов и групп"}`,
                                        progress: 100
                                    });
                                }

                                // Закрываем WebSocket корректно
                                ws.close(1000, 'Completed successfully');
                                resolve(contacts);
                                return;
                            }
                        } else {
                            message = `Статус: ${data.stage || data.status || 'Обработка...'}`;
                            progress = 15;
                        }

                        if (onProgress) {
                            onProgress({
                                type: 'status',
                                message: message,
                                progress: progress
                            });
                        }
                    }

                    // Обрабатываем прогресс
                    else if (data.type === 'progress') {
                        const progressPercent = data.total > 0 ? Math.round((data.processed / data.total) * 100) : 0;
                        const message = `Обработано ${data.processed} из ${data.total} (${data.stage})`;

                        if (onProgress) {
                            onProgress({
                                type: 'progress',
                                message: message,
                                current: data.processed,
                                total: data.total,
                                progress: Math.min(70 + (progressPercent * 0.25), 95) // Прогресс от 70% до 95%
                            });
                        }
                    }

                    // Обрабатываем финальный результат
                    else if (data.type === 'final_result' && data.data) {
                        hasReceivedFinalResult = true;

                        // Обрабатываем полученные контакты и группы
                        const result = data.data;
                        contacts = [];

                        // Добавляем контакты (humans)
                        if (result.humans && Array.isArray(result.humans)) {
                            contacts.push(...result.humans.map(human => ({
                                id: human.ID || human.id,
                                name: human.first_name || human.FirstName || human.Title || 'Неизвестно',
                                first_name: human.first_name || human.FirstName || human.Title || 'Неизвестно',
                                last_name: human.last_name || human.LastName || '',
                                phone: human.phone || human.Phone || null,
                                username: human.username || human.Username || null,
                                is_contact: true
                            })));
                        }

                        // Добавляем группы как контакты (для совместимости)
                        if (result.groups && Array.isArray(result.groups)) {
                            result.groups.forEach(group => {
                                // Обрабатываем поле title (строчная буква) вместо Title
                                let groupTitle = group.title || group.Title;
                                if (typeof groupTitle === 'number') {
                                    groupTitle = groupTitle.toString();
                                }
                                const groupName = groupTitle || group.subject || group.name || `Группа ${group.id || group.ID}`;

                                contacts.push({
                                    id: group.id || group.ID,
                                    name: groupName,
                                    first_name: groupName,
                                    phone: null,
                                    username: null,
                                    is_group: true
                                });
                            });
                        }

                        // Добавляем ботов
                        if (result.bots && Array.isArray(result.bots)) {
                            result.bots.forEach(bot => {
                                contacts.push({
                                    id: bot.ID || bot.id,
                                    name: bot.Title || bot.first_name || bot.name || 'Неизвестный бот',
                                    first_name: bot.Title || bot.first_name || bot.name || 'Неизвестный бот',
                                    phone: null,
                                    username: bot.Username || bot.username || null,
                                    is_bot: true
                                });
                            });
                        }

                        // Добавляем каналы
                        if (result.channels && Array.isArray(result.channels)) {
                            result.channels.forEach(channel => {
                                contacts.push({
                                    id: channel.ID || channel.id,
                                    name: channel.Title || channel.title || 'Неизвестный канал',
                                    first_name: channel.Title || channel.title || 'Неизвестный канал',
                                    phone: null,
                                    username: channel.Username || channel.username || null,
                                    is_channel: true
                                });
                            });
                        }

                        if (onProgress) {
                            onProgress({
                                type: 'contact',
                                message: `Получено ${contacts.length} контактов и групп`,
                                current: contacts.length,
                                total: contacts.length,
                                progress: 95
                            });
                        }
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
                if (!isCompleted) {
                    clearTimeout(timeoutId);
                    console.error('WebSocket ошибка:', error);
                    if (onProgress) {
                        onProgress({
                            type: 'error',
                            message: translate("tgContactConnectionError") || "Ошибка соединения с сервером",
                            progress: 0
                        });
                    }
                    reject(new Error(translate("whatsContactConnectionError") || "Ошибка WebSocket соединения"));
                }
            };

            ws.onclose = (event) => {
                if (!isCompleted) {
                    clearTimeout(timeoutId);

                    // Если процесс был завершен успешно, но WebSocket закрылся до обработки
                    if (hasReceivedFinalResult && contacts.length > 0) {
                        if (onProgress) {
                            onProgress({
                                type: 'complete',
                                message: `Загрузка завершена! Получено: ${contacts.length} контактов и групп`,
                                progress: 100
                            });
                        }
                        resolve(contacts);
                        return;
                    }

                    // Обрабатываем специфические коды ошибок, которые отправляет сервер
                    let errorMessage = `WebSocket соединение закрыто с кодом: ${event.code}`;

                    if (event.code === 1011) {
                        // Сервер отправляет код 1011 для "bot not found"
                        errorMessage = translate("whatsContactBotNotFound") || "WhatsApp бот не найден. Необходимо создать и настроить WhatsApp бот";
                    } else if (event.code === 1006) {
                        // Сервер отправляет код 1006 для "bot stopped"
                        errorMessage = translate("whatsContactBotStopped") || "WhatsApp бот остановлен. Включите бот в настройках канала";
                    } else if (event.code === 1002) {
                        errorMessage = translate("tgContactWSProtocolError") || "Ошибка протокола WebSocket";
                    } else if (event.code === 1003) {
                        errorMessage = translate("tgContactWSUnsupportedData") || "Неподдерживаемый тип данных";
                    } else if (event.code === 1011) {
                        errorMessage = translate("whatsContactBotNotFound") || "WhatsApp бот не найден. Необходимо создать и настроить WhatsApp бот";
                    }

                    if (onProgress) {
                        onProgress({
                            type: 'error',
                            message: errorMessage,
                            progress: 0
                        });
                    }
                    // Используем resolve вместо reject, так как мы находимся в onclose
                    // и ошибка уже была обработана через onProgress
                    resolve([]);
                }
            };
        });
    };

    try {
        if (onProgress) {
            onProgress({
                type: 'status',
                message: translate("whatsContactConnectingServer") || "Подключение к серверу...",
                progress: 0
            });
        }
        return await makeWebSocketRequest(token);
    } catch (error) {
        console.error('Ошибка получения контактов WhatsApp:', error);

        // Проверяем, нужно ли обновить токен
        if (error.message.includes('401') || error.message.includes('Unauthorized') ||
            error.message.includes('авторизации') || error.message.includes('токен')) {
            try {
                if (onProgress) {
                    onProgress({
                        type: 'status',
                        message: translate("whatsContactUpdatingToken") || "Обновление токена авторизации...",
                        progress: 0
                    });
                }
                const newToken = await validateAndRefreshToken(token);
                return await makeWebSocketRequest(newToken);
            } catch (refreshError) {
                if (onProgress) {
                    onProgress({
                        type: 'error',
                        message: translate("whatsContactTokenUpdateError") || "Ошибка обновления токена",
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
        throw new Error(`Ошибка при получении контактов WhatsApp через WebSocket: ${error.message}`);
    }
};