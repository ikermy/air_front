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
    Popconfirm,
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
    FileOutlined,
    ExperimentOutlined,
    DeleteOutlined,
    AudioOutlined,
    AudioMutedOutlined,
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
    FunctionCallEvent,
} from "./testUtils";
import {
    showNotification,
    showErrorNotification,
    showWarningNotification,
} from "../../hotification/showNotification";
import {useTranslation} from "react-i18next";
import "./ModelTest.css";
import MarkdownRenderer from "../../../utils/MarkdownRenderer";
import {DeleteDialog} from "../../../dialog/dialogUtils";
import { RealtimeController } from "./realtime/realtime-controller";
import type { RealtimeState } from "./realtime/types";

const {TextArea} = Input;
const {Text} = Typography;

// Функция для получения цвета провайдера
const getProviderColor = (provider: string | undefined): string => {
    if (!provider) return '#1890ff';

    const providerLower = provider.toLowerCase();
    const colors: Record<string, string> = {
        'openai': '#10a37f',
        'mistral': '#f88500',
        'mistralai': '#f88500',
        'google': '#1092ff',
        'gemini': '#1092ff',
    };

    return colors[providerLower] || '#1890ff';
};

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
    sentAt?: number;       // Время отправки вопроса (timestamp в мс)
    firstDeltaAt?: number; // Время получения первой дельты (timestamp в мс)
    finalAnswerAt?: number; // Время получения финального ответа (timestamp в мс)
    functionCalls?: Array<{  // Массив завершённых вызовов функций (добавлено 2026-02-15)
        id: string;
        call_id: string;
        name: string;
        arguments: string;
    }>;
    tokenUsage?: {           // Информация о расходе токенов (добавлено 2026-02-15)
        input_tokens: number;
        input_tokens_details?: {
            cached_tokens: number;
        };
        output_tokens: number;
        output_tokens_details?: {
            reasoning_tokens?: number;
            accepted_prediction_tokens?: number;
            rejected_prediction_tokens?: number;
        };
        total_tokens: number;
    };
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
    const [ignoreMode, setIgnoreMode] = useState(true); // true = блокировать ввод до ответа модели (ignore=true); false = не блокировать (ignore=false)
    const [sessionInfo, setSessionInfo] = useState<StartSessionResponse | null>(null);
    const [voiceEnabled, setVoiceEnabled] = useState(false);
    const [autoScroll, setAutoScroll] = useState(true);
    const [showFunctionCalls, setShowFunctionCalls] = useState(true); // Показывать Function Calls
    const [fileList, setFileList] = useState<UploadFile[]>([]);

    // ── REALTIME ─────────────────────────────────────────────────────────
    // realtimeAvailable: сервер разрешил режим для этой модели (из response.realtime)
    const [realtimeAvailable, setRealtimeAvailable] = useState(false);
    // realtimeActive: пользователь включил переключатель 🎤
    const [realtimeActive, setRealtimeActive] = useState(false);
    // realtimeState: текущее FSM-состояние контроллера
    const [realtimeState, setRealtimeState] = useState<RealtimeState>('idle');
    // realtimeTranscript: накопленный транскрипт ответа ассистента
    const [realtimeTranscript, setRealtimeTranscript] = useState('');
    // Ref на контроллер — не пересоздаётся при ре-рендерах
    const realtimeControllerRef = useRef<RealtimeController | null>(null);

    // TRUE STREAMING - добавлено 2026-02-13
    // Отображаемый текст (накапливается из дельт)
    const [streamingText, setStreamingText] = useState<string>('');
    // ID текущего потокового сообщения
    const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

    // FUNCTION CALLS - добавлено 2026-02-15
    // Активные вызовы функций (во время формирования аргументов)
    interface FunctionCallInfo {
        id: string;
        call_id: string;
        name: string;
        arguments: string;
    }
    const [activeFunctionCalls, setActiveFunctionCalls] = useState<Map<string, FunctionCallInfo>>(new Map());

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WebSocket | null>(null);  // WebSocket вместо SSE
    const isSessionActiveRef = useRef<boolean>(false);
    const intentionalCloseRef = useRef<boolean>(false);  // Флаг намеренного закрытия WS

    // ⏱️ RESPONSE TIMING - добавлено 2026-02-14
    // Время отправки последнего вопроса (Date.now())
    // Используется для расчёта:
    // - ⚡ firstDeltaAt - sentAt = время до первого символа (TRUE STREAMING)
    // - ⏱️ finalAnswerAt - sentAt = полное время ответа модели
    const lastQuestionSentAtRef = useRef<number | null>(null);

    // Автоскролл к последнему сообщению (с учётом потокового текста)
    useEffect(() => {
        if (autoScroll && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({behavior: "smooth"});
        }
    }, [messages, streamingText, autoScroll]);

    // Синхронизация ref с state для использования в cleanup
    useEffect(() => {
        isSessionActiveRef.current = isSessionActive;
    }, [isSessionActive]);

    // Очистка WebSocket и остановка сессии при размонтировании
    useEffect(() => {
        return () => {
            // Закрываем WebSocket
            if (wsRef.current) {
                intentionalCloseRef.current = true;  // Помечаем как намеренное закрытие
                wsRef.current.close();
            }

            // Останавливаем сессию если она активна
            if (isSessionActiveRef.current) {
                const stopSession = async () => {
                    try {
                        await testStopSession();
                    } catch (error) {
                        console.error("Error stopping session on unmount:", error);
                    }
                };
                stopSession();
            }

            // Останавливаем Realtime если активен
            realtimeControllerRef.current?.stop();
        };
    }, []);

    // Обработка запуска сессии
    const handleStartSession = async () => {
        try {
            setIsLoading(true);
            const response = await testStartSession(provider);
            setSessionInfo(response);
            setIsSessionActive(true);
            setIgnoreMode(!!response.ignore); // Устанавливаем режим ignore из ответа сервера
            setRealtimeAvailable(!!response.realtime); // Доступность Realtime из ответа сервера

            // Добавляем системное сообщение о начале сессии
            const systemMessage: Message = {
                id: `system-${Date.now()}`,
                type: "system",
                content: `${t("sessionStarted") || "Тестовая сессия запущена"} # ${response.tread_id}`,
                timestamp: new Date(),
            };
            setMessages([systemMessage]);

            showNotification(
                t("success") || "Успешно",
                t("sessionStarted") || "Тестовая сессия запущена"
            );

            // Подключаем WebSocket ПОСЛЕ успешного старта сессии
            await connectWebSocket();
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

    // Функция подключения WebSocket с поддержкой TRUE STREAMING
    const connectWebSocket = async () => {
        try {
            // Закрываем старое соединение если оно ещё открыто
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.close();
            }

            // Небольшая задержка чтобы сервер успел инициализировать канал
            await new Promise(resolve => setTimeout(resolve, 250));

            wsRef.current = testGetAnswer(
                // onMessage - финальный ответ
                (answer) => {
                    // TRUE STREAMING: Сначала очищаем потоковое состояние
                    // Это уберёт streaming элемент из UI
                    setStreamingText('');
                    setStreamingMessageId(null);

                    // Удаляем индикатор загрузки если есть
                    setMessages((prev) =>
                        prev.filter((msg) => !msg.id.startsWith("loading-"))
                    );

                    // ⏱️ МЕТРИКИ ВРЕМЕНИ ОТВЕТА
                    // ⚡ Time to First Delta = время до первого символа (TRUE STREAMING)
                    // ⏱️ Time to Final Answer = полное время ответа модели
                    const lastSentAt = lastQuestionSentAtRef.current;

                    if (answer.firstDeltaAt && lastSentAt) {
                        const timeToFirstDelta = answer.firstDeltaAt - lastSentAt;
                        const formatted = timeToFirstDelta < 1000
                            ? `${timeToFirstDelta} мс`
                            : `${(timeToFirstDelta / 1000).toFixed(2)} сек`;
                    }
                    if (answer.finalAnswerAt && lastSentAt) {
                        const timeToFinalAnswer = answer.finalAnswerAt - lastSentAt;
                        const formatted = timeToFinalAnswer < 1000
                            ? `${timeToFinalAnswer} мс`
                            : `${(timeToFinalAnswer / 1000).toFixed(2)} сек`;
                    }

                    // Добавляем ответ от ассистента с поддержкой файлов
                    const assistantMessage: Message = {
                        id: `assistant-${Date.now()}`,
                        type: "assistant",
                        content: answer.message || JSON.stringify(answer, null, 2),
                        timestamp: new Date(answer.created_at || Date.now()),
                        status: "sent",
                        firstDeltaAt: answer.firstDeltaAt,
                        finalAnswerAt: answer.finalAnswerAt,
                        sentAt: lastSentAt || undefined,
                        // Сохраняем массив файлов если есть
                        ...(answer.files && answer.files.length > 0 && {
                            files: answer.files
                        }),
                        // Сохраняем завершённые вызовы функций если есть (добавлено 2026-02-15)
                        ...(answer.functionCalls && answer.functionCalls.length > 0 && {
                            functionCalls: answer.functionCalls
                        }),
                        // Сохраняем информацию о расходе токенов если есть (добавлено 2026-02-15)
                        ...(answer.tokenUsage && {
                            tokenUsage: answer.tokenUsage
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

                    // FUNCTION CALLS: Очищаем активные вызовы функций
                    setActiveFunctionCalls(new Map());
                    setMessages((prev) => [...prev, assistantMessage]);
                    setIsSending(false);
                },
                // onError
                (error) => {
                    console.error("❌ WebSocket error:", error);

                    // Деактивируем сессию при ошибке
                    setIsSessionActive(false);
                    setSessionInfo(null);
                    setIgnoreMode(false);
                    setMessages((prev) =>
                        prev.filter((msg) => !msg.id.startsWith("loading-"))
                    );
                    // TRUE STREAMING: Очищаем потоковый текст
                    setStreamingText('');
                    setStreamingMessageId(null);
                    // FUNCTION CALLS: Очищаем активные вызовы функций
                    setActiveFunctionCalls(new Map());

                    showErrorNotification(
                        t("error") || "Ошибка",
                        t("connectionError") || "Ошибка WebSocket соединения. Сессия завершена."
                    );
                    setIsSending(false);
                },
                // onClose - обработчик закрытия WebSocket соединения
                () => {
                    // Если закрытие было намеренным (через кнопку "Остановить"),
                    // не показываем уведомление об ошибке
                    if (intentionalCloseRef.current) {
                        intentionalCloseRef.current = false;
                        return;
                    }

                    // Разрыв соединения (ненамеренное закрытие)
                    console.warn('⚠️ WebSocket разорвано (не намеренно)');

                    // Деактивируем сессию
                    setIsSessionActive(false);
                    setSessionInfo(null);
                    setIgnoreMode(false);
                    setStreamingText('');
                    setStreamingMessageId(null);

                    // FUNCTION CALLS: Очищаем активные вызовы функций
                    setActiveFunctionCalls(new Map());

                    // Сбрасываем флаг отправки
                    setIsSending(false);

                    // Добавляем системное сообщение о разрыве соединения
                    const systemMessage: Message = {
                        id: `system-${Date.now()}`,
                        type: "system",
                        content: t("connectionClosed") || "WebSocket соединение разорвано. Сессия завершена.",
                        timestamp: new Date(),
                    };
                    setMessages((prev) => [...prev, systemMessage]);

                    showErrorNotification(
                        t("warning") || "Предупреждение",
                        t("sessionClosedDueToDisconnect") || "Сессия завершена из-за разрыва соединения"
                    );
                },
                // onDelta - TRUE STREAMING callback
                // Теперь получает ГОТОВЫЙ ТЕКСТ (не RAW JSON!)
                (newTextDelta: string) => {
                    // Убираем индикатор печати при первой дельте
                    setMessages((prev) =>
                        prev.filter((msg) => !msg.id.startsWith("loading-"))
                    );

                    // Создаём ID для потокового сообщения при первой дельте
                    setStreamingMessageId((prevId) => {
                        if (!prevId) {
                            return `streaming-${Date.now()}`;
                        }
                        return prevId;
                    });

                    // TRUE STREAMING: Просто накапливаем готовый текст
                    setStreamingText((prev) => prev + newTextDelta);
                },
                // onFunctionCall - FUNCTION CALLS callback (добавлено 2026-02-15)
                // Обработка событий вызовов функций OpenAI формата
                (event: FunctionCallEvent) => {
                    console.log('💡 [Function Call Event]:', event.type, event);

                    // Пропускаем обработку если показ Function Calls отключен
                    if (!showFunctionCalls) {
                        console.log('⏭️ [Function Call] Пропущено - showFunctionCalls=false');
                        return;
                    }

                    // Убираем индикатор печати при первом событии function call
                    setMessages((prev) =>
                        prev.filter((msg) => !msg.id.startsWith("loading-"))
                    );

                    if (event.type === 'response.output_item.added') {
                        // Начало вызова функции
                        console.log('🔧 [Function Call] Начало вызова:', event.item.name);
                        setActiveFunctionCalls((prev) => {
                            const newMap = new Map(prev);
                            newMap.set(event.item.id, {
                                id: event.item.id,
                                call_id: event.item.call_id,
                                name: event.item.name,
                                arguments: ''
                            });
                            return newMap;
                        });
                    } else if (event.type === 'response.function_call_arguments.delta') {
                        // Дельта аргументов функции
                        console.log('📝 [Function Call] Дельта аргументов:', event.delta);
                        setActiveFunctionCalls((prev) => {
                            const newMap = new Map(prev);
                            const existing = newMap.get(event.item_id);
                            if (existing) {
                                newMap.set(event.item_id, {
                                    ...existing,
                                    arguments: existing.arguments + event.delta
                                });
                            }
                            return newMap;
                        });
                    } else if (event.type === 'response.function_call_arguments.done') {
                        // Аргументы функции сформированы полностью
                        console.log('✅ [Function Call] Аргументы готовы:', event.arguments);

                        try {
                            const args = JSON.parse(event.arguments);
                            console.log('🔧 [Function Call] Распарсенные аргументы:', {
                                item_id: event.item_id,
                                arguments: args
                            });
                        } catch (e) {
                            console.warn('⚠️ [Function Call] Не удалось распарсить аргументы:', e);
                        }

                        setActiveFunctionCalls((prev) => {
                            const newMap = new Map(prev);
                            const existing = newMap.get(event.item_id);
                            if (existing) {
                                newMap.set(event.item_id, {
                                    ...existing,
                                    arguments: event.arguments
                                });
                            }
                            return newMap;
                        });
                    } else if (event.type === 'response.output_item.done') {
                        // Вызов функции завершён
                        console.log('🏁 [Function Call] Завершён:', event.item.name);
                        // Оставляем в активных до получения финального сообщения
                        // Очистка происходит в onMessage callback
                    }
                },
                // onTokenUsage - TOKEN USAGE callback (добавлено 2026-02-16)
                // Обработка информации о расходе токенов
                (tokenUsage) => {
                    console.log('💰 [Token Usage] Получена информация о токенах:', tokenUsage);
                    console.log('💰 [Token Usage] Input:', tokenUsage.input_tokens);
                    console.log('💰 [Token Usage] Output:', tokenUsage.output_tokens);
                    console.log('💰 [Token Usage] Total:', tokenUsage.total_tokens);

                    // Проверяем наличие кэшированных токенов
                    if (tokenUsage.input_tokens_details?.cached_tokens) {
                        const cached = tokenUsage.input_tokens_details.cached_tokens;
                        const savings = Math.round((cached / tokenUsage.total_tokens) * 100);
                        console.log(`💰 [Token Usage] 💎 Cached: ${cached} токенов (${savings}% экономия!)`);
                        console.log('💰 [Token Usage] input_tokens_details:', tokenUsage.input_tokens_details);
                    }

                    // Проверяем reasoning токены (для o1/o3 моделей)
                    if (tokenUsage.output_tokens_details?.reasoning_tokens) {
                        console.log('🧠 [Token Usage] Reasoning токены:', tokenUsage.output_tokens_details.reasoning_tokens);
                        console.log('💰 [Token Usage] output_tokens_details:', tokenUsage.output_tokens_details);
                    }
                }

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
            setIsLoading(true);

            // Закрываем WebSocket соединение
            if (wsRef.current) {
                intentionalCloseRef.current = true;  // Помечаем закрытие как намеренное
                wsRef.current.close();
                wsRef.current = null;
            }

            await testStopSession();

            setIsSessionActive(false);
            setSessionInfo(null);
            setIgnoreMode(false);

            // Останавливаем Realtime если был активен
            if (realtimeControllerRef.current) {
                realtimeControllerRef.current.stop();
                realtimeControllerRef.current = null;
            }
            setRealtimeAvailable(false);
            setRealtimeActive(false);
            setRealtimeState('idle');
            setRealtimeTranscript('');

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

        // В режиме ignore (ignoreMode=true) блокируем ввод — пользователь ждёт ответа
        // В режиме не-ignore (ignoreMode=false) не блокируем — можно сразу слать следующий вопрос
        if (ignoreMode) {
            setIsSending(true);
        }

        // TRUE STREAMING: Очищаем предыдущий потоковый текст только если блокируем ввод
        if (ignoreMode) {
            setStreamingText('');
            setStreamingMessageId(null);
        }

        try {
            // Добавляем индикатор печати (анимация) ДО отправки
            const loadingMessage: Message = {
                id: `loading-${Date.now()}`,
                type: "assistant",
                content: "typing", // Специальный маркер для анимации печати
                timestamp: new Date(),
                status: "sending",
            };
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

            // Замеряем время ПЕРЕД отправкой вопроса
            const sentAt = Date.now();
            lastQuestionSentAtRef.current = sentAt;

            // Отправляем сохранённый текст вопроса (может быть пустым) с файлами
            await testAsk(questionText || " ", voiceEnabled, filesToSend);

            // Обновляем статус сообщения пользователя с временем отправки
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === userMessage.id ? {...msg, status: "sent", sentAt} : msg
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

    // Включение / выключение Realtime режима пользователем
    const handleRealtimeToggle = async (checked: boolean) => {
        if (!sessionInfo?.realtime) return;

        if (checked) {
            // Создаём контроллер и стартуем
            const ctrl = new RealtimeController();
            ctrl.onStateChange = (s) => setRealtimeState(s);

            // transcript_delta — показываем стриминг в чате (как текстовый режим)
            ctrl.onTranscriptDelta = (text) => {
                setRealtimeTranscript(prev => prev + text);
                // Используем существующий streaming механизм чата
                setStreamingMessageId(prev => prev ?? `rt-streaming-${Date.now()}`);
                setStreamingText(prev => prev + text);
            };

            // response_done — фиксируем финальное сообщение ассистента в чате
            ctrl.onResponseDone = (result) => {
                // Убираем streaming bubble
                setStreamingText('');
                setStreamingMessageId(null);
                setRealtimeTranscript('');
                // Добавляем сообщение ассистента в историю чата с timing, токенами и файлами
                const assistantMsg: Message = {
                    id: `assistant-rt-${Date.now()}`,
                    type: 'assistant',
                    content: result.fullText,
                    timestamp: new Date(),
                    status: 'sent',
                    sentAt:        result.sentAt,
                    firstDeltaAt:  result.firstAudioAt,
                    finalAnswerAt: result.responseDoneAt,
                    // Файлы — массив (основной формат, отображается в renderMessage)
                    ...(result.files && result.files.length > 0 && { files: result.files }),
                    // Legacy одиночный файл (для совместимости с renderMessage)
                    ...(result.image_url && {
                        imageUrl: result.image_url,
                        fileType: 'image',
                        fileName: result.file_name,
                    }),
                    ...(result.file_url && !result.image_url && {
                        fileUrl:  result.file_url,
                        fileType: (result.file_type === 'image' ? 'image' : 'file') as 'image' | 'file',
                        fileName: result.file_name,
                    }),
                    ...(result.tokenUsage && {
                        tokenUsage: {
                            input_tokens:         result.tokenUsage.input_tokens,
                            output_tokens:        result.tokenUsage.output_tokens,
                            total_tokens:         result.tokenUsage.total_tokens,
                            input_tokens_details: result.tokenUsage.input_tokens_details
                                ? { cached_tokens: result.tokenUsage.input_tokens_details.cached_tokens ?? 0 }
                                : undefined,
                            output_tokens_details: result.tokenUsage.output_tokens_details
                                ? { reasoning_tokens: result.tokenUsage.output_tokens_details.reasoning_tokens ?? 0 }
                                : undefined,
                        }
                    }),
                };
                setMessages(prev => [...prev, assistantMsg]);
            };

            ctrl.onSpeechStarted = () => {
                // VAD: пользователь перебил ассистента
                // Сбрасываем незавершённый streaming bubble
                setStreamingText('');
                setStreamingMessageId(null);
                setRealtimeTranscript('');
            };

            ctrl.onTokenUsage = (usage) => {
                console.log('💰 [Realtime Token Usage]',
                    `Input: ${usage.input_tokens}`,
                    `Output: ${usage.output_tokens}`,
                    `Total: ${usage.total_tokens}`,
                    usage.output_tokens_details?.audio_tokens
                        ? `🎵 Audio out: ${usage.output_tokens_details.audio_tokens}`
                        : ''
                );
            };

            ctrl.onInputTranscript = (text) => {
                // Сообщение пользователя вставляем ПЕРЕД последним ответом ассистента.
                // Порядок событий от сервера: response_done → input_transcript_done
                // (ассистент начинает отвечать ещё во время речи пользователя),
                // поэтому если просто делать push — user msg окажется после assistant msg.
                const userMsg: Message = {
                    id: `user-rt-${Date.now()}`,
                    type: 'user',
                    content: text,
                    timestamp: new Date(),
                    status: 'sent',
                };
                setMessages(prev => {
                    // Ищем индекс последнего сообщения ассистента из realtime
                    const lastRtIdx = [...prev].reverse()
                        .findIndex(m => m.id.startsWith('assistant-rt-'));
                    if (lastRtIdx === -1) {
                        // Нет ответов ассистента — просто добавляем в конец
                        return [...prev, userMsg];
                    }
                    // Вставляем перед последним assistant-rt- сообщением
                    const insertAt = prev.length - 1 - lastRtIdx;
                    const next = [...prev];
                    next.splice(insertAt, 0, userMsg);
                    return next;
                });
            };
            ctrl.onError = (msg) => {
                showErrorNotification(t('error') || 'Ошибка', msg);
                setRealtimeActive(false);
                setStreamingText('');
                setStreamingMessageId(null);
                setRealtimeTranscript('');
            };
            realtimeControllerRef.current = ctrl;
            setRealtimeActive(true);
            setRealtimeTranscript('');
            await ctrl.start({
                userId: sessionInfo.user_id,
                respId: sessionInfo.resp_id,
                treadId: sessionInfo.tread_id,
                realtimeEnabled: true,
            });
        } else {
            // Останавливаем
            realtimeControllerRef.current?.stop();
            realtimeControllerRef.current = null;
            setRealtimeActive(false);
            setRealtimeState('idle');
            setRealtimeTranscript('');
        }
    };

    // Удаление контекста диалога
    const handleDeleteDialogContext = async () => {
        try {
            if (!sessionInfo?.tread_id) {
                showErrorNotification(
                    t("error") || "Ошибка",
                    t("dialogIdNotFound") || "ID диалога не найден"
                );
                return;
            }

            const result = await DeleteDialog(sessionInfo.tread_id);

            if (result && result.status === 'ok') {
                showNotification(
                    t("success") || "Успешно",
                    t("deleteDialogContextSuccess") || "Контекст диалога успешно удалён"
                );
                // Очищаем историю сообщений
                setMessages([]);

                // Останавливаем сессию после успешного удаления контекста
                await handleStopSession();
            } else {
                const err = result && result.error ? result.error : (t("deleteDialogContextError") || "Ошибка при удалении контекста диалога");
                showErrorNotification(
                    t("error") || "Ошибка",
                    err
                );
            }
        } catch (err: any) {
            console.error('Ошибка при удалении контекста диалога:', err);
            showErrorNotification(
                t("error") || "Ошибка",
                err?.message || (t("deleteDialogContextError") || "Ошибка при удалении контекста диалога")
            );
        }
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
                        <ClockCircleOutlined style={{ color: 'black' }}/>
                    ) : (
                        <RobotOutlined style={{ color: 'black' }}/>
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
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                            <Text type="secondary" className="message-time">
                                {message.timestamp.toLocaleTimeString()}
                            </Text>
                            {/* Отображение времени ответа для сообщений ассистента */}
                            {!isUser && !isSystem && (message.sentAt || message.tokenUsage) && (
                                <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                                    {/* Если время первой дельты и финала совпадают, показываем только финал */}
                                    {message.sentAt && message.firstDeltaAt && message.finalAnswerAt && message.firstDeltaAt !== message.finalAnswerAt && (() => {
                                        const timeMs = message.firstDeltaAt - message.sentAt;
                                        const formatted = timeMs < 1000
                                            ? `${timeMs}мс`
                                            : `${(timeMs / 1000).toFixed(2)}с`;
                                        return (
                                            <Tooltip title="Время первой дельты">
                                                <span style={{
                                                    color: 'var(--link-hover-color, #52c41a)',
                                                    cursor: 'help',
                                                    fontWeight: 500
                                                }}>
                                                    ⚡ {formatted}
                                                </span>
                                            </Tooltip>
                                        );
                                    })()}
                                    {message.sentAt && message.finalAnswerAt && (() => {
                                        const timeMs = message.finalAnswerAt - message.sentAt;
                                        const formatted = timeMs < 1000
                                            ? `${timeMs}мс`
                                            : `${(timeMs / 1000).toFixed(2)}с`;
                                        // Если времена совпадают, показываем "полный ответ сразу"
                                        const tooltipText = message.firstDeltaAt === message.finalAnswerAt
                                            ? "Полный ответ получен сразу (без стриминга)"
                                            : "Общее время ответа модели";
                                        return (
                                            <Tooltip title={tooltipText}>
                                                <span style={{
                                                    color: 'var(--blue-color, #1890ff)',
                                                    cursor: 'help',
                                                    fontWeight: 500
                                                }}>
                                                    ⏱️ {formatted}
                                                </span>
                                            </Tooltip>
                                        );
                                    })()}
                                    {/* Расход токенов */}
                                    {message.tokenUsage && (
                                        <Tooltip title={(() => {
                                            const cachedTokens = message.tokenUsage.input_tokens_details?.cached_tokens || 0;
                                            const hasCaching = cachedTokens > 0;
                                            const savingsPercentage = hasCaching
                                                ? Math.round((cachedTokens / message.tokenUsage.total_tokens) * 100)
                                                : 0;

                                            let tooltipText = `Input: ${message.tokenUsage.input_tokens} | Output: ${message.tokenUsage.output_tokens} | Total: ${message.tokenUsage.total_tokens}`;

                                            if (hasCaching) {
                                                tooltipText += ` | 💎 Cached: ${cachedTokens} (${savingsPercentage}% экономия!)`;
                                            }

                                            // Добавляем reasoning токены если есть
                                            if (message.tokenUsage.output_tokens_details?.reasoning_tokens) {
                                                tooltipText += ` | 🧠 Reasoning: ${message.tokenUsage.output_tokens_details.reasoning_tokens}`;
                                            }

                                            return tooltipText;
                                        })()}>
                                            <span style={{
                                                color: 'var(--warning-color, #fa8c16)',
                                                cursor: 'help',
                                                fontWeight: 500,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}>
                                                💰 {(() => {
                                                    const totalTokens = message.tokenUsage.total_tokens;

                                                    // Принудительно возвращаем как строку для отладки
                                                    const result = `[${totalTokens}]`;
                                                    return result;
                                                })()}
                                                {message.tokenUsage.input_tokens_details?.cached_tokens && message.tokenUsage.input_tokens_details.cached_tokens > 0 && (
                                                    <span style={{
                                                        color: 'var(--success-color, #52c41a)',
                                                        fontSize: '12px',
                                                        fontWeight: 600
                                                    }}>
                                                        💎{message.tokenUsage.input_tokens_details.cached_tokens}
                                                    </span>
                                                )}
                                            </span>
                                        </Tooltip>
                                    )}
                                </div>
                            )}
                        </div>
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

                    {/* FUNCTION CALLS: Отображение завершённых вызовов функций (добавлено 2026-02-15) */}
                    {/* Вынесено за пределы message-text для отображения под всем содержимым */}
                    {showFunctionCalls && !isUser && !isSystem && message.functionCalls && message.functionCalls.length > 0 && (
                        <div style={{
                            marginTop: 12,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8
                        }}>
                            <Text strong style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                {t("functionCallsExecuted") || "Выполненные вызовы функций"}:
                            </Text>
                            {message.functionCalls.map((funcCall, index) => (
                                <div
                                    key={funcCall.id || index}
                                    style={{
                                        padding: '10px',
                                        backgroundColor: 'var(--midle-color, #f0f5ff)',
                                        borderRadius: '8px',
                                        border: '1px solid var(--blue-color, #91d5ff)',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                        <ExperimentOutlined style={{ color: '#1890ff', fontSize: '14px' }} />
                                        <Text strong style={{ color: '#1890ff', fontSize: '13px' }}>
                                            {funcCall.name}
                                        </Text>
                                    </div>
                                    {funcCall.arguments && (
                                        <div style={{
                                            backgroundColor: 'var(--bg-color, #fff)',
                                            padding: '8px',
                                            borderRadius: '4px',
                                            fontSize: '12px',
                                            fontFamily: 'monospace',
                                            maxHeight: '200px',
                                            overflowY: 'auto',
                                            wordBreak: 'break-all',
                                            whiteSpace: 'pre-wrap'
                                        }}>
                                            {(() => {
                                                try {
                                                    // Пытаемся распарсить и форматировать JSON
                                                    const parsed = JSON.parse(funcCall.arguments);
                                                    return JSON.stringify(parsed, null, 2);
                                                } catch {
                                                    // Если не JSON, возвращаем как есть
                                                    return funcCall.arguments;
                                                }
                                            })()}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
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
                                    {/* @ts-ignore - React 19 type compatibility issue with react-icons */}
                                    <MdDoneAll />
                                </span>
                            </Tooltip>
                        )}
                        {message.status === "error" && (
                            <Tooltip title={t("error") || "Ошибка отправки"}>
                                <span style={{ display: 'flex', alignItems: 'center', color: 'var(--error-color, #ff0202)', fontSize: '14px', cursor: 'pointer' }}>
                                    {/* @ts-ignore - React 19 type compatibility issue with react-icons */}
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
                                <Popconfirm
                                    title={t("deleteDialogContext") || "Удалить контекст диалога"}
                                    description={t("deleteDialogContextConfirm") || "Вы уверены, что хотите удалить контекст диалога?"}
                                    onConfirm={handleDeleteDialogContext}
                                    okText={t("delete") || "Удалить"}
                                    cancelText={t("cancel") || "Отмена"}
                                    okButtonProps={{ danger: true }}
                                >
                                    <Tooltip title={t("deleteDialogContext") || "Удалить контекст диалога"}>
                                        <Button
                                            icon={<DeleteOutlined/>}
                                            danger
                                        />
                                    </Tooltip>
                                </Popconfirm>
                                <Tooltip title={t("showFunctionCalls") || "Показывать вызовы функций"}>
                                    <Switch
                                        checked={showFunctionCalls}
                                        onChange={setShowFunctionCalls}
                                        size="small"
                                        checkedChildren={<span style={{color: "black"}}><ExperimentOutlined /></span>}
                                        unCheckedChildren={<span style={{color: "black"}}><ExperimentOutlined /></span>}
                                    />
                                </Tooltip>
                                <Tooltip title={t("autoScroll") || "Автопрокрутка"}>
                                    <div style={{ transform: 'rotate(270deg)' }}>
                                        <Switch
                                            checked={autoScroll}
                                            onChange={setAutoScroll}
                                            size="small"
                                        />
                                    </div>
                                </Tooltip>
                                {/* Realtime переключатель — показывается только если модель поддерживает */}
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
                                        <span
                                            style={{
                                                backgroundColor: getProviderColor(sessionInfo.provider),
                                                color: '#fff',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                padding: '0 12px',
                                                height: '24px',
                                                lineHeight: '24px',
                                                borderRadius: '12px',
                                                boxShadow: `0 2px 8px ${getProviderColor(sessionInfo.provider)}33`,
                                                display: 'inline-block'
                                            }}
                                        >
                                            {sessionInfo.provider?.toUpperCase()}
                                        </span>
                                    </div>
                                    {(sessionInfo.s3_files || sessionInfo.image_generation || sessionInfo.code_interpreter || sessionInfo.web_search || sessionInfo.video_generation || sessionInfo.calendar || sessionInfo.sheets) && (
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
                                            {sessionInfo.greeting && (
                                                <Badge
                                                    count={t("greeting") || "Приветствие"}
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
                                            {sessionInfo.calendar && (
                                                <Badge
                                                    count={t("googleCalendar") || "Google Календарь"}
                                                    style={{
                                                        backgroundColor: '#4285f4',
                                                        fontSize: '12px',
                                                        fontWeight: 600,
                                                        padding: '0 12px',
                                                        height: '24px',
                                                        lineHeight: '24px',
                                                        borderRadius: '12px',
                                                        boxShadow: '0 2px 8px rgba(66, 133, 244, 0.3)'
                                                    }}
                                                />
                                            )}
                                            {sessionInfo.sheets && (
                                                <Badge
                                                    count={t("googleSheets") || "Google Таблицы"}
                                                    style={{
                                                        backgroundColor: '#0f9d58',
                                                        fontSize: '12px',
                                                        fontWeight: 600,
                                                        padding: '0 12px',
                                                        height: '24px',
                                                        lineHeight: '24px',
                                                        borderRadius: '12px',
                                                        boxShadow: '0 2px 8px rgba(15, 157, 88, 0.3)'
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

                    {/* ── REALTIME: статус-полоска и транскрипт ── */}
                    {realtimeActive && (
                        <div className={`realtime-status-bar realtime-state-${realtimeState}`}>
                            <span className="realtime-status-icon">
                                {realtimeState === 'listening' && <AudioOutlined />}
                                {realtimeState === 'speaking'  && <SoundOutlined />}
                                {realtimeState === 'connecting' || realtimeState === 'ready'
                                    ? <LoadingOutlined />
                                    : null}
                                {realtimeState === 'error' && <AudioMutedOutlined />}
                            </span>
                            <span className="realtime-status-label">
                                {realtimeState === 'connecting' && (t('realtimeConnecting') || 'Подключение...')}
                                {realtimeState === 'ready'      && (t('realtimeReady')      || 'Готово')}
                                {realtimeState === 'listening'  && (t('realtimeListening')  || 'Слушаю...')}
                                {realtimeState === 'speaking'   && (t('realtimeSpeaking')   || 'Ассистент говорит...')}
                                {realtimeState === 'error'      && (t('realtimeError')       || 'Ошибка Realtime')}
                                {realtimeState === 'idle'       && (t('realtimeIdle')        || 'Ожидание')}
                            </span>
                            {/* Накопленный транскрипт ответа ассистента */}
                            {realtimeTranscript && (
                                <span className="realtime-transcript">{realtimeTranscript}</span>
                            )}
                        </div>
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

                                {/* FUNCTION CALLS: Активные вызовы функций (добавлено 2026-02-15) */}
                                {showFunctionCalls && activeFunctionCalls.size > 0 && (
                                    <div
                                        className="message-item"
                                        style={{ position: 'relative' }}
                                    >
                                        <div className="message-avatar">
                                            <RobotOutlined style={{ color: '#fa8c16' }}/>
                                        </div>
                                        <div className="message-content">
                                            <div className="message-header">
                                                <Text strong style={{ color: '#fa8c16' }}>
                                                    {t("functionCalling") || "Вызов функций"}
                                                </Text>
                                                <Text type="secondary" className="message-time">
                                                    {new Date().toLocaleTimeString()}
                                                </Text>
                                            </div>
                                            <div className="message-text">
                                                <Space direction="vertical" style={{width: '100%'}} size="small">
                                                    {Array.from(activeFunctionCalls.values()).map((funcCall) => (
                                                        <div
                                                            key={funcCall.id}
                                                            style={{
                                                                padding: '12px',
                                                                backgroundColor: 'var(--midle-color, #fff7e6)',
                                                                borderRadius: '8px',
                                                                border: '1px solid var(--warning-color, #ffd591)',
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                                <LoadingOutlined style={{ color: '#fa8c16', fontSize: '16px' }} />
                                                                <Text strong style={{ color: '#fa8c16', fontSize: '14px' }}>
                                                                    {funcCall.name}
                                                                </Text>
                                                            </div>
                                                            {funcCall.arguments && (
                                                                <div style={{
                                                                    backgroundColor: 'var(--bg-color, #fff)',
                                                                    padding: '8px',
                                                                    borderRadius: '4px',
                                                                    fontSize: '12px',
                                                                    fontFamily: 'monospace',
                                                                    maxHeight: '120px',
                                                                    overflowY: 'auto',
                                                                    wordBreak: 'break-all'
                                                                }}>
                                                                    <Text type="secondary" style={{ fontSize: '11px' }}>
                                                                        {t("arguments") || "Аргументы"}:
                                                                    </Text>
                                                                    <br />
                                                                    {funcCall.arguments}
                                                                    <span className="streaming-cursor" style={{ marginLeft: '2px' }}>▋</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </Space>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* TRUE STREAMING: Потоковое сообщение */}
                                {streamingText && streamingMessageId && (
                                    <div
                                        key={streamingMessageId}
                                        className="message-item"
                                        style={{ position: 'relative' }}
                                    >
                                        <div className="message-avatar">
                                            <RobotOutlined/>
                                        </div>
                                        <div className="message-content">
                                            <div className="message-header">
                                                <Text strong>
                                                    {t("assistant") || "Агент"}
                                                </Text>
                                                <Text type="secondary" className="message-time">
                                                    {new Date().toLocaleTimeString()}
                                                </Text>
                                            </div>
                                            <div className="message-text">
                                                <div className="message-content-text message-streaming">
                                                    <MarkdownRenderer text={streamingText} />
                                                    <span className="streaming-cursor">▋</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

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
                        <Space style={{width: "100%", flexWrap: "wrap", gap: "8px"}}>
                            {/* Voice switch */}
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
                                    disabled={!isSessionActive || (isSending && ignoreMode)}
                                />
                            </Tooltip>
                            <Text type="secondary">
                                {voiceEnabled
                                    ? t("withVoice") || "С голосом"
                                    : t("textOnly") || "Только текст"}
                            </Text>

                            {/* Realtime switch — только если модель поддерживает */}
                            {realtimeAvailable && (
                                <>
                                    <div style={{ width: 1, height: 20, background: 'var(--shadow-color, #e8e8e8)', margin: '0 4px' }} />
                                    <Tooltip title={
                                        realtimeActive
                                            ? (t("realtimeDisable") || "Выключить голосовой Realtime режим")
                                            : (t("realtimeEnable") || "Включить голосовой Realtime режим")
                                    }>
                                        <Switch
                                            checked={realtimeActive}
                                            onChange={handleRealtimeToggle}
                                            disabled={!isSessionActive}
                                            className={realtimeActive ? 'realtime-switch-active' : ''}
                                            checkedChildren={<AudioOutlined style={{ color: 'black' }} />}
                                            unCheckedChildren={<AudioMutedOutlined style={{ color: 'black' }} />}
                                        />
                                    </Tooltip>
                                    <Text type="secondary" style={realtimeActive ? { color: '#52c41a', fontWeight: 500 } : {}}>
                                        {realtimeActive
                                            ? (t("realtimeModeActive") || "Realtime активен")
                                            : (t("realtimeMode") || "Realtime режим")}
                                    </Text>
                                </>
                            )}
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
                                    disabled={!isSessionActive || (isSending && ignoreMode)}
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
                                                cursor: !isSessionActive || (isSending && ignoreMode) ? 'not-allowed' : 'pointer',
                                                backgroundColor: 'transparent'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!(!isSessionActive || (isSending && ignoreMode))) {
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
                                                disabled={!isSessionActive || (isSending && ignoreMode)}
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
                                loading={isSending && ignoreMode}
                                disabled={
                                    !isSessionActive ||
                                    (isSending && ignoreMode) ||
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



