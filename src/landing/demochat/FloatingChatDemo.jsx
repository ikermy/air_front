import React, {useEffect, useState, useRef, useCallback} from 'react';
import './ChatWindowDemo.css';
import {useTranslation} from "react-i18next";
import Modal from "../../Modal";
import {ChatDemoAssist} from "./ChatDemoAssist";
import {TypingIndicator} from "../../utils/TypingIndicator";
import {ConnectionStatus} from "../../dialog/ConnectionStatus";
import {Examinator} from "../../widget/Examinator";
import {LiaWindowMinimize} from "react-icons/lia";
import {useChatVisibility} from "../../ChatVisibilityContext";
import {IoSend} from "react-icons/io5";

export function FloatingChatDemo({ onMinimize }) {
    const {t, i18n} = useTranslation();
    const { chatPosition, setChatPosition } = useChatVisibility();
    const [isConnected, setIsConnected] = useState(false);
    const [messages, setMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [inputValue, setInputValue] = useState('');
    const [questionsAndAnswers, setQuestionsAndAnswers] = useState([]);
    const [showReplayButton, setShowReplayButton] = useState(false);
    const messagesEndRef = useRef(null);
    const effectHasRun = useRef(false);
    const [token, setToken] = useState(null);
    const [isTokenLoading, setIsTokenLoading] = useState(true); // Добавляем состояние загрузки токена
    const inputRef = useRef(null); // Реф для поля ввода

    // Состояния для перетаскивания
    const [isDragging, setIsDragging] = useState(false);
    const [isPreparingDrag, setIsPreparingDrag] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [savedScrollPosition, setSavedScrollPosition] = useState(0); // Сохраняем позицию прокрутки
    const [wasAtBottom, setWasAtBottom] = useState(true); // Отслеживаем, была ли прокрутка в самом низу
    const chatWindowRef = useRef(null);
    const chatMessagesRef = useRef(null); // Реф для контейнера сообщений

    // Проверка, является ли устройство мобильным
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        // Функция для получения реальных размеров чата в зависимости от разрешения
        const getChatDimensions = () => {
            const windowWidth = window.innerWidth;

            if (windowWidth <= 480) {
                // Очень маленькие экраны
                return {
                    width: Math.min(windowWidth * 0.9, 350),
                    height: 400
                };
            } else if (windowWidth <= 767) {
                // Мобильное устройства
                return {
                    width: Math.min(windowWidth * 0.9, 400),
                    height: 450
                };
            } else if (windowWidth <= 1023) {
                // Планшеты
                return {
                    width: 280,
                    height: 500
                };
            } else if (windowWidth <= 1399) {
                // Десктопы
                return {
                    width: 300,
                    height: 550
                };
            } else {
                // Очень большие экраны
                return {
                    width: 350,
                    height: 600
                };
            }
        };

        // Правильно рассчитываем позицию с учетом размеров окна
        const updatePosition = () => {
            const chatDimensions = getChatDimensions();
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;

            // Отступы от краев экрана
            const margin = 20;

            // Максимально допустимые позиции
            const maxX = Math.max(0, windowWidth - chatDimensions.width - margin);
            const maxY = Math.max(0, windowHeight - chatDimensions.height - margin);

            // Если есть сохранённая позиция, проверяем что она в пределах экрана
            if (chatPosition) {
                const boundedPosition = {
                    x: Math.max(margin, Math.min(chatPosition.x, maxX)),
                    y: Math.max(margin, Math.min(chatPosition.y, maxY))
                };
                setPosition(boundedPosition);
            } else {
                // Устанавливаем позицию по умолчанию
                if (windowWidth <= 768) {
                    // На мобильных устройствах центрируем окно
                    const centerX = Math.max(margin, (windowWidth - chatDimensions.width) / 2);
                    const topY = Math.max(margin, Math.min(windowWidth <= 480 ? 20 : 25, maxY));

                    setPosition({
                        x: centerX,
                        y: topY
                    });
                } else {
                    // На десктопе размещаем справа, но с учетом границ
                    const rightMargin = 100;
                    const preferredX = windowWidth - chatDimensions.width - rightMargin;
                    const safeX = Math.max(margin, Math.min(preferredX, maxX));
                    const safeY = Math.max(margin, Math.min(80, maxY));

                    setPosition({
                        x: safeX,
                        y: safeY
                    });
                }
            }
        };

        checkMobile();
        updatePosition();

        window.addEventListener('resize', () => {
            checkMobile();
            updatePosition();
        });

        return () => {
            window.removeEventListener('resize', () => {
                checkMobile();
                updatePosition();
            });
        };
    }, [isMobile, chatPosition]);

    // Эффект для принудительного восстановления позиции прокрутки во время перетаскивания
    useEffect(() => {
        if ((isDragging || isPreparingDrag) && chatMessagesRef.current && savedScrollPosition !== undefined) {
            // Используем requestAnimationFrame для более плавной установки позиции прокрутки
            const animationId = requestAnimationFrame(() => {
                if (chatMessagesRef.current) {
                    chatMessagesRef.current.scrollTop = savedScrollPosition;
                }
            });

            return () => cancelAnimationFrame(animationId);
        }
    }); // Запускаем на каждый рендер во время перетаскивания, но с оптимизацией

    // Обработчики для перетаскивания
    const handleMouseDown = (e) => {
        // Предотвращаем любые дефолтные действия сразу
        e.preventDefault();
        e.stopPropagation();

        // Сохраняем текущую позицию прокрутки перед началом перетаскивания
        if (chatMessagesRef.current) {
            const currentScroll = chatMessagesRef.current.scrollTop;
            const scrollHeight = chatMessagesRef.current.scrollHeight;
            const clientHeight = chatMessagesRef.current.clientHeight;

            setSavedScrollPosition(currentScroll);
            window.dragScrollPosition = currentScroll;

            // Проверяем, была ли прокрутка в самом низу (с небольшой погрешностью)
            const isAtBottom = currentScroll + clientHeight >= scrollHeight - 5;
            setWasAtBottom(isAtBottom);
        }

        // Устанавливаем подготовку к перетаскиванию
        setIsPreparingDrag(true);

        const rect = chatWindowRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
        const clientX = (e.touches && e.touches[0]?.clientX) ?? e.clientX ?? 0;
        const clientY = (e.touches && e.touches[0]?.clientY) ?? e.clientY ?? 0;

        setDragOffset({
            x: clientX - rect.left,
            y: clientY - rect.top
        });

        // Используем requestAnimationFrame для более плавного перехода
        requestAnimationFrame(() => {
            setIsPreparingDrag(false);
            setIsDragging(true);

            // Восстанавливаем позицию прокрутки через requestAnimationFrame
            requestAnimationFrame(() => {
                if (chatMessagesRef.current && window.dragScrollPosition !== undefined) {
                    chatMessagesRef.current.scrollTop = window.dragScrollPosition;
                }
            });
        });
    };

    const handleMouseMove = useCallback((e) => {
        if (!isDragging) return;

        const clientX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
        const clientY = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;

        const newX = clientX - dragOffset.x;
        const newY = clientY - dragOffset.y;

        // Используем ту же логику расчета размеров, что и в updatePosition
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        // Функция для получения размеров чата (дублируем из useEffect)
        const getChatDimensions = () => {
            if (windowWidth <= 480) {
                return {
                    width: Math.min(windowWidth * 0.9, 350),
                    height: 400
                };
            } else if (windowWidth <= 767) {
                return {
                    width: Math.min(windowWidth * 0.9, 400),
                    height: 450
                };
            } else if (windowWidth <= 1023) {
                return {
                    width: 280,
                    height: 500
                };
            } else if (windowWidth <= 1399) {
                return {
                    width: 300,
                    height: 550
                };
            } else {
                return {
                    width: 350,
                    height: 600
                };
            }
        };

        const chatDimensions = getChatDimensions();
        const margin = 20;

        // Ограничиваем перемещение границами окна с отступами
        const boundedX = Math.max(margin, Math.min(newX, windowWidth - chatDimensions.width - margin));
        const boundedY = Math.max(margin, Math.min(newY, windowHeight - chatDimensions.height - margin));

        setPosition({ x: boundedX, y: boundedY });

        // Предотвращаем скролл на мобильных при перетаскивании
        if (e.touches) {
            e.preventDefault();
        }
    }, [isDragging, dragOffset]);

    const handleMouseUp = useCallback(() => {
        if (isDragging) {
            // Сначала восстанавливаем позицию прокрутки, пока isDragging еще true
            if (chatMessagesRef.current && savedScrollPosition !== undefined) {
                chatMessagesRef.current.scrollTop = savedScrollPosition;
            }

            // Только потом меняем состояние isDragging
            setIsDragging(false);
            // Сохраняем позицию в контексте после завершения перетаскивания
            setChatPosition(position);

            // Очищаем глобальную переменную
            delete window.dragScrollPosition;
        }
    }, [position, setChatPosition, isDragging, savedScrollPosition]);

    // Добавляем и удаляем обработчики событий для мыши и touch
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);

            document.addEventListener('touchmove', handleMouseMove, { passive: false });
            document.addEventListener('touchend', handleMouseUp);

            document.body.style.userSelect = 'none'; // Предотвращаем выделение текста
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('touchmove', handleMouseMove);
            document.removeEventListener('touchend', handleMouseUp);
            document.body.style.userSelect = '';
        };
    }, [isDragging, handleMouseMove, handleMouseUp]);


    const addMessage = useCallback((message, name, side, timestamp, files = null) => {
        const imgRegex = /<img[^>]*src=['"]([^'"]+)['"][^>]*>/;
        const match = typeof message === "string" ? message.match(imgRegex) : null;

        let imageUrl = null;
        let cleanMessage = message;

        // If image tag is found, extract URL and clean message
        if (match) {
            imageUrl = match[1];
            cleanMessage = message.replace(imgRegex, '').trim();
        }

        // Add message with image URL and files if present
        setMessages(prevMessages => [
            ...prevMessages,
            {
                text: cleanMessage,
                name,
                side,
                timestamp,
                imageUrl, // This will be null if no image was found
                files: files || {
                    images: imageUrl ? [{ url: imageUrl, file_name: 'image' }] : [],
                    videos: [],
                    documents: [],
                    audio: []
                }
            }
        ]);
    }, []);

    useEffect(() => {
        if (currentIndex < questionsAndAnswers.length && !effectHasRun.current) {
            effectHasRun.current = true;

            const {question, answer, questionFiles, answerFiles} = questionsAndAnswers[currentIndex];
            let questionIndex = 0;

            const typeQuestion = () => {
                if (questionIndex < question.length) {
                    setInputValue(question.slice(0, questionIndex + 1));
                    questionIndex++;
                    setTimeout(typeQuestion, 50);
                } else {
                    // Передаем questionFiles для вопроса
                    addMessage(question, t('ChatWindowDemo-User'), "left", new Date(), questionFiles);
                    setInputValue("");

                    setTimeout(() => {
                        setIsTyping(true);
                        const duration = answer.length * 25;

                        setTimeout(() => {
                            // Передаем answerFiles для ответа
                            addMessage(answer, t('ChatWindowDemo-Responder'), "right", new Date(), answerFiles);
                            setIsTyping(false);
                            setCurrentIndex(prevIndex => prevIndex + 1);
                            setInputValue('');
                            effectHasRun.current = false;

                            if (currentIndex + 1 === questionsAndAnswers.length) {
                                setShowReplayButton(true);
                            }
                        }, duration);
                    }, 1100);
                }
            };

            typeQuestion();
        }
    }, [currentIndex, questionsAndAnswers, addMessage, t]);

    useEffect(() => {
        const loadQuestionsAndAnswers = async () => {
            try {
                const language = i18n.language;
                const questionsModule = await import(`./${language}QuestionsAndAnswers.json`);
                setQuestionsAndAnswers(questionsModule.default);
            } catch (error) {
                console.error("Error loading questions and answers:", error);
            }
        };

        loadQuestionsAndAnswers();
    }, [i18n.language]);

    // Автопрокрутка поля ввода к концу текста при печати
    useEffect(() => {
        if (inputRef.current && inputValue) {
            // Устанавливаем scrollLeft в максимальное значение, чтобы показать конец текста
            inputRef.current.scrollLeft = inputRef.current.scrollWidth;
        }
    }, [inputValue]);

    const handleReplay = () => {
        setMessages([]);
        setCurrentIndex(0);
        setShowReplayButton(false);
    };

    const [stage, setStage] = useState('chat-messages'); // Определяет, что отображать (chat-messages, buttons, или текст)
    // const [stage, setStage] = useState('buttons'); // FOR FASTER
    const [clickedButton, setClickedButton] = useState(null); // Для хранения номера кнопки, на которую нажали
    const [demoAssist, setDemoAssist] = useState(null)
    const handleStartTest = () => {
        setStage('buttons'); // Переходим к отображению кнопок
    };

    const handleButtonClick = (buttonNumber) => {
        setDemoAssist(() => {
            return Number(buttonNumber); // Возвращаем новое значение состояния
        });
        setClickedButton(buttonNumber); // Сохраняем номер нажатой кнопки
        setStage('after-dialog-text'); // Показываем текст после нажатия
    };

    const handleRestart = () => {
        setStage('chat-messages'); // Возвращаемся к исходному состоянию
        setClickedButton(null);
        setIsModalOpen(true);
    };

    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleCloseModal = () => {
        // setPermit(false)
        setIsModalOpen(false);
        setDemoAssist(null);
    };

    // Временно полностью отключаем useAutoScroll во время перетаскивания
    // useAutoScroll(messagesEndRef, (isDragging || isPreparingDrag) ? [] : [messages, isTyping]);

    // Используем useEffect для контроля автопрокрутки вручную
    useEffect(() => {
        // Автопрокрутка работает только если:
        // 1. Не происходит перетаскивание
        // 2. Пользователь был в самом низу перед перетаскиванием (или не было перетаскивания)
        if (!isDragging && !isPreparingDrag && wasAtBottom && messagesEndRef.current) {
            const scrollableParent = messagesEndRef.current.closest('.chat-messages-demo');
            if (scrollableParent) {
                scrollableParent.scrollTop = scrollableParent.scrollHeight;
            }
        }
    }, [messages, isTyping, isDragging, isPreparingDrag, wasAtBottom]);

    // Обработчик прокрутки для отслеживания позиции
    const handleScroll = useCallback(() => {
        if (chatMessagesRef.current && !isDragging && !isPreparingDrag) {
            const currentScroll = chatMessagesRef.current.scrollTop;
            const scrollHeight = chatMessagesRef.current.scrollHeight;
            const clientHeight = chatMessagesRef.current.clientHeight;

            // Проверяем, находится ли прокрутка в самом низу (с небольшой погрешностью)
            const isAtBottom = currentScroll + clientHeight >= scrollHeight - 5;
            setWasAtBottom(isAtBottom);
        }
    }, [isDragging, isPreparingDrag]);

    // Добавляем обработчик прокрутки
    useEffect(() => {
        const chatContainer = chatMessagesRef.current;
        if (chatContainer) {
            chatContainer.addEventListener('scroll', handleScroll);
            return () => {
                chatContainer.removeEventListener('scroll', handleScroll);
            };
        }
    }, [handleScroll]);

    return (
        <div
            className="chat-window-demo"
            ref={chatWindowRef}
            style={{
                // Применяем позиционирование для всех устройств
                left: `${position.x}px`,
                top: `${position.y}px`,
                cursor: isDragging ? 'grabbing' : 'default'
            }}
        >
            <div
                className="cap"
                onMouseDown={handleMouseDown}
                onTouchStart={handleMouseDown}
                style={{
                    cursor: isDragging ? 'grabbing' : 'grab'
                }}
            >
                <img
                    src="/landing/aperture.svg"
                    alt="Replay"
                    className="replay-button"
                    onClick={handleReplay}
                />
                <div className="circle"></div>
                <div className="minimize" onClick={onMinimize}><LiaWindowMinimize /></div>
                <b>Маруся AI</b>
            </div>
            {/*  Базовое состояние демонстрационный чат  */}
            {stage === 'chat-messages' && (
                <>
                    <div
                        className="chat-messages-demo"
                        ref={chatMessagesRef}
                        style={{
                            pointerEvents: (isDragging || isPreparingDrag) ? 'none' : 'auto'
                        }}
                    >
                        {messages.map((msg, index) => (
                            <div key={index} className={`chat-message ${msg.side}`}>
                                <div className="message-name">{msg.name}</div>

                                <div className="message-text">
                                    {msg.text}
                                    {msg.imageUrl && (
                                        <div className="message-image-container">
                                            <img src={msg.imageUrl} alt="Chat attachment" className="message-image" />
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
                                                    className="message-image"
                                                />
                                            </div>
                                        ))}

                                        {msg.files.audio?.map((audio, audioIndex) => (
                                            <div key={`audio-${audioIndex}`} className="message-audio-container">
                                                <audio controls className="chat-audio">
                                                    <source src={audio.url} type="audio/mpeg" />
                                                    Ваш браузер не поддерживает аудио элемент.
                                                </audio>
                                                <div className="file-name">{audio.file_name}</div>
                                            </div>
                                        ))}

                                        {msg.files.videos?.map((video, videoIndex) => (
                                            <div key={`video-${videoIndex}`} className="message-video-container">
                                                <video controls className="chat-video">
                                                    <source src={video.url} type="video/mp4" />
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

                                <div
                                    className={`message-timestamp ${msg.side}`}>{msg.timestamp.toLocaleTimeString()}</div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="chat-message right">
                                <TypingIndicator isTyping={isTyping} intervalTime={300} name={t('ChatWindowDemo-Responder')}/>
                            </div>
                        )}
                        <div ref={messagesEndRef}/>
                    </div>

                    {!showReplayButton && (
                        <div className="input-container">
                            <input
                                ref={inputRef}
                                type="text"
                                value={inputValue}
                                readOnly
                                className="input-field"
                            />
                            {/*<button className="input-container-button">{t('SimpleTransceiver-send')}</button>*/}
                            <button className="input-container-button"><IoSend/></button>
                        </div>
                    )}

                    {showReplayButton && (
                        <div className="after-dialog">
                            <div>
                                <p className="combined-text">
                                    <span className="replay-text" onClick={handleReplay}>{t('ChatWindowDemo-Replay')}</span>
                                    {t('ChatWindowDemo-Replay-text')}
                                </p>
                            </div>
                            <div className="tray-container">
                                <div className="input-container">
                                    <button onClick={handleStartTest}>{t('ChatWindowDemo-button-test')}</button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
            {/*  Состояние выбора модели тестового агента  */}
            {stage === 'buttons' && (
                <div className="button-group">
                    <b>{t('ChatWindowDemo-button-group')}</b>
                    {/* Первая кнопка под надписью */}
                    <div className="button-group-row">
                        <button onClick={() => handleButtonClick(1)} className="image-button">
                            <img src="/landing/psychological.svg" alt={t(`ChatWindowDemo-model-name-psycho`)} className="button-image"/>
                            {t('ChatWindowDemo-model-name-psycho')}
                        </button>
                    </div>
                    {/* Две кнопки в следующей строке */}
                    <div className="button-group-row">
                        <button onClick={() => handleButtonClick(2)} className="image-button">
                            <img src="/landing/lawyer.svg" alt={t(`ChatWindowDemo-model-name-lawyer`)} className="button-image"/>
                            {t('ChatWindowDemo-model-name-lawyer')}
                        </button>

                        <button onClick={() => handleButtonClick(3)} className="image-button">
                            <img src="/landing/support.svg" alt={t(`ChatWindowDemo-model-name-tech`)} className="button-image"/>
                            {t('ChatWindowDemo-model-name-tech')}
                        </button>
                    </div>
                </div>
            )}
            {/*  Подтверждение перехода к тестированию выбранной модели  */}
            {stage === 'after-dialog-text' && (
                <div className="after-dialog-confirm">
                    {(() => {
                        switch (clickedButton) {
                            case 1:
                                return <>
                                    <img src="/landing/psychological.svg" alt="Психолог" className="button-image"/>
                                    <p>{t('ChatWindowDemo-model-psycho')}</p>
                                </>;
                            case 2:
                                return <>
                                    <img src="/landing/lawyer.svg" alt="Юрист" className="button-image"/>
                                    <p>{t('ChatWindowDemo-model-lawyer')}</p>
                                </>;
                            case 3:
                                return <>
                                    <img src="/landing/support.svg" alt="Сотрудник поддержки" className="button-image"/>
                                    <p>{t('ChatWindowDemo-model-tech')}</p>
                                </>;
                            default:
                                return <p></p>;
                        }
                    })()}
                    <button onClick={handleRestart}>{t('ChatWindowDemo-button-start')}</button>
                </div>
            )}
            {/* Модальное окно */}
            <ConnectionStatus mode={"demo"} setConnected={setIsConnected}/>

            {isModalOpen && isConnected && (
                <Modal
                       itFreeClose={false}
                       onClose={handleCloseModal}
                >
                    <Examinator
                        mode={"demo"}
                        examId={demoAssist}
                        setToken={setToken}
                        setIsTokenLoading={setIsTokenLoading}
                    />
                    <ChatDemoAssist
                        isConnected={isConnected}
                        token={token}
                        isTokenLoading={isTokenLoading}
                        isModalOpen={setIsModalOpen}
                    />
                </Modal>
            )}
        </div>
    );
}