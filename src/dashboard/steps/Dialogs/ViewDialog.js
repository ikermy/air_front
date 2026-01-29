import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import './ViewDialog.css';
import { useAutoScroll } from "../../../utils/useAutoScroll";
import { Calendar, Button, Modal, DatePicker, message } from 'antd';
import {CheckCircleFilled, CloseCircleFilled, DownloadOutlined, ExclamationCircleOutlined, DeleteOutlined} from '@ant-design/icons';
import { MdKeyboardVoice, MdOutlineSupportAgent } from "react-icons/md";
import MarkdownRenderer from "../../../utils/MarkdownRenderer.tsx";
import {ReadDialog, DeleteDialog} from "../../../dialog/dialogUtils";
import { showNotification, showErrorNotification } from '../../hotification/showNotification';


const { RangePicker } = DatePicker;

export function ViewDialog({ token, dialogId, target, trigger, onClose, onDialogDeleted }) {
    const { t } = useTranslation();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);
    const messageRefs = useRef({});

    // Состояние для экспорта
    const [exportModalVisible, setExportModalVisible] = useState(false);
    const [dateRange, setDateRange] = useState([]);

    // State для модального окна подтверждения удаления
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const handleDialogData = useCallback((dialogData) => {
        setLoading(false);
        if (!dialogData || dialogData.Data === null || (Array.isArray(dialogData.Data) && dialogData.Data.length === 0)) {
            message.error(t("viewDialogLoadError") || 'Не удалось загрузить данные диалога');
            return;
        }

        try {
            const { Model: modelName, Responder: responderName } = dialogData;

            // Проверяем, является ли Data уже массивом объектов или строкой JSON
            let parsedMessages;
            if (Array.isArray(dialogData.Data)) {
                // Data уже является массивом объектов
                parsedMessages = dialogData.Data;
            } else if (typeof dialogData.Data === 'string') {
                // Data является строкой JSON, нужно парсить
                parsedMessages = JSON.parse(dialogData.Data).map(msg =>
                    typeof msg === 'string' ? JSON.parse(msg) : msg
                );
            } else {
                // Безопасная обработка неожиданного формата данных
                message.error(t("viewDialogUnexpectedFormat") || 'Неожиданный формат данных диалога');
                console.error('Unexpected dialogData format:', dialogData);
                return;
            }

            const formattedMessages = parsedMessages.map(msg => {
                // Извлекаем текст сообщения
                // Поддерживаем несколько формтов: msg.message (строка), msg.message.message (объект), или прямо текст в message
                let messageText = typeof msg.message === 'string'
                    ? msg.message
                    : (msg.message?.message || msg.message || '');

                // Обеспечиваем что messageText это строка
                if (typeof messageText !== 'string') {
                    messageText = String(messageText);
                }

                // Получаем файлы из новой структуры (send_files прямо в msg)
                // Также поддерживаем старую структуру (msg.message?.action?.send_files)
                const sendFiles = msg.send_files || msg.message?.action?.send_files || [];

                // Обрабатываем файлы по типам
                const imageFiles = sendFiles.filter(file => file.type === 'photo' || file.type === 'image');
                const videoFiles = sendFiles.filter(file => file.type === 'video');
                const docFiles = sendFiles.filter(file => file.type === 'doc' || file.type === 'document');

                return {
                    text: <MarkdownRenderer text={messageText.replace(/\n/g, '<br />')} />,
                    originalText: messageText, // Сохраняем оригинальный текст для экспорта
                    name: msg.creator === 2 ? modelName : responderName,
                    creator: msg.creator,
                    side: msg.creator === 1 || msg.creator === 4 ? 'left' : (msg.creator === 2 || msg.creator === 3 ? 'right' : 'left'),
                    timestamp: new Date(msg.timestamp),
                    files: {
                        images: imageFiles,
                        videos: videoFiles,
                        documents: docFiles
                    }
                };
            });

            setMessages(formattedMessages);
        } catch (error) {
            message.error(t("dialogDataError") || 'Ошибка обработки данных диалога');
            console.error(error);
        }
    }, [t]);

    // Получаем уникальные даты из сообщений
    const uniqueDates = useMemo(() => {
        const dates = new Set();
        messages.forEach(msg => {
            const dateString = msg.timestamp.toISOString().split('T')[0];
            dates.add(dateString);
        });
        return Array.from(dates).map(dateStr => new Date(dateStr));
    }, [messages]);

    // Функция для проверки, содержит ли дата сообщения
    const hasMessagesOnDate = useCallback((date) => {
        const dateStr = date.format('YYYY-MM-DD');
        return uniqueDates.some(d => d.toISOString().split('T')[0] === dateStr);
    }, [uniqueDates]);

    // Функция для обработки выбора даты в календаре
    const handleDateSelect = useCallback((date) => {
        const dateStr = date.format('YYYY-MM-DD');

        // Поиск первого сообщения на выбранную дату
        const firstMsgIndex = messages.findIndex(msg => {
            const msgDateStr = msg.timestamp.toISOString().split('T')[0];
            return msgDateStr === dateStr;
        });

        // Скролл к сообщению только внутри контейнера
        if (firstMsgIndex !== -1 && messageRefs.current[`msg-${firstMsgIndex}`]) {
            const messageElement = messageRefs.current[`msg-${firstMsgIndex}`];
            const scrollableParent = messageElement.closest('.view-dialogs-chat-messages');

            if (scrollableParent) {
                // Прокручиваем только внутри контейнера сообщений
                const elementOffset = messageElement.offsetTop;
                scrollableParent.scrollTo({
                    top: elementOffset,
                    behavior: 'smooth'
                });
            } else {
                // Fallback с ограничением прокрутки страницы
                messageElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'nearest'
                });
            }
        }
    }, [messages]);

    useAutoScroll(messagesEndRef, [messages]);

    // Функция для отрисовки содержимого ячеек календаря
    const dateCellRender = useCallback((date) => {
        if (hasMessagesOnDate(date)) {
            return <div className="calendar-has-messages"></div>;
        }
        return null;
    }, [hasMessagesOnDate]);

    // Функция для отрисовки ячеек календаря в RangePicker
    const cellRender = useCallback((current, { type }) => {
        if (type !== 'date') return null;

        if (hasMessagesOnDate(current)) {
            return (
                <div className="calendar-date-cell">
                    <div>{current.date()}</div>
                    <div className="calendar-has-messages range-picker-dot"></div>
                </div>
            );
        }
        return null;
    }, [hasMessagesOnDate]);

    // Функция для экспорта сообщений в HTML
    const exportToHTML = () => {
        if (!dateRange || dateRange.length !== 2) {
            message.error('Пожалуйста, выберите диапазон дат для экспорта');
            return;
        }

        const startDate = dateRange[0].startOf('day').toDate();
        const endDate = dateRange[1].endOf('day').toDate();

        // Фильтруем сообщения по диапазону дат
        const filteredMessages = messages.filter(msg =>
            msg.timestamp >= startDate && msg.timestamp <= endDate
        );

        if (filteredMessages.length === 0) {
            message.info('Нет сообщений в выбранном диапазоне дат');
            return;
        }

        // Генерируем HTML
        let html = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Экспорт чата</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .chat-container { max-width: 800px; margin: 0 auto; }
        .chat-header { text-align: center; margin-bottom: 20px; }
        .message { padding: 10px; margin: 5px 0; border-radius: 5px; }
        .left { background-color: #f0f0f0; margin-right: 20%; }
        .right { background-color: #dcf8c6; margin-left: 20%; }
        .message-header { display: flex; justify-content: space-between; margin-bottom: 5px; }
        .message-name { font-weight: bold; }
        .message-time { color: #888; font-size: 0.8em; }
        .date-separator {
            text-align: center;
            margin: 15px 0;
            position: relative;
        }
        .date-separator:before {
            content: '';
            height: 1px;
            background-color: #ddd;
            position: absolute;
            top: 50%;
            left: 0;
            right: 0;
            z-index: -1;
        }
        .date-text {
            background-color: white;
            padding: 0 10px;
            display: inline-block;
            color: #888;
        }
        .chat-image {
            max-width: 100%;
            margin-top: 10px;
            border-radius: 5px;
        }
        .file-info {
            color: #666;
            font-style: italic;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <div class="chat-container">
        <div class="chat-header">
            <h2>Экспорт чата</h2>
            <p>Период: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}</p>
        </div>`;

        let currentDate = null;

        // Добавляем сообщения с разделителями дат
        filteredMessages.forEach(msg => {
            const messageDate = msg.timestamp;
            const messageDay = messageDate.toLocaleDateString();

            if (messageDay !== currentDate) {
                currentDate = messageDay;
                html += `
        <div class="date-separator">
            <span class="date-text">${messageDay}</span>
        </div>`;
            }

            // Экранируем HTML в тексте сообщения
            const escapeHtml = (text) => {
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML.replace(/\n/g, '<br>');
            };

            // Используем originalText вместо text (React компонента)
            const messageText = msg.originalText ? escapeHtml(msg.originalText) : '';

            // Формируем информацию о файлах
            let filesInfo = '';
            if (msg.files) {
                if (msg.files.images && msg.files.images.length > 0) {
                    filesInfo += msg.files.images.map(img => {
                        const fileName = img.file_name || 'image';
                        const url = img.url ? `href="${img.url}" target="_blank"` : '';
                        const caption = img.caption ? `<div class="file-caption">${escapeHtml(img.caption)}</div>` : '';
                        const link = url ? `<a ${url}>${fileName}</a>` : fileName;
                        return `<div class="file-info">📷 Изображение: ${link}${caption}</div>`;
                    }).join('');
                }
                if (msg.files.videos && msg.files.videos.length > 0) {
                    filesInfo += msg.files.videos.map(video => {
                        const fileName = video.file_name || 'video';
                        const url = video.url ? `href="${video.url}" target="_blank"` : '';
                        const caption = video.caption ? `<div class="file-caption">${escapeHtml(video.caption)}</div>` : '';
                        const link = url ? `<a ${url}>${fileName}</a>` : fileName;
                        return `<div class="file-info">🎥 Видео: ${link}${caption}</div>`;
                    }).join('');
                }
                if (msg.files.documents && msg.files.documents.length > 0) {
                    filesInfo += msg.files.documents.map(doc => {
                        const fileName = doc.file_name || 'document';
                        const url = doc.url ? `href="${doc.url}" target="_blank"` : '';
                        const caption = doc.caption ? `<div class="file-caption">${escapeHtml(doc.caption)}</div>` : '';
                        const link = url ? `<a ${url}>${fileName}</a>` : fileName;
                        return `<div class="file-info">📄 Документ: ${link}${caption}</div>`;
                    }).join('');
                }
            }

            html += `
        <div class="message ${msg.side}">
            <div class="message-header">
                <span class="message-name">${escapeHtml(msg.name)}</span>
                <span class="message-time">${messageDate.toLocaleTimeString()}</span>
            </div>
            <div class="message-content">
                ${messageText}
                ${filesInfo}
            </div>
        </div>`;
        });

        html += `
    </div>
</body>
</html>`;

        // Создаем Blob и ссылку для скачивания
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `chat-export-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setExportModalVisible(false);
        message.success(t("exportSuccess") || 'Экспорт успешно выполнен');
    };

    // Функция для рендера блока сообщений
    const renderMessages = () => {
        if (loading) {
            return <div className="loading-messages">{t("loadingMessages") || "Загрузка сообщений..."}</div>;
        }

        if (messages.length === 0) {
            return <div className="no-messages">{t("noMessages") || "Нет сообщений в диалоге"}</div>;
        }

        let currentDate = null;

        return (
            <div className="view-dialogs-chat-messages">
                {messages.map((msg, index) => {
                    const messageDate = new Date(msg.timestamp);
                    const messageDay = messageDate.toLocaleDateString();

                    let dateHeader = null;
                    if (messageDay !== currentDate) {
                        currentDate = messageDay;
                        dateHeader = (
                            <div key={`date-${index}`} className="date-separator">
                                <div className="date-line"></div>
                                <div className="date-text">{messageDay}</div>
                                <div className="date-line"></div>
                            </div>
                        );
                    }

                    // Проверяем, есть ли файлы в сообщении
                    // const hasFiles = msg.files && (
                    //     (msg.files.images && msg.files.images.length > 0) ||
                    //     (msg.files.videos && msg.files.videos.length > 0) ||
                    //     (msg.files.documents && msg.files.documents.length > 0)
                    // );

                    return (
                        <React.Fragment key={index}>
                            {dateHeader}
                            <div
                                className={`chat-message ${msg.side}`}
                                ref={el => messageRefs.current[`msg-${index}`] = el}
                            >
                                <div className="message-name"> {msg.name} </div>

                                {/* Контейнер для файлов */}
                                <div className="message-files">
                                    {/* Отображение изображений */}
                                    {msg.files?.images?.map((img, imgIndex) => (
                                        <div key={`img-${imgIndex}`} className="message-image-container">
                                            <img
                                                src={img.url}
                                                alt={img.caption || img.file_name}
                                                className="chat-image"
                                                onClick={(e) => e.currentTarget.classList.toggle('zoomed')}
                                            />
                                            {img.caption && <div className="file-caption">{img.caption}</div>}
                                        </div>
                                    ))}

                                    {/* Отображение видео */}
                                    {msg.files?.videos?.map((video, videoIndex) => (
                                        <div key={`video-${videoIndex}`} className="message-video-container">
                                            <video
                                                src={video.url}
                                                controls
                                                className="chat-video"
                                            />
                                            {video.caption && <div className="file-caption">{video.caption}</div>}
                                        </div>
                                    ))}

                                    {/* Отображение документов */}
                                    {msg.files?.documents?.map((doc, docIndex) => (
                                        <div key={`doc-${docIndex}`} className="message-document-container">
                                            <a
                                                href={doc.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="document-link"
                                            >
                                                📄 {doc.file_name}
                                            </a>
                                            {doc.caption && <div className="file-caption">{doc.caption}</div>}
                                        </div>
                                    ))}
                                </div>

                                {/* Текст сообщения отдельно */}
                                {msg.text && (
                                    <div className="message-text">
                                        {msg.side === 'left' && msg.creator === 4 && (
                                            <MdOutlineSupportAgent style={{ marginRight: 3}} />
                                        )}
                                        {msg.side === 'right' && msg.creator === 3 && (
                                            <MdKeyboardVoice style={{ marginRight: 3}} />
                                        )}
                                        {msg.text}
                                    </div>
                                )}

                                <div className={`message-timestamp ${msg.side}`}>{messageDate.toLocaleTimeString()}</div>
                            </div>
                        </React.Fragment>
                    );
                })}
                <div ref={messagesEndRef}/>
            </div>
        );
    };

    return (
        <div className="chat-container">
            <div className="chat-calendar">
                <Calendar
                    fullscreen={false}
                    onSelect={handleDateSelect}
                    cellRender={dateCellRender}
                />

                {/* Кнопка экспорта */}
                <div className="export-button-container">
                    <Button
                        type="primary"
                        icon={<DownloadOutlined/>}
                        onClick={() => setExportModalVisible(true)}
                        style={{
                            marginTop: '10px',
                            width: '100%',
                            color: 'black',
                        }}
                        disabled={messages.length === 0}
                    >
                        {t("viewDialogExport") || "Экспортировать"}
                    </Button>
                    <div className="dialog-status-container">
                        <div className={`dialog-status ${target === 1 ? 'status-active' : 'status-inactive'}`}>
                            {target === 1 ?
                                <CheckCircleFilled style={{color: '#52c41a'}}/> :
                                <CloseCircleFilled style={{color: '#f5222d'}}/>
                            }
                            <span>{target === 1 ? (t("viewDialogTargetAchieved") || "Цель достигнута") : (t("viewDialogTargetNotAchieved") || "Цель не достигнута")}</span>
                        </div>
                        <div className={`dialog-status ${trigger === 1 ? 'status-active' : 'status-inactive'}`}>
                            {trigger === 1 ?
                                <CheckCircleFilled style={{color: '#52c41a'}}/> :
                                <CloseCircleFilled style={{color: '#f5222d'}}/>
                            }
                            <span>{trigger === 1 ? (t("viewDialogTriggerActivated") || "Триггер сработал") : (t("viewDialogTriggerNotActivated") || "Триггер не сработал")}</span>
                        </div>
                    </div>
                </div>
                {/* Иконка удаления внизу слева календаря */}
                <div
                    className="delete-dialog-icon"
                    title={t("deleteDialog") || "Удалить диалог"}
                    onClick={() => setIsDeleteModalOpen(true)}
                >
                    <DeleteOutlined />
                </div>
            </div>
            <div className="view-dialogs-chat-window">
                {renderMessages()}
                <ReadDialog
                    mode={"work"}
                    inToken={token}
                    onDialogData={handleDialogData}
                    dialogId={dialogId}
                />
            </div>

            {/* Модальное окно для экспорта */}
            <Modal
                title={t("viewDialogExportTitle") || "Экспорт истории чата"}
                open={exportModalVisible}
                onCancel={() => setExportModalVisible(false)}
                footer={[
                    <Button key="cancel" onClick={() => setExportModalVisible(false)}>
                        {t("cancel") || "Отмена"}
                    </Button>,
                    <Button
                        style={{color: 'black'}}
                        key="export"
                        type="primary"
                        onClick={exportToHTML}
                    >
                        {t("viewDialogExport") || "Экспортировать"}
                    </Button>
                ]}
            >
                <p>{t("viewDialogExportPeriod") || "Выберите диапазон дат для экспорта сообщений:"}</p>
                <RangePicker
                    style={{ width: '100%' }}
                    onChange={setDateRange}
                    format="DD.MM.YYYY"
                    cellRender={cellRender}
                />
            </Modal>

            {/* Модальное окно подтверждения удаления диалога */}
            <Modal
                title={
                    <span style={{ color: '#ff4d4f' }}>
                        <ExclamationCircleOutlined /> {t("dialogsConfirmDeleteTitle") || "Подтверждение удаления"}
                    </span>
                }
                open={isDeleteModalOpen}
                onCancel={() => {
                    setIsDeleteModalOpen(false);
                }}
                onOk={async () => {
                    // Вызов удаления
                    try {
                        const result = await DeleteDialog(token, dialogId);
                        if (result && result.status === 'ok') {
                            showNotification(`${t("dialog") || "Диалог"} ${dialogId}`, t("viewDialogDeleteSuccess") || 'успешно удалён!');
                            // Очищаем сообщения в компоненте
                            setMessages([]);
                            // Уведомляем родительский компонент об удалении
                            if (typeof onDialogDeleted === 'function') {
                                onDialogDeleted(dialogId);
                            }
                        } else {
                            const err = result && result.error ? result.error : (t("viewDialogDeleteError") || 'Не удалось удалить диалог');
                            showErrorNotification(`${t("dialogsDeleteError") || "Ошибка удаления диалога"} ${dialogId}`, err);
                        }
                    } catch (err) {
                        console.error('Ошибка при удалении диалога:', err);
                        showErrorNotification(`${t("dialogsDeleteError") || "Ошибка удаления диалога"} ${dialogId}`, err?.message || (t("viewDialogDeleteError") || 'Ошибка при удалении диалога'));
                    } finally {
                        setIsDeleteModalOpen(false);
                        // Закрываем родительский ViewDialog (modal) при успешном удалении
                        // onClose вызывается автоматически через onDialogDeleted в родителе
                    }
                }}
                okText={t("delete") || "Удалить"}
                cancelText={t("cancel") || "Отмена"}
                okButtonProps={{ danger: true }}
            >
                <p>
                    {t("viewDialogDeleteConfirm") || "Вы уверены, что хотите удалить диалог"} <strong>{dialogId}</strong>?
                </p>
                <p style={{ color: '#8c8c8c' }}>
                    {t("viewDialogDeleteNote") || "Это действие нельзя будет отменить."}
                </p>
            </Modal>
        </div>
    );
}
