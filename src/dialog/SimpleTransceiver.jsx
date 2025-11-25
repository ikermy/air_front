import React, {useState} from 'react';
import axios from 'axios';
import {useTranslation} from 'react-i18next';
import './SimpleTransceiver.css';
import {IoSend} from "react-icons/io5";

const DEMO_URL = window.runtimeConfig?.REACT_APP_DEMO || process.env.REACT_APP_DEMO;

export function SimpleTransceiver({
                                      userName,
                                      token,
                                      setPermit,
                                      setIsModalOpen
                                  }) {
    const [message, setMessage] = useState('');
    const {t} = useTranslation();

    const sendMessage = async () => {
        if (message.trim() === '') return; // Не отправлять пустое сообщение

        try {
            const response = await axios.post(`${DEMO_URL}/data`, {
                type: 'user',
                token: token,
                uname: userName,
                content: message,
            });

            if (response && response.status === 200) {
                // Сообщение успешно отправлено — очищаем поле ввода
                setMessage('');
            }
        }
        catch (error) {
            if (error.response) {
                const status = error.response.status;

                if (status === 429) {
                    console.error('Слишком много запросов. Пожалуйста, подождите.');
                    setTimeout(() => sendMessage(), 1000);
                    return;
                }

                if (status === 402) {
                    console.error('Недостаточный баланс!');
                    setPermit(false);
                    return;
                }

                // if (status === 401) {
                //     console.error('Токен недействителен или истек');
                //     // Устанавливаем флаг для обновления токена через useEffect
                //     setShouldRefresh(true);
                //     return;
                // }

                if (status === 500) {
                    console.error('Ошибка сервера');
                    setPermit(false);
                    setIsModalOpen(false);
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
    // const [shouldRefresh, setShouldRefresh] = useState(false);

    // Эффект для обновления токена при возникновении ошибки 401
    // useEffect(() => {
    //     if (shouldRefresh) {
    //         (async () => {
    //             try {
    //                 const newToken = await validateAndRefreshWidgetToken(token)
    //
    //                 if (newToken === null || token === "no_balance") {
    //                     console.log("Токен не обновлен!")
    //                     setPermit(false)
    //                 }
    //
    //                 setToken(newToken.data.token);
    //                 console.log('Токен обновлён:', newToken.data.token);
    //             } catch (refreshError) {
    //                 console.error('Ошибка при обновлении токена', refreshError);
    //                 setPermit(false)
    //             } finally {
    //                 // Сбрасываем флаг, чтобы эффект сработал только один раз
    //                 setShouldRefresh(false);
    //             }
    //         })();
    //     }
    // }, [setToken, shouldRefresh, token, setPermit]);

    return (
        <div className="input-container">
            <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t('SimpleTransceiver-entermsg')}
            />
            {/*<button onClick={sendMessage}>{t('Transceiver-send')}</button>*/}
            <button onClick={sendMessage}><IoSend/></button>
        </div>
    );
}
