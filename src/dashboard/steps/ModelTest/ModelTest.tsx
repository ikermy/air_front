import React, {useState, useEffect, useRef} from "react";
import {
    Input,
    Button,
    Typography,
    Space,
    Alert,
    Tooltip,
    Badge,
    Empty,
    Switch,
    Upload,
    message as antMessage,
} from "antd";
import type { UploadFile } from "antd";
import {
    SendOutlined,
    PlayCircleOutlined,
    StopOutlined,
    RobotOutlined,
    UserOutlined,
    ClockCircleOutlined,
    LoadingOutlined,
    SoundOutlined,
    ClearOutlined,
    PaperClipOutlined,
    FileOutlined, ExperimentOutlined,
} from "@ant-design/icons";
import { MdDoneAll, MdErrorOutline } from "react-icons/md";
import {
    testStartSession,
    testAsk,
    testGetAnswer,
    testStopSession,
    StartSessionResponse,
    ServerFile,
    ApiError,
} from "./testUtils";
import {
    showNotification,
    showErrorNotification,
    showWarningNotification,
} from "../../hotification/showNotification";
import {useTranslation} from "react-i18next";
import "./ModelTest.css";
import MarkdownRenderer from "../../../utils/MarkdownRenderer";

const {TextArea} = Input;
const {Text} = Typography;

interface Message {
    id: string;
    type: "user" | "assistant" | "system";
    content: string;
    timestamp: Date;
    status?: "sending" | "sent" | "error";
    fileUrl?: string;      // URL файла (deprecated)
    fileName?: string;     // Имя файла (deprecated)
    fileType?: "image" | "file";  // Тип файла (deprecated)
    imageUrl?: string;     // URL изображения (deprecated)
    files?: ServerFile[];  // Массив файлов от сервера
}

interface ModelTestProps {
    disabled?: boolean;
    provider?: string;
}

export const ModelTest: React.FC<ModelTestProps> = ({
                                                        disabled = false,
                                                        provider = "undefined",
                                                    }) => {
    const {t} = useTranslation();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState("");
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [sessionInfo, setSessionInfo] = useState<StartSessionResponse | null>(null);
    const [voiceEnabled, setVoiceEnabled] = useState(false);
    const [autoScroll, setAutoScroll] = useState(true);
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WebSocket | null>(null);  // WebSocket вместо SSE
    const isSessionActiveRef = useRef<boolean>(false);
    const typingIndicatorStartTime = useRef<number | null>(null);

    // Автоскролл к последнему сообщению
    useEffect(() => {
        if (autoScroll && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({behavior: "smooth"});
        }
    }, [messages, autoScroll]);

    // Синхронизация ref с state для использования в cleanup
    useEffect(() => {
        isSessionActiveRef.current = isSessionActive;
    }, [isSessionActive]);

    // Очистка WebSocket и остановка сессии при размонтировании
    useEffect(() => {
        return () => {
            // Закрываем WebSocket
            if (wsRef.current) {
                wsRef.current.close();
            }

            // Останавливаем сессию если она активна
            if (isSessionActiveRef.current) {
                const stopSession = async () => {
                    try {
                        const token = localStorage.getItem("authToken");
                        if (token) {
                            await testStopSession(token);
                        }
                    } catch (error) {
                        console.error("Error stopping session on unmount:", error);
                    }
                };
                stopSession();
            }
        };
    }, []);

    // Обработка запуска сессии
    const handleStartSession = async () => {
        try {
            const token = localStorage.getItem("authToken");
            if (!token) {
                showErrorNotification(
                    t("error") || "Ошибка",
                    t("tokenNotFound") || "Токен не найден"
                );
                return;
            }

            setIsLoading(true);
            const response = await testStartSession(token, provider);

            setSessionInfo(response);
            setIsSessionActive(true);

            // Добавляем системное сообщение о начале сессии
            const systemMessage: Message = {
                id: `system-${Date.now()}`,
                type: "system",
                content: `${t("sessionStarted") || "Тестовая сессия запущена"} # ${response.dialog_id}`,
                timestamp: new Date(),
            };
            setMessages([systemMessage]);

            showNotification(
                t("success") || "Успешно",
                t("sessionStarted") || "Тестовая сессия запущена"
            );

            // Подключаем WebSocket ПОСЛЕ успешного старта сессии
            await connectWebSocket(token);
        } catch (error: any) {
            console.error("Error starting session:", error);

            let errorMessage = t("sessionStartError") || "Ошибка запуска сессии";

            // Более детальная обработка ошибок
            if (error.message?.includes("Failed to fetch")) {
                errorMessage = t("networkError") || "Ошибка сети. Проверьте подключение к серверу.";
            } else if (error.message?.includes("Token validation failed")) {
                errorMessage = t("tokenValidationError") || "Ошибка проверки токена. Пожалуйста, войдите снова.";
            } else if (error.message?.includes("HTTP Error: 401")) {
                errorMessage = t("unauthorizedError") || "Не авторизован. Пожалуйста, войдите снова.";
            } else if (error.message?.includes("HTTP Error: 403")) {
                errorMessage = t("forbiddenError") || "Доступ запрещён.";
            } else if (error.message?.includes("HTTP Error: 500")) {
                errorMessage = t("serverError") || "Ошибка сервера. Попробуйте позже.";
            } else if (error.message) {
                errorMessage = error.message;
            }

            showErrorNotification(
                t("error") || "Ошибка",
                errorMessage
            );
        } finally {
            setIsLoading(false);
        }
    };

    // Функция подключения WebSocket
    const connectWebSocket = async (token: string) => {
        try {
            // Закрываем старое соединение если оно ещё открыто
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.close();
            }

            // небольшая задержка в 500 ms для обхода allow
            await new Promise(resolve => setTimeout(resolve, 500));

            wsRef.current = testGetAnswer(
                token,
                async (answer) => {
                    // Минимальная задержка показа индикатора (500мс)
                    const MIN_TYPING_DELAY = 500;
                    if (typingIndicatorStartTime.current) {
                        const elapsed = Date.now() - typingIndicatorStartTime.current;
                        if (elapsed < MIN_TYPING_DELAY) {
                            await new Promise(resolve => setTimeout(resolve, MIN_TYPING_DELAY - elapsed));
                        }
                        typingIndicatorStartTime.current = null;
                    }

                    // Удаляем индикатор загрузки если есть
                    setMessages((prev) =>
                        prev.filter((msg) => !msg.id.startsWith("loading-"))
                    );

                    // Добавляем ответ от ассистента с поддержкой файлов
                    const assistantMessage: Message = {
                        id: `assistant-${Date.now()}`,
                        type: "assistant",
                        content: answer.message || JSON.stringify(answer, null, 2),
                        timestamp: new Date(answer.created_at || Date.now()),
                        status: "sent",
                        // Сохраняем массив файлов если есть
                        ...(answer.files && answer.files.length > 0 && {
                            files: answer.files
                        }),
                        // Для обратной совместимости: старые поля
                        ...(answer.file_url && {
                            fileUrl: answer.file_url,
                            fileName: answer.file_name,
                            fileType: answer.file_type as "image" | "file",
                        }),
                        ...(answer.image_url && {
                            imageUrl: answer.image_url,
                            fileType: "image",
                        }),
                    };
                    setMessages((prev) => [...prev, assistantMessage]);
                    setIsSending(false);
                },
                (error) => {
                    console.error("WebSocket error:", error);
                    // Удаляем индикатор загрузки
                    setMessages((prev) =>
                        prev.filter((msg) => !msg.id.startsWith("loading-"))
                    );
                    showErrorNotification(
                        t("error") || "Ошибка",
                        t("connectionError") || "Ошибка WebSocket соединения"
                    );
                    setIsSending(false);
                },
            );
        } catch (error: any) {
            console.error("Error connecting WebSocket:", error);
            showErrorNotification(
                t("error") || "Ошибка",
                t("websocketError") || "Ошибка подключения WebSocket"
            );
        }
    };

    // Обработка остановки сессии
    const handleStopSession = async () => {
        try {
            const token = localStorage.getItem("authToken");
            if (!token) {
                showErrorNotification(
                    t("error") || "Ошибка",
                    t("tokenNotFound") || "Токен не найден"
                );
                return;
            }

            setIsLoading(true);

            // Закрываем WebSocket соединение
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }

            await testStopSession(token);

            setIsSessionActive(false);
            setSessionInfo(null);

            // Добавляем системное сообщение о завершении сессии
            const systemMessage: Message = {
                id: `system-${Date.now()}`,
                type: "system",
                content: "Сессия завершена",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, systemMessage]);

            showNotification(
                t("success") || "Успешно",
                t("sessionStopped") || "Тестовая сессия завершена"
            );
        } catch (error: any) {
            showErrorNotification(
                t("error") || "Ошибка",
                error.message || t("sessionStopError") || "Ошибка остановки сессии"
            );
        } finally {
            setIsLoading(false);
            setIsSending(false);  // ← Сбрасываем флаг отправки
        }
    };

    // Обработка загрузки файлов
    const handleFileChange = ({ fileList: newFileList }: any) => {
        setFileList(newFileList);
    };

    const beforeUpload = (file: File) => {
        // Проверка размера файла (макс 10MB)
        const isLt10M = file.size / 1024 / 1024 < 10;
        if (!isLt10M) {
            antMessage.error('Файл должен быть меньше 10MB!');
            return Upload.LIST_IGNORE;
        }
        return false; // Предотвращаем автоматическую загрузку
    };

    const removeFile = (file: UploadFile) => {
        const index = fileList.indexOf(file);
        const newFileList = fileList.slice();
        newFileList.splice(index, 1);
        setFileList(newFileList);
    };

    // Обработка отправки вопроса
    const handleSendQuestion = async () => {
        // В режиме voice можно отправить файлы без текста
        // В обычном режиме текст обязателен
        const hasText = inputText.trim().length > 0;
        const hasFiles = fileList.length > 0;

        if (!hasText && !hasFiles) {
            showWarningNotification(
                t("warning") || "Предупреждение",
                t("emptyMessageAndFiles") || "Введите сообщение или прикрепите файл"
            );
            return;
        }

        if (!hasText && hasFiles && !voiceEnabled) {
            showWarningNotification(
                t("warning") || "Предупреждение",
                t("textRequiredWithFiles") || "Введите текст сообщения. Отправка только файлов доступна в голосовом режиме"
            );
            return;
        }

        if (!isSessionActive) {
            showWarningNotification(
                t("warning") || "Предупреждение",
                t("sessionNotActive") || "Сначала запустите сессию"
            );
            return;
        }

        // Сохраняем текст ДО очистки (может быть пустым только в voice режиме с файлами)
        const questionText = inputText.trim();

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            type: "user",
            content: questionText || (fileList.length > 0 ? `📎 ${fileList.length} ${fileList.length === 1 ? 'файл' : 'файлов'}` : ""),
            timestamp: new Date(),
            status: "sending",
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputText("");
        const attachedFiles = [...fileList]; // Сохраняем файлы
        setFileList([]); // Очищаем список файлов
        setIsSending(true);

        try {
            const token = localStorage.getItem("authToken");
            if (!token) {
                throw new Error("Токен не найден");
            }

            // Добавляем индикатор печати (анимация) ДО отправки
            const loadingMessage: Message = {
                id: `loading-${Date.now()}`,
                type: "assistant",
                content: "typing", // Специальный маркер для анимации печати
                timestamp: new Date(),
                status: "sending",
            };
            typingIndicatorStartTime.current = Date.now(); // Запоминаем время начала
            setMessages((prev) => [...prev, loadingMessage]);

            // Подготовка файлов для отправки
            let filesToSend: any[] | undefined = undefined;

            if (attachedFiles.length > 0) {
                if (voiceEnabled) {
                    // В voice режиме передаём UploadFile с originFileObj для конвертации в base64
                    filesToSend = attachedFiles;
                } else {
                    // В обычном режиме передаём только метаданные
                    filesToSend = attachedFiles.map(file => ({
                        url: file.url || "",
                        name: file.name,
                        type: file.type || "",
                        size: file.size || 0,
                    }));
                }
            }

            // Отправляем сохранённый текст вопроса (может быть пустым) с файлами
            await testAsk(token, questionText || " ", voiceEnabled, filesToSend);
            // Обновляем статус сообщения пользователя
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === userMessage.id ? {...msg, status: "sent"} : msg
                )
            );

            // Ответ придет через WebSocket в handleStartSession
        } catch (error: any) {
            // Удаляем индикатор загрузки
            setMessages((prev) =>
                prev.filter((msg) => !msg.id.startsWith("loading-"))
            );

            // Помечаем сообщение пользователя как ошибку
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === userMessage.id ? {...msg, status: "error"} : msg
                )
            );

            // Обработка ошибки 429 (превышение лимита)
            let errorMessage = error.message || t("sendQuestionError") || "Ошибка отправки вопроса";

            if (error instanceof ApiError && error.status === 429 && error.data) {
                const resetTime = error.data.reset_in || "неизвестно";
                errorMessage = `${t("testDemoLimitReached")}. ${t("testDemoLimitReset", { time: resetTime })}`;
            }

            showErrorNotification(
                t("error") || "Ошибка",
                errorMessage
            );
            setIsSending(false);
        }
    };

    // Обработка нажатия Enter
    const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendQuestion();
        }
    };

    // Очистка истории сообщений
    const handleClearMessages = () => {
        setMessages([]);
    };

    // Рендер сообщения
    const renderMessage = (message: Message) => {
        const isUser = message.type === "user";
        const isSystem = message.type === "system";
        const isTyping = message.content === "typing"; // Проверка на анимацию печати

        return (
            <div
                key={message.id}
                className={`message-item ${isUser ? "message-user" : ""} ${
                    isSystem ? "message-system" : ""
                }`}
                style={{ position: 'relative' }}
            >
                <div className="message-avatar">
                    {isUser ? (
                        <UserOutlined/>
                    ) : isSystem ? (
                        <ClockCircleOutlined/>
                    ) : (
                        <RobotOutlined/>
                    )}
                </div>
                <div className="message-content">
                    <div className="message-header">
                        <Text strong>
                            {isUser
                                ? t("you") || "Вы"
                                : isSystem
                                    ? t("system") || "Система"
                                    : t("assistant") || "Агент"}
                        </Text>
                        <Text type="secondary" className="message-time">
                            {message.timestamp.toLocaleTimeString()}
                        </Text>
                    </div>
                    <div className="message-text">
                        {isTyping ? (
                            // Анимация печати
                            <div className="typing-indicator-container">
                                <div className="typing-indicator">
                                    <span className="typing-dot"></span>
                                    <span className="typing-dot"></span>
                                    <span className="typing-dot"></span>
                                </div>
                                <span className="typing-indicator-text">
                                    {t("assistantTyping") || "печатает"}
                                </span>
                            </div>
                        ) : (
                            <>
                                <div
                                    className={`message-content-text ${isSystem ? "system-text" : ""}`}
                                    style={{marginBottom: (message.files || message.fileType) ? 8 : 0}}
                                >
                                    {<MarkdownRenderer text={message.content} />}
                                </div>

                                {/* Отображение множественных файлов из массива */}
                                {message.files && message.files.length > 0 && (
                                    <div style={{
                                        marginTop: 8,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 8
                                    }}>
                                        {message.files.map((file, index) => (
                                            <div key={index}>
                                                {file.type === "photo" ? (
                                                    <div>
                                                        <a
                                                            href={file.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{ display: 'inline-block' }}
                                                        >
                                                            <img
                                                                src={file.url}
                                                                alt={file.file_name}
                                                                style={{
                                                                    maxWidth: "100%",
                                                                    maxHeight: 300,
                                                                    borderRadius: 8,
                                                                    cursor: 'pointer',
                                                                    border: '1px solid var(--shadow-color, #e8e8e8)',
                                                                }}
                                                                onError={(e) => {
                                                                    e.currentTarget.style.display = 'none';
                                                                }}
                                                            />
                                                        </a>
                                                        {file.caption && (
                                                            <div style={{
                                                                fontSize: 12,
                                                                color: 'var(--text-color)',
                                                                opacity: 0.7,
                                                                marginTop: 4
                                                            }}>
                                                                {file.caption}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div style={{
                                                        padding: 8,
                                                        backgroundColor: 'var(--midle-color, #f9f9f9)',
                                                        borderRadius: 8,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 8,
                                                    }}>
                                                        <FileOutlined style={{ fontSize: 20, color: 'var(--link-color)' }} />
                                                        <a
                                                            href={file.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{ flex: 1 }}
                                                        >
                                                            {file.file_name}
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Fallback: отображение одиночного изображения (старый формат) */}
                                {!message.files && message.fileType === "image" && (message.imageUrl || message.fileUrl) && (
                                    <div style={{ marginTop: 8 }}>
                                        <a
                                            href={message.imageUrl || message.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ display: 'inline-block' }}
                                        >
                                            <img
                                                src={message.imageUrl || message.fileUrl}
                                                alt={message.fileName || "Image"}
                                                style={{
                                                    maxWidth: "100%",
                                                    maxHeight: 300,
                                                    borderRadius: 8,
                                                    cursor: 'pointer',
                                                    border: '1px solid var(--shadow-color, #e8e8e8)',
                                                }}
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                }}
                                            />
                                        </a>
                                    </div>
                                )}

                                {/* Fallback: отображение одиночного файла (старый формат) */}
                                {!message.files && message.fileType === "file" && message.fileUrl && (
                                    <div style={{
                                        marginTop: 8,
                                        padding: 8,
                                        backgroundColor: 'var(--midle-color, #f9f9f9)',
                                        borderRadius: 8,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                    }}>
                                        <FileOutlined style={{ fontSize: 20, color: 'var(--link-color)' }} />
                                        <a
                                            href={message.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ flex: 1 }}
                                        >
                                            {message.fileName || "Скачать файл"}
                                        </a>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
                {/* Иконки статуса в нижнем правом углу - только для сообщений пользователя */}
                {isUser && message.status && (
                    <div style={{
                        position: 'absolute',
                        bottom: '8px',
                        right: '12px',
                        display: 'flex',
                        alignItems: 'center',
                    }}>
                        {message.status === "sending" && (
                            <LoadingOutlined style={{ color: 'var(--blue-color, #1890ff)', fontSize: '14px' }} />
                        )}
                        {message.status === "sent" && (
                            <Tooltip title={t("sent") || "Отправлено"}>
                                <span style={{ display: 'flex', alignItems: 'center', color: 'var(--conected-color, #52c41a)', fontSize: '14px', cursor: 'pointer' }}>
                                    <MdDoneAll />
                                </span>
                            </Tooltip>
                        )}
                        {message.status === "error" && (
                            <Tooltip title={t("error") || "Ошибка отправки"}>
                                <span style={{ display: 'flex', alignItems: 'center', color: 'var(--error-color, #ff0202)', fontSize: '14px', cursor: 'pointer' }}>
                                    <MdErrorOutline />
                                </span>
                            </Tooltip>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="model-test-container">
            <div
                style={{
                    backgroundColor: "var(--bg-color, #ffffff)",
                    borderRadius: "var(--border-radius, 10px)",
                    boxShadow: "0 2px 8px var(--shadow-color, rgba(0, 0, 0, 0.1))",
                    border: "1px solid var(--shadow-color, #e8e8e8)",
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                    overflow: "hidden",
                }}
            >
                {/* Заголовок карточки - закреплён сверху */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "24px",
                        borderBottom: "1px solid var(--shadow-color, #e8e8e8)",
                        flexShrink: 0,
                        zIndex: 10,
                        backgroundColor: "var(--bg-color, #ffffff)",
                    }}
                >
                    <Space>
                        <ExperimentOutlined style={{fontSize: "20px"}}/>
                        <span style={{fontSize: "18px", fontWeight: 600}}>
                            {t("modelTest") || "Тестирование модели"}
                        </span>
                        {isSessionActive && (
                            <Badge status="processing" text={t("active") || "Активна"}/>
                        )}
                    </Space>
                    <Space>
                        {isSessionActive && (
                            <>
                                <Tooltip title={t("clearHistory") || "Очистить историю"}>
                                    <Button
                                        icon={<ClearOutlined/>}
                                        onClick={handleClearMessages}
                                        disabled={messages.length === 0}
                                    />
                                </Tooltip>
                                <Tooltip title={t("autoScroll") || "Автопрокрутка"}>
                                    <Switch
                                        checked={autoScroll}
                                        onChange={setAutoScroll}
                                        size="small"
                                    />
                                </Tooltip>
                            </>
                        )}
                        {!isSessionActive ? (
                            <Button
                                style={{ color : 'black' }}
                                type="primary"
                                icon={<PlayCircleOutlined/>}
                                onClick={handleStartSession}
                                loading={isLoading}
                                disabled={disabled}
                            >
                                {t("startSession") || "Запустить сессию"}
                            </Button>
                        ) : (
                            <Button
                                danger
                                icon={<StopOutlined/>}
                                onClick={handleStopSession}
                                loading={isLoading}
                            >
                                {t("stopSession") || "Остановить сессию"}
                            </Button>
                        )}
                    </Space>
                </div>

                {/* Прокручиваемое содержимое - Alert + сообщения */}
                <div
                    style={{
                        flex: 1,
                        overflowY: "auto",
                        padding: "24px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "16px",
                    }}
                >
                    {/* Информация о сессии */}
                    {sessionInfo && (
                        <Alert
                            message={t("sessionInfo") || "Информация о сессии"}
                            description={
                                <Space direction="vertical" size="small" style={{width: '100%'}}>
                                    <div>
                                        <Text strong>
                                            {t("modelName") || "Модель"}:
                                        </Text>
                                        <Text style={{marginLeft: '8px'}}>
                                            {sessionInfo.model_name || "Модель не указана"}
                                        </Text>
                                    </div>

                                    <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                        <Text strong>
                                            {t("provider") || "Провайдер"}:
                                        </Text>
                                        <Badge
                                            count={sessionInfo.provider?.toUpperCase()}
                                            style={{
                                                backgroundColor: '#1890ff',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                padding: '0 12px',
                                                height: '24px',
                                                lineHeight: '24px',
                                                borderRadius: '12px',
                                                boxShadow: '0 2px 8px rgba(24, 144, 255, 0.3)'
                                            }}
                                        />
                                    </div>
                                    {/*<div>*/}
                                    {/*    <Text strong>*/}
                                    {/*        {t("modelName") || "Модель"}:*/}
                                    {/*    </Text>*/}
                                    {/*    <Text style={{marginLeft: '8px'}}>*/}
                                    {/*        {sessionInfo.model_name || "Модель не указана"}*/}
                                    {/*    </Text>*/}
                                    {/*</div>*/}
                                    {(sessionInfo.s3_files || sessionInfo.image_generation || sessionInfo.code_interpreter || sessionInfo.web_search || sessionInfo.video_generation) && (
                                        <div style={{display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap'}}>
                                            <Text strong>
                                                {t("capabilities") || "Возможности"}:
                                            </Text>
                                            {sessionInfo.s3_files && (
                                                <Badge
                                                    count={t("s3FilesSupport") || "S3 файлы"}
                                                    style={{
                                                        backgroundColor: '#52c41a',
                                                        fontSize: '12px',
                                                        fontWeight: 600,
                                                        padding: '0 12px',
                                                        height: '24px',
                                                        lineHeight: '24px',
                                                        borderRadius: '12px',
                                                        boxShadow: '0 2px 8px rgba(82, 196, 26, 0.3)'
                                                    }}
                                                />
                                            )}
                                            {sessionInfo.image_generation && (
                                                <Badge
                                                    count={t("imageGeneration") || "Генерация изображений"}
                                                    style={{
                                                        backgroundColor: '#722ed1',
                                                        fontSize: '12px',
                                                        fontWeight: 600,
                                                        padding: '0 12px',
                                                        height: '24px',
                                                        lineHeight: '24px',
                                                        borderRadius: '12px',
                                                        boxShadow: '0 2px 8px rgba(114, 46, 209, 0.3)'
                                                    }}
                                                />
                                            )}
                                            {sessionInfo.video_generation && (
                                                <Badge
                                                    count={t("videoGeneration") || "Генерация видео"}
                                                    style={{
                                                        backgroundColor: '#eb2f96',
                                                        fontSize: '12px',
                                                        fontWeight: 600,
                                                        padding: '0 12px',
                                                        height: '24px',
                                                        lineHeight: '24px',
                                                        borderRadius: '12px',
                                                        boxShadow: '0 2px 8px rgba(235, 47, 150, 0.3)'
                                                    }}
                                                />
                                            )}
                                            {sessionInfo.code_interpreter && (
                                                <Badge
                                                    count={t("codeInterpreter") || "Интерпретатор кода"}
                                                    style={{
                                                        backgroundColor: '#fa8c16',
                                                        fontSize: '12px',
                                                        fontWeight: 600,
                                                        padding: '0 12px',
                                                        height: '24px',
                                                        lineHeight: '24px',
                                                        borderRadius: '12px',
                                                        boxShadow: '0 2px 8px rgba(250, 140, 22, 0.3)'
                                                    }}
                                                />
                                            )}
                                            {sessionInfo.web_search && (
                                                <Badge
                                                    count={t("webSearch") || "Веб-поиск"}
                                                    style={{
                                                        backgroundColor: '#13c2c2',
                                                        fontSize: '12px',
                                                        fontWeight: 600,
                                                        padding: '0 12px',
                                                        height: '24px',
                                                        lineHeight: '24px',
                                                        borderRadius: '12px',
                                                        boxShadow: '0 2px 8px rgba(19, 194, 194, 0.3)'
                                                    }}
                                                />
                                            )}
                                        </div>
                                    )}
                                    <Text type="secondary">
                                        <strong>{t("startedAt") || "Запущена"}:</strong>{" "}
                                        {new Date(sessionInfo.started_at).toLocaleString()}
                                    </Text>
                                </Space>
                            }
                            type="info"
                            showIcon
                        />
                    )}

                    {/* Область сообщений */}
                    <div
                        className="messages-container"
                        ref={messagesContainerRef}
                        style={{
                            flex: 1,
                            padding: "16px",
                            backgroundColor: "var(--dialog-list-bg, #f5f5f5)",
                            borderRadius: "var(--border-radius, 10px)",
                            border: "1px solid var(--shadow-color, #e8e8e8)",
                            display: "flex",
                            flexDirection: "column",
                        }}
                    >
                        {messages.length === 0 ? (
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description={
                                    isSessionActive
                                        ? t("noMessages") || "Нет сообщений. Начните диалог!"
                                        : t("startSessionToTest") ||
                                        "Запустите сессию для тестирования"
                                }
                            />
                        ) : (
                            <Space direction="vertical" style={{width: "100%"}} size="middle">
                                {messages.map(renderMessage)}
                                <div ref={messagesEndRef}/>
                            </Space>
                        )}
                    </div>
                </div>

                {/* Панель ввода - закреплена внизу */}
                <div
                    className="input-panel"
                    style={{
                        backgroundColor: "var(--input-bg, #ffffff)",
                        padding: "16px 24px",
                        borderTop: "1px solid var(--shadow-color, #e8e8e8)",
                        flexShrink: 0,
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                    }}
                >
                    <Space direction="vertical" style={{width: "100%"}} size="middle">
                        <Space style={{width: "100%"}}>
                            <Tooltip
                                title={
                                    voiceEnabled
                                        ? t("voiceEnabled") || "Голос включен"
                                        : t("voiceDisabled") || "Голос выключен"
                                }
                            >
                                <Switch
                                    checkedChildren={<SoundOutlined style={{ color: 'black' }} />}
                                    unCheckedChildren={<SoundOutlined style={{ color: 'black' }} />}
                                    checked={voiceEnabled}
                                    onChange={setVoiceEnabled}
                                    disabled={!isSessionActive || isSending}
                                />
                            </Tooltip>
                            <Text type="secondary">
                                {voiceEnabled
                                    ? t("withVoice") || "С голосом"
                                    : t("textOnly") || "Только текст"}
                            </Text>
                        </Space>

                        <Space.Compact style={{width: "100%"}}>
                            <div style={{position: 'relative', flex: 1}} className="model-test-textarea">
                                <TextArea
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder={
                                        isSessionActive
                                            ? t("enterMessage") || "Введите сообщение... (Enter для отправки, Shift+Enter для новой строки)"
                                            : t("startSessionFirst") || "Сначала запустите сессию"
                                    }
                                    autoSize={{minRows: 2, maxRows: 6}}
                                    disabled={!isSessionActive || isSending}
                                    style={{width: '100%', paddingLeft: sessionInfo?.s3_files ? '45px' : undefined}}
                                />
                                {/* Иконка прикрепления файла внутри TextArea */}
                                {sessionInfo?.s3_files && (
                                    <Tooltip title={t("attachFile") || "Прикрепить файл"}>
                                        <div
                                            style={{
                                                position: 'absolute',
                                                left: '8px',
                                                bottom: '8px',
                                                zIndex: 10,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: '32px',
                                                height: '32px',
                                                borderRadius: '4px',
                                                transition: 'background-color 0.3s',
                                                cursor: !isSessionActive || isSending ? 'not-allowed' : 'pointer',
                                                backgroundColor: 'transparent'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!(!isSessionActive || isSending)) {
                                                    e.currentTarget.style.backgroundColor = 'rgba(24, 144, 255, 0.1)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }}
                                        >
                                            <Upload
                                                fileList={fileList}
                                                onChange={handleFileChange}
                                                beforeUpload={beforeUpload}
                                                onRemove={removeFile}
                                                disabled={!isSessionActive || isSending}
                                                maxCount={5}
                                                showUploadList={false}
                                            >
                                                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <PaperClipOutlined
                                                        style={{
                                                            fontSize: '20px',
                                                            // color: !isSessionActive || isSending ? '#d9d9d9' : '#1890ff',
                                                            transition: 'all 0.3s'
                                                        }}
                                                    />
                                                </span>
                                            </Upload>
                                        </div>
                                    </Tooltip>
                                )}
                            </div>
                            <Button
                                type="primary"
                                icon={<SendOutlined/>}
                                onClick={handleSendQuestion}
                                loading={isSending}
                                disabled={
                                    !isSessionActive ||
                                    isSending ||
                                    // Нет текста и нет файлов
                                    (!inputText.trim() && fileList.length === 0) ||
                                    // Нет текста, есть файлы, но не voice режим
                                    (!inputText.trim() && fileList.length > 0 && !voiceEnabled)
                                }
                                style={{height: "auto", color: 'black'}}
                            >
                                {t("send") || "Отправить"}
                            </Button>
                        </Space.Compact>
                    </Space>
                </div>
                {/* Конец главного контейнера карточки */}
            </div>
        </div>
    );
};

export default ModelTest;

