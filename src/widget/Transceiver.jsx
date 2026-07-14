import React, {useEffect, useState, useCallback} from 'react';
import axios from 'axios';
import {useTranslation} from 'react-i18next';
import './Transceiver.css';
import {validateAndRefreshWidgetToken} from "./utils";
import {IoSend} from "react-icons/io5";


export function Transceiver({
                                userName,
                                token,
                                setToken,
                                setPermit,
                                setIsModalOpen,
                                inputStyle = {}, // Добавляем параметр стилей поля ввода
                                sendButtonStyle = {} // Добавляем параметр стилей кнопки отправки
                            }) {
    const [message, setMessage] = useState('');
    const {t} = useTranslation();

    // Безопасная обертка для setPermit
    const safeSetPermit = useCallback((value) => {
        if (typeof setPermit === 'function') {
            try {
                setPermit(value);
            } catch (e) {
                console.error('Ошибка при вызове setPermit:', e);
            }
        } else {
            console.warn('setPermit не является функцией, пропущен вызов. Получено:', setPermit);
        }
    }, [setPermit]);

    const sendMessage = async () => {
        if (message.trim() === '') return; // Не отправлять пустое сообщение

        try {
            const response = await axios.post(`/widget/data`, {
                token: token,
                name: userName,
                content: message,
            });

            if (response && response.status === 200) {
                // Сообщение успешно отправлено — очищаем поле ввода
                setMessage('');
            }
        } catch (error) {
            if (error.response) {
                const status = error.response.status;

                if (status === 429) {
                    console.error('Слишком много запросов. Пожалуйста, подождите.');
                    setTimeout(() => sendMessage(), 1000);
                    return;
                }

                if (status === 402) {
                    console.error('Недостаточный баланс!');
                    safeSetPermit(false);
                    return;
                }

                if (status === 401) {
                    console.error('Токен недействителен или истек');
                    // Устанавливаем флаг для обновления токена через useEffect
                    setShouldRefresh(true);
                    return;
                }

                if (status === 500) {
                    console.error('Ошибка сервера');
                    safeSetPermit(false);
                    if (typeof setIsModalOpen === 'function') {
                        setIsModalOpen(false);
                    }
                    return;
                }
                console.error(`Неожиданный ответ сервера: ${status}`);
            } else {
                // Ошибка на уровне сети или axios
                console.error('Ошибка при отправке данных:', error.message);
            }
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    };

    // Локальное состояние токена и флаг для обновления токена
    const [shouldRefresh, setShouldRefresh] = useState(false);

    // Эффект для обновления токена при возникновении ошибки 401
    useEffect(() => {
        if (shouldRefresh) {
            (async () => {
                try {
                    const newToken = await validateAndRefreshWidgetToken(token)

                    if (newToken === null || token === "no_balance") {
                        console.error("Токен не обновлен!")
                        safeSetPermit(false)
                    }

                    setToken(newToken.data.token);
                } catch (refreshError) {
                    console.error('Ошибка при обновлении токена', refreshError);
                    safeSetPermit(false)
                } finally {
                    setShouldRefresh(false);
                }
            })();
        }
    }, [setToken, shouldRefresh, token, safeSetPermit]);

    return (
        <div className="tr-input-container">
            <input
                id="message-input"
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t('SimpleTransceiver-entermsg')}
                style={inputStyle} // Применяем стили из параметра inputStyle
            />
            {/*<button onClick={sendMessage}>{t('SimpleTransceiver-send')}</button>*/}
            <button
                onClick={sendMessage}
                style={sendButtonStyle} // Применяем стили из параметра sendButtonStyle
            >
                <IoSend/>
            </button>
        </div>
    );
}
