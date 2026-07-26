import React, {useState, useRef, useCallback, useEffect, useContext} from 'react';
// CSS импортируется в родительском Widget.jsx для поддержки lazy loading
import {useTranslation} from "react-i18next";
import {MessageInput} from "../MessageInput";
import {Receiver} from "../Receiver";
import {Spin, Typography} from 'antd';
import {UserContext} from "../../UserContext";
import {ReadDialog} from "../../dialog/dialogUtils";
import {getOrSetUserId} from "../../utils/getOrSetUserId";
import {processMessageWithImages} from "../model/messageMappers";
import {useWidgetMessages} from "../hooks/useWidgetMessages";
import {MessageList} from "./MessageList";
import {useWidgetAuthorization} from "../hooks/useWidgetAuthorization";
import {useWidgetUsername} from "../hooks/useWidgetUsername";
import {useAutoScroll} from "../hooks/useAutoScroll";
import {AccessState} from "./AccessState";

export interface ChatWidgetProps {
    widgetCode: string;
    connected?: boolean;
    setConnected: React.Dispatch<React.SetStateAction<boolean | undefined>>;
    setIsModalOpen: (open: boolean) => void;
    messageStyles?: {
        user?: React.CSSProperties;
        bot?: React.CSSProperties;
    };
    inputStyle?: React.CSSProperties;
    sendButtonStyle?: React.CSSProperties;
}

export function ChatWidget({
                               widgetCode,
                               connected,
                               setConnected,
                               setIsModalOpen,
                               messageStyles = {},
                               inputStyle = {},
                               sendButtonStyle = {}
                           }: ChatWidgetProps) {
    const {t} = useTranslation();
    const {
        messages,
        isTyping,
        shouldAutoScroll,
        addMessage: addMessageInput,
        replaceMessages,
        setShouldAutoScroll,
    } = useWidgetMessages();
    const messagesEndRef = useRef(null);
    const [rudSuck, setRudSuck] = useState(false);
    const [localPermit, setPermit] = useState(true);
    const [inputUserName, setInputUserName] = useState('');
    const [userName, setUserName] = useState(null);
    const [token, setToken] = useState(null);
    const [modelName, setModelName] = useState(null);
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    const [appState, setAppState] = useState(null);
    const contextUserId = useContext(UserContext);
    const respId = contextUserId || getOrSetUserId();
    const authorization = useWidgetAuthorization({
        widgetCode,
        responderId: respId,
        connected,
        setToken,
        setConnected,
    });
    const {isLoading: userNameLoading} = useWidgetUsername({
        token,
        connected,
        setToken,
        setUserName,
    });

    const clearAutoScroll = useCallback(() => setShouldAutoScroll(false), []);
    useAutoScroll(messagesEndRef, shouldAutoScroll, clearAutoScroll);

    useEffect(() => {
        if (authorization.state !== 'loading' && authorization.state !== 'authorized' && authorization.state !== 'nameInput') {
            setAppState(authorization.state);
        }
    }, [authorization.state]);

    const [imageModal, setImageModal] = useState({
        isOpen: false,
        imageUrl: '',
        imageName: ''
    });

    const addMessage = useCallback((message, name, side, timestamp, imageUrl = null, files = null) => {
        addMessageInput({message, name, side, timestamp, imageUrl, files});
    }, [addMessageInput]);

    const handleDialogData = useCallback((dialogData) => {
        if (!dialogData || dialogData.Data === null ||
            (Array.isArray(dialogData.Data) && dialogData.Data.length === 0)) return;

        try {
            const {Model: modelName, Responder: responderName} = dialogData;
            let parsedMessages;

            if (Array.isArray(dialogData.Data)) {
                parsedMessages = dialogData.Data.map(msg =>
                    typeof msg === 'string' ? JSON.parse(msg) : msg
                );
            } else if (typeof dialogData.Data === 'string') {
                parsedMessages = JSON.parse(dialogData.Data).map(msg =>
                    typeof msg === 'string' ? JSON.parse(msg) : msg
                );
            } else {
                return;
            }

            const formattedMessages = parsedMessages.map(msg => {
                const creator = Number(msg.creator);
                let messageText = typeof msg.message === 'string'
                    ? msg.message
                    : (msg.message?.message || msg.message || '');
                if (typeof messageText !== 'string') messageText = String(messageText);

                const {text, imageUrl} = processMessageWithImages(messageText);
                const sendFiles = msg.send_files || msg.message?.action?.send_files ||
                    msg.action?.send_files || msg.files || [];
            let files = null;

            if (Array.isArray(sendFiles) && sendFiles.length > 0) {
                files = {
                    images: sendFiles.filter(f => f.type === 'photo' || f.type === 'image'),
                    videos: sendFiles.filter(f => f.type === 'video'),
                    audio: sendFiles.filter(f => f.type === 'audio'),
                    documents: sendFiles.filter(f => f.type === 'doc' || f.type === 'document')
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
                // В истории creator=1 — модель, остальные creator — пользователь.
                // Это соответствует SSE: assist отображается справа, user — слева.
                name: creator === 1 ? modelName : responderName,
                side: creator === 1 ? 'right' : 'left',
                timestamp: (() => {
                    const date = new Date(msg.timestamp);
                    return !isNaN(date.getTime()) ? date : new Date();
                })(),
                imageUrl,
                files
            };
            });

            replaceMessages(formattedMessages);
        } catch (error) {
            console.error('Failed to process dialog data:', error);
        }
    }, [replaceMessages]);

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
        return <MessageList
            messages={messages}
            isTyping={isTyping}
            modelName={modelName}
            messageStyles={messageStyles}
            onOpenImage={openImageModal}
            messagesEndRef={messagesEndRef}
        />;
        /* Legacy markup is retained below temporarily as a visual reference during migration.
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
        ); */
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
        if (appState && appState !== 'authorized' && appState !== 'nameInput') {
            return <AccessState state={appState}/>;
        }

        switch (appState) {
            case 'disconnected':
                return <div className="error-message">Нет соединения с сервером</div>;
            case 'nameInput':
                return renderNameInput();
            case 'unauthorized':
                return <div className="error-message">В авторизации отказано</div>;
            case 'invalidRequest':
                return <div className="error-message">Неверный запрос проверьте ключ</div>;
            case 'forbiddenOrigin':
                return <div className="error-message">Текущий сайт не входит в список разрешённых</div>;
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
                            dialogId={null}
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
            <MessageInput
                token={token}
                userName={userName}
                setToken={setToken}
                setIsModalOpen={setIsModalOpen}
                addMessage={addMessage}
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
