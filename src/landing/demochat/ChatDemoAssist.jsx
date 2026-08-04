import React, {useEffect, useState, useRef, useCallback} from 'react';
import {useTranslation} from "react-i18next";
import {SimpleTransceiver} from "../../dialog/SimpleTransceiver";
import {SimpleReceiver} from "../../dialog/SimpleReceiver";
import {ReadDemoDialog} from "../ReadDemoDialog";
import {TypingIndicator} from "../../utils/TypingIndicator";
import {useAutoScroll} from "../../utils/useAutoScroll";
import {Modal, Spin, Typography} from 'antd';

const animationAssistWrite = 20; // мс на символ

export function ChatDemoAssist({token, isTokenLoading, isModalOpen}) {
    const {t} = useTranslation();
    const [messages, setMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const [modelName, setModelName] = useState(null);
    const messagesEndRef = useRef(null);
    const [userName, setUserName] = useState(null); // Для имени пользователя
    const [inputValue, setInputValue] = useState(''); // Для ввода имени пользователя
    const [userNameLoading, setUserNameLoading] = useState(false); // Отдельное состояние для загрузки имени пользователя

    // Функция для получения имени пользователя
    useEffect(() => {
        async function fetchUserName() {

            if (isTokenLoading) {
                return;
            }

            if (token == null) {
                setUserNameLoading(false);
                return;
            }

            setUserNameLoading(true);
            const makeRequest = async (isRetry = false) => {
                const response = await fetch(`/demo/username`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json"
                    },
                }, token);

                if (response.status === 429 && !isRetry) {
                    // Слишком много запросов, ждем секунду и повторяем только один раз
                    console.warn('Too many requests, retrying in 1 second...');
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    return makeRequest(true); // Повторяем запрос с флагом isRetry
                }

                if (!response.ok) {
                    throw new Error('Ошибка сети');
                }

                return response.json();
            };

            try {
                const data = await makeRequest();

                if (typeof data === 'string' && data.trim() !== '') {
                    // Если данные — это строка, сохраняем их как имя пользователя
                    setUserName(data);
                } else if (data.message === 'No user name') {
                    // Если сервер вернул сообщение об отсутствии имени
                    setUserName(null);
                } else {
                    // Если формат данных неверный
                    console.error("Неверный формат данных:", data);
                    setUserName(null);
                }
            } catch (error) {
                console.error('Ошибка при запросе имени пользователя:', error);
                setUserName(null); // Устанавливаем null в случае ошибки
            } finally {
                setUserNameLoading(false);
            }
        }

        fetchUserName();
    }, [token, isTokenLoading]);


    const calculateAnimationDuration = (message) => {
        const length = message.length;
        return length * animationAssistWrite;
    };

    // Функция для извлечения URL изображения из текста и удаления её из сообщения
    const extractImageUrl = (text) => {
        const regex = /https:\/\/info-bot\.online\/landing\/demochat\/[^\s]+/;
        const match = text.match(regex);
        if (match) {
            const imageUrl = match[0];
            const cleanedText = text.replace(regex, '').trim();
            return {imageUrl, cleanedText};
        }
        return {imageUrl: null, cleanedText: text};
    };

    // Функция addMessage
    const addMessage = useCallback((message, name, side, timestamp, imageUrl) => {
        // Извлекаем URL изображения и очищаем текст
        const {imageUrl: extractedImageUrl, cleanedText} = extractImageUrl(message);
        const finalImageUrl = imageUrl || extractedImageUrl;
        const finalMessage = extractedImageUrl ? cleanedText : message;

        if (side === "left") {
            setMessages(prevMessages => [...prevMessages, {
                text: finalMessage,
                name,
                side,
                timestamp,
                imageUrl: finalImageUrl
            }]);
        } else {
            setIsTyping(true);
            const duration = calculateAnimationDuration(finalMessage);
            setTimeout(() => {
                setMessages(prevMessages => [...prevMessages, {
                    text: finalMessage,
                    name,
                    side,
                    timestamp,
                    imageUrl: finalImageUrl
                }]);
                setIsTyping(false);
            }, duration);
        }
    }, []);

    // Добавить состояние для модального окна с изображением
    const [modalImage, setModalImage] = useState(null);

    // Функция для открытия модального окна
    const openImageModal = (imageUrl) => {
        setModalImage(imageUrl);
    };

    // Функция для закрытия модального окна
    const closeImageModal = () => {
        setModalImage(null);
    };

    const handleDialogHistory = useCallback((dialogData) => {
        if (dialogData.noDialog) {
            return;
        }
        const {User: userName, Assist: assistName, Data: messages} = dialogData;
        const formattedMessages = messages.map(msg => {
            // Обрабатываем каждое сообщение для извлечения URL изображения
            const {imageUrl: extractedImageUrl, cleanedText} = extractImageUrl(msg.message);
            const finalImageUrl = msg.imageUrl || extractedImageUrl;
            const finalMessage = extractedImageUrl ? cleanedText : msg.message;

            return {
                text: finalMessage,
                name: msg.creator === 1 ? userName : assistName,
                side: msg.creator === 1 ? 'left' : 'right',
                timestamp: new Date(msg.timestamp),
                imageUrl: finalImageUrl
            };
        });
        setMessages(formattedMessages);
    }, []);

    useAutoScroll(messagesEndRef, [messages, isTyping]);

    // Функция для сохранения имени пользователя
    const handleSaveName = () => {
        if (inputValue.trim() === '') {
            alert('Имя пользователя не может быть пустым');
            return;
        }
        setUserName(inputValue); // Сохраняем введённое имя
    };

    // Спинер загрузки имени пользователя
    const { Text} = Typography;
    if (isTokenLoading || userNameLoading) {
        return (
            <div className="notifications-loading">
                <Spin size="large" />
                <Text className="loading-text">
                    Загрузка данных...
                </Text>
            </div>
        );
    }

    if (userName === null) {
        return (
            // нужно написать свой CSS!!!
            <div className="input-demo-container">
                <h3>{t('ChatDemoAssist-h3')}</h3>
                <input
                    className="input-container"
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)} // Сохраняем введённое имя
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            handleSaveName(); // Вызываем сохранение при нажатии Enter
                        }
                    }}
                    placeholder={t('ChatDemoAssist-placeholder')}
                />
                <button onClick={handleSaveName}>{t('send')}</button>
            </div>
        );
    }


    return (
        <div className="chat-demo-window">
            <div className="chat-demo-messages">
                {messages.map((msg, index) => (
                    <div key={index} className={`chat-message ${msg.side}`}>
                        <div className="message-name">{msg.name}</div>
                        {msg.imageUrl ? (
                            <>
                                <div className="message-text">{msg.text}</div>
                                <img
                                    src={msg.imageUrl}
                                    alt="+"
                                    className="chat-image"
                                    onClick={() => openImageModal(msg.imageUrl)}
                                    style={{cursor: 'pointer'}}
                                />
                            </>
                        ) : (
                            <div className="message-text">{msg.text}</div>
                        )}
                        <div className={`message-timestamp ${msg.side}`}>{msg.timestamp.toLocaleTimeString()}</div>
                    </div>
                ))}
                {isTyping && (
                    <div className="chat-message right">
                        <TypingIndicator isTyping={isTyping} intervalTime={250} name={modelName}/>
                    </div>
                )}
                <div ref={messagesEndRef}/>
            </div>


            {/* Модальное окно из Ant Design для увеличенного изображения */}
            {modalImage && (
                <Modal
                    open={!!modalImage}
                    footer={null}
                    onCancel={closeImageModal}
                    centered
                    closeIcon={<span style={{fontSize: '24px', color: '#666'}}>×</span>}
                    width="auto"
                    styles={{
                        body: {padding: 0},
                        content: {padding: 0}
                    }}
                >
                    <img
                        src={modalImage}
                        alt="Увеличенное изображение"
                        style={{
                            width: '100%',
                            height: 'auto',
                            maxWidth: '90vw',
                            maxHeight: '90vh',
                            objectFit: 'contain'
                        }}
                    />
                </Modal>
            )}
            <>
                <ReadDemoDialog
                    userName={userName}
                    token={token}
                    onDialogData={handleDialogHistory}
                />
                <div className="chat-input">
                    <SimpleTransceiver
                        userName={userName}
                        token={token}
                        setIsModalOpen={isModalOpen}
                    />
                </div>
                <div className="chat-receiver">
                    <SimpleReceiver
                        setModelName={setModelName}
                        addMessage={addMessage}
                        token={token}
                    />
                </div>
            </>
        </div>
    );
}
