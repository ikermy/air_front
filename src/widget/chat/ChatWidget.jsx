import React, {useState, useRef, useCallback, useEffect, useContext} from 'react';
// CSS импортируется в родительском Widget.jsx для поддержки lazy loading
import {useTranslation} from "react-i18next";
import {TypingIndicator} from "../../utils/TypingIndicator";
import {fetchUserName} from "../utils";
import {Transceiver} from "../Transceiver";
import {Receiver} from "../Receiver";
import {Spin, Typography} from 'antd';
import axios from "axios";
import {UserContext} from "../../index";
import {ReadDialog} from "../../dialog/dialogUtils";

const animationAssistWrite = 25; // 25 мс на символ

export function ChatWidget({
                               examKey,
                               connected,
                               setConnected,
                               setIsModalOpen,
                               messageStyles = {},
                               inputStyle = {},
                               sendButtonStyle = {}
                           }) {
    const {t} = useTranslation();
    const [messages, setMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);
    const [rudSuck, setRudSuck] = useState(false);
    const [localPermit, setPermit] = useState(true);
    const [inputUserName, setInputUserName] = useState('');
    const [userName, setUserName] = useState(null);
    const [token, setToken] = useState(null);
    const [modelName, setModelName] = useState(null);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [userNameLoading, setUserNameLoading] = useState(false);
    const [shouldAutoScroll, setShouldAutoScroll] = useState(false); // Флаг для контроля автопрокрутки
    const userNameFetchedRef = useRef(false); // Флаг для отслеживания выполненной загрузки

    const [appState, setAppState] = useState(null);
    const respId = useContext(UserContext);

    // Функция для выполнения автопрокрутки
    const performAutoScroll = useCallback(() => {
        if (messagesEndRef.current) {
            const scrollableParent = messagesEndRef.current.closest('.wid-chat-messages');

            if (scrollableParent) {
                scrollableParent.scrollTop = scrollableParent.scrollHeight;
            } else {
                messagesEndRef.current.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'nearest'
                });
            }
        }
    }, []);

    useEffect(() => {
        const checkConnection = async () => {
            try {
                const url = `/system/available/widget`;
                const response = await axios.get(url);

                if (response.status >= 400) {
                    setConnected(false);
                    return;
                }

                setConnected(true);
            } catch (error) {
                if (error.response) {
                } else {
                }
                setConnected(false);
            }
        };

        // Проверка при монтировании компонента
        checkConnection();

        // Устанавливаем интервал проверки каждые 5 секунд
        const interval = setInterval(checkConnection, 5000);
        return () => clearInterval(interval);
    }, [setConnected]);

    // Эффект для условной автопрокрутки
    useEffect(() => {
        if (shouldAutoScroll) {
            performAutoScroll();
            setShouldAutoScroll(false); // Сбрасываем флаг
        }
    }, [shouldAutoScroll, performAutoScroll]);

    useEffect(() => {
        if (connected) {
            const checkPermission = async () => {
                try {
                    const LAND_URL = window.location.origin;

                    const response = await fetch(`/widget/exam`, {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            b: examKey,
                            c: respId,
                        }),
                    });

                    if (response.status === 400) {
                        setAppState('invalidRequest');
                        return;
                    }
                    if (response.status === 402) {
                        setAppState('paymentRequired');
                        return;
                    }
                    if (response.status === 429) {
                        setAppState('tooManyRequests');
                        return;
                    }
                    if (response.status === 404) {
                        setAppState('botNotFound');
                        return;
                    }
                    if (response.status === 503) {
                        setAppState('botStopped');
                        return;
                    }
                    if (response.status === 500) {
                        setAppState('serverError');
                        return;
                    }
                    if (!response.ok) {
                        setAppState('unknownError');
                        return;
                    }

                    const data = await response.json();
                    setToken(data.resp);
                } catch (error) {
                    console.error('Error:', error);
                    setAppState('networkError');
                }
            };
            checkPermission();
        }
    }, [examKey, respId, connected]);

    const [imageModal, setImageModal] = useState({
        isOpen: false,
        imageUrl: '',
        imageName: ''
    });

    const calculateAnimationDuration = (message) => {
        const length = message.length;
        return length * animationAssistWrite;
    };

    const processMessageWithImages = useCallback((message) => {
        if (typeof message !== "string") {
            if (typeof message === "object" && message !== null) {
                if (message.message) {
                    return processMessageWithImages(message.message);
                }
                return {text: JSON.stringify(message), imageUrl: null};
            }
            return {text: String(message), imageUrl: null};
        }

        const imgRegex = /<img[^>]*src=\\?"([^"\\]+)\\?"[^>]*>/;
        const match = message.match(imgRegex);

        if (!match) return {text: message, imageUrl: null};

        const imageUrl = match[1];
        const text = message.replace(imgRegex, '').trim();

        return {text, imageUrl};
    }, []);

    const addMessage = useCallback((message, name, side, timestamp, imageUrl = null, files = null) => {
        const {text, imageUrl: processedImageUrl} = processMessageWithImages(message);
        const finalImageUrl = imageUrl || processedImageUrl;

        let processedFiles = null;
        if (files && files.length > 0) {
            processedFiles = {
                images: files.filter(f => f.type === 'photo').map(f => ({url: f.url, file_name: f.fileName})),
                videos: files.filter(f => f.type === 'video').map(f => ({url: f.url, file_name: f.fileName})),
                audio: files.filter(f => f.type === 'audio').map(f => ({url: f.url, file_name: f.fileName})),
                documents: files.filter(f => f.type === 'doc').map(f => ({url: f.url, file_name: f.fileName}))
            };
        } else if (finalImageUrl) {
            processedFiles = {
                images: [{url: finalImageUrl, file_name: 'image'}],
                videos: [],
                audio: [],
                documents: []
            };
        }

        if (side === "left") {
            setMessages(prevMessages => [...prevMessages, {
                text, name, side, timestamp, imageUrl: finalImageUrl, files: processedFiles
            }]);
            // Устанавливаем флаг автопрокрутки для новых сообщений из Receiver
            setShouldAutoScroll(true);
        } else {
            setIsTyping(true);
            const duration = calculateAnimationDuration(text);
            setTimeout(() => {
                setMessages(prevMessages => [...prevMessages, {
                    text, name, side, timestamp, imageUrl: finalImageUrl, files: processedFiles
                }]);
                setIsTyping(false);
                // Устанавливаем флаг автопрокрутки для новых сообщений пользователя
                setShouldAutoScroll(true);
            }, duration);
        }
    }, [processMessageWithImages]);

    const handleDialogData = useCallback((dialogData) => {
        if (dialogData.Data === null) return;

        const {Model: modelName, Responder: responderName} = dialogData;
        const parsedMessages = JSON.parse(dialogData.Data).map(msg => JSON.parse(msg));
        const formattedMessages = parsedMessages.map(msg => {
            let messageText = '';
            if (msg.message && typeof msg.message === 'object' && msg.message.message) {
                messageText = msg.message.message;
            } else if (typeof msg.message === 'string') {
                messageText = msg.message;
            }

            const {text, imageUrl} = processMessageWithImages(messageText);
            let files = null;

            if (msg.message && msg.message.action && msg.message.action.send_files && Array.isArray(msg.message.action.send_files)) {
                files = {
                    images: msg.message.action.send_files.filter(f => f.type === 'photo').map(f => ({
                        url: f.url,
                        file_name: f.file_name
                    })),
                    videos: msg.message.action.send_files.filter(f => f.type === 'video').map(f => ({
                        url: f.url,
                        file_name: f.file_name
                    })),
                    audio: msg.message.action.send_files.filter(f => f.type === 'audio').map(f => ({
                        url: f.url,
                        file_name: f.file_name
                    })),
                    documents: msg.message.action.send_files.filter(f => f.type === 'doc').map(f => ({
                        url: f.url,
                        file_name: f.file_name
                    }))
                };
            } else if (msg.files && Array.isArray(msg.files) && msg.files.length > 0) {
                files = {
                    images: msg.files.filter(f => f.type === 'photo').map(f => ({
                        url: f.url,
                        file_name: f.fileName || f.file_name
                    })),
                    videos: msg.files.filter(f => f.type === 'video').map(f => ({
                        url: f.url,
                        file_name: f.fileName || f.file_name
                    })),
                    audio: msg.files.filter(f => f.type === 'audio').map(f => ({
                        url: f.url,
                        file_name: f.fileName || f.file_name
                    })),
                    documents: msg.files.filter(f => f.type === 'doc').map(f => ({
                        url: f.url,
                        file_name: f.fileName || f.file_name
                    }))
                };
            } else if (msg.action && msg.action.send_files && Array.isArray(msg.action.send_files)) {
                files = {
                    images: msg.action.send_files.filter(f => f.type === 'photo').map(f => ({
                        url: f.url,
                        file_name: f.file_name
                    })),
                    videos: msg.action.send_files.filter(f => f.type === 'video').map(f => ({
                        url: f.url,
                        file_name: f.file_name
                    })),
                    audio: msg.action.send_files.filter(f => f.type === 'audio').map(f => ({
                        url: f.url,
                        file_name: f.file_name
                    })),
                    documents: msg.action.send_files.filter(f => f.type === 'doc').map(f => ({
                        url: f.url,
                        file_name: f.file_name
                    }))
                };
            } else if (imageUrl) {
                files = {
                    images: [{url: imageUrl, file_name: 'image'}],
                    videos: [],
                    audio: [],
                    documents: []
                };
            }

            return {
                text,
                name: msg.creator === 1 ? modelName : responderName,
                side: msg.creator === 1 ? 'left' : 'right',
                timestamp: new Date(msg.timestamp),
                imageUrl,
                files
            };
        });

        setMessages(formattedMessages);
        // Устанавливаем флаг автопрокрутки при загрузке истории диалогов
        setShouldAutoScroll(true);
    }, [processMessageWithImages]);

    useEffect(() => {
        if (connected === true || connected === false) {
            setIsInitialLoading(false);
        }
    }, [connected]);

    useEffect(() => {
        if (connected === false && !isInitialLoading && appState !== 'disconnected') {
            setAppState('disconnected');
        }
    }, [connected, isInitialLoading, appState]);

    useEffect(() => {
        if (!connected || token == null || userNameFetchedRef.current) {
            return;
        }

        userNameFetchedRef.current = true;
        setUserNameLoading(true);

        (async () => {
            try {
                await fetchUserName({
                    token,
                    setToken,
                    setUserName,
                });
            } catch (error) {
                console.error('Ошибка при загрузке имени пользователя:', error);
            } finally {
                setUserNameLoading(false);
            }
        })();
    }, [token, connected]);

    useEffect(() => {
        if (connected && !isInitialLoading && !userNameLoading && token) {
            const newState = userName !== null ? 'authorized' : 'nameInput';
            if (appState !== newState) {
                setAppState(newState);
            }
        }
    }, [connected, userName, token, isInitialLoading, userNameLoading, appState]);

    const handleSaveName = () => {
        if (inputUserName.trim() === '') {
            alert('Имя пользователя не может быть пустым');
            return;
        }
        setUserName(inputUserName);
    };

    const openImageModal = (imageUrl, imageName) => {
        setImageModal({
            isOpen: true,
            imageUrl,
            imageName
        });
    };

    const closeImageModal = () => {
        setImageModal({
            isOpen: false,
            imageUrl: '',
            imageName: ''
        });
    };

    const handleModalBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            closeImageModal();
        }
    };

    const renderMessages = () => {
        return (
            <div className="wid-chat-messages">
                {messages.map((msg, index) => {
                    const messageStyle = msg.side === 'right' ? messageStyles.user : messageStyles.bot;

                    return (
                        <div
                            key={index}
                            className={`chat-message ${msg.side}`}
                            style={messageStyle}
                        >
                            <div className="message-name">{msg.name}</div>
                            <div className="message-text">
                                {msg.text}
                                {msg.imageUrl && (
                                    <div className="message-image-container">
                                        <img
                                            src={msg.imageUrl}
                                            alt="+"
                                            className="chat-image"
                                            onClick={() => openImageModal(msg.imageUrl, 'image')}
                                        />
                                    </div>
                                )}
                            </div>

                            {msg.files && (
                                <div className="message-files">
                                    {msg.files.images?.map((img, imgIndex) => (
                                        <div key={`img-${imgIndex}`} className="message-image-container">
                                            <img
                                                src={img.url}
                                                alt={img.file_name}
                                                className="chat-image"
                                                onClick={() => openImageModal(img.url, img.file_name)}
                                            />
                                        </div>
                                    ))}

                                    {msg.files.audio?.map((audio, audioIndex) => (
                                        <div key={`audio-${audioIndex}`} className="message-audio-container">
                                            <audio controls className="chat-audio">
                                                <source src={audio.url} type="audio/mpeg"/>
                                                Ваш браузер не поддерживает аудио элемент.
                                            </audio>
                                            <div className="file-name">{audio.file_name}</div>
                                        </div>
                                    ))}

                                    {msg.files.videos?.map((video, videoIndex) => (
                                        <div key={`video-${videoIndex}`} className="message-video-container">
                                            <video controls className="chat-video">
                                                <source src={video.url} type="video/mp4"/>
                                                Ваш браузер не поддерживает видео элемент.
                                            </video>
                                            <div className="file-name">{video.file_name}</div>
                                        </div>
                                    ))}

                                    {msg.files.documents?.map((doc, docIndex) => (
                                        <div key={`doc-${docIndex}`} className="message-document-container">
                                            <a
                                                href={doc.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="document-link"
                                            >
                                                📄 {doc.file_name}
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className={`message-timestamp ${msg.side}`}>{msg.timestamp.toLocaleTimeString()}</div>
                        </div>
                    );
                })}
                {isTyping && (
                    <div
                        className="chat-message right"
                        style={messageStyles.user}
                    >
                        <TypingIndicator isTyping={isTyping} intervalTime={300} name={modelName}/>
                    </div>
                )}
                <div ref={messagesEndRef}/>
            </div>
        );
    };

    const renderNameInput = () => {
        return (
            <div className="wid-input-container">
                <h3 style={{color: 'var(--text-color)'}}>{t('ChatDemoAssist-h3')}</h3>
                <div className="input-button-row">
                    <input
                        type="text"
                        value={inputUserName}
                        onChange={(e) => setInputUserName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleSaveName();
                            }
                        }}
                        placeholder={t('ChatDemoAssist-placeholder')}
                    />
                    <button onClick={handleSaveName}>{t('send')}</button>
                </div>
            </div>
        );
    };

    const renderChatContent = () => {
        switch (appState) {
            case 'disconnected':
                return <div className="error-message">Нет соединения с сервером</div>;
            case 'nameInput':
                return renderNameInput();
            case 'unauthorized':
                return <div className="error-message">В авторизации отказано</div>;
            case 'invalidRequest':
                return <div className="error-message">Неверный запрос проверьте ключ</div>;
            case 'paymentRequired':
                return <div className="error-message">Необходимо продлить подписку</div>;
            case 'botNotFound':
                return <div className="error-message">Бот не найден проверьте ключ</div>;
            case 'tooManyRequests':
                return <div className="error-message">Слишком много запросов!</div>;
            case 'serverError':
                return <div className="error-message">Внутренняя ошибка сервера</div>;
            case 'botStopped':
                return <div className="error-message">Бот остановлен</div>;
            case 'networkError':
                return <div className="error-message">Ошибка сети</div>;
            case 'unknownError':
                return <div className="error-message">Неизвестная ошибка</div>;
            case 'authorized':
                return (
                    <>
                        <ReadDialog
                            mode={"widget"}
                            userName={userName}
                            inToken={token}
                            onDialogData={handleDialogData}
                            setRudSuck={setRudSuck}
                        />
                        {!rudSuck ? (
                            <div className="wid-loading-container">
                                <Spin size="large"/>
                                <Typography.Text className="wid-loading-text">
                                    Загрузка истории диалогов...
                                </Typography.Text>
                            </div>
                        ) : (
                            <>
                                {/*<div className="chat-input">*/}
                                    {renderInputArea()}
                                {/*</div>*/}
                                {/*<div className="chat-receiver">*/}
                                    {renderReceiver()}
                                {/*</div>*/}
                            </>
                        )}
                    </>
                );
            default:
                return null;
        }
    };

    const renderInputArea = () => {
        return localPermit ? (
            <Transceiver
                token={token}
                userName={userName}
                setToken={setToken}
                setIsModalOpen={setIsModalOpen}
                setPermit={setPermit}
                inputStyle={inputStyle}
                sendButtonStyle={sendButtonStyle}
            />
        ) : (
            <div className="no-balance">Недостаточный баланс</div>
        );
    };

    const renderReceiver = () => {
        return (localPermit) && (
            <Receiver
                addMessage={addMessage}
                token={token}
                setIsModalOpen={setIsModalOpen}
                setModelName={setModelName}
            />
        )
    };

    return (
        <div className="wid-chat-window">
            {isInitialLoading ? (
                <div className="wid-loading-container">
                    <Spin size="large"/>
                    <Typography.Text className="wid-loading-text">
                        Загрузка данных...
                    </Typography.Text>
                </div>
            ) : (
                <>
                    {userNameLoading && appState === 'nameInput' && (
                        <div className="wid-loading-container">
                            <Spin size="large"/>
                            <Typography.Text className="wid-loading-text">
                                Загрузка имени пользователя...
                            </Typography.Text>
                        </div>
                    )}

                    {!(userNameLoading && appState === 'nameInput') && (
                        <>
                            {renderMessages()}
                            {renderChatContent()}
                        </>
                    )}
                </>
            )}

            {imageModal.isOpen && (
                <div className="wid-image-modal" onClick={handleModalBackdropClick}>
                    <div className="wid-image-modal-content">
                        <div className="wid-close" onClick={closeImageModal}>
                            <div className="wid-close-background"></div>
                            <div className="wid-close-symbol">&times;</div>
                        </div>
                        <img src={imageModal.imageUrl} alt={imageModal.imageName} className="wid-modal-image"/>
                        <div className="wid-image-name">{imageModal.imageName}</div>
                    </div>
                </div>
            )}
        </div>
    );
}
