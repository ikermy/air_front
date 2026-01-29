import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Modal, Button, Spin, message } from 'antd';
import { MessageOutlined, DownloadOutlined } from '@ant-design/icons';
import { validateAndRefreshToken } from '../../../../utils/easyUtils';
import { readServiceContactDialogData } from './leadUtils';
import { showErrorNotification } from '../../../hotification/showNotification';
import MarkdownRenderer from '../../../../utils/MarkdownRenderer';
import '../../Dialogs/ViewDialog.css';

export function LeadViewDialog({ contact, visible, onClose }) {
    const [historyMessages, setHistoryMessages] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const loadHistoryData = useCallback(async () => {
        if (!contact) return;

        setHistoryLoading(true);
        setHistoryMessages([]);

        const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
        if (!token) {
            message.error('Ошибка аутентификации');
            setHistoryLoading(false);
            return;
        }

        try {
            const data = await readServiceContactDialogData(token, contact.Contact);

            console.log('LeadViewDialog: raw dialog data:', data);

            if (!data) {
                message.warning('История диалога не найдена');
                setHistoryLoading(false);
                return;
            }

            let messagesArray = data.Messages;

            // Защита: сервер может вернуть массив JSON-строк
            if (Array.isArray(messagesArray) && messagesArray.length > 0 && typeof messagesArray[0] === 'string') {
                try {
                    messagesArray = messagesArray.map((s) => {
                        try { return JSON.parse(s); } catch (e) { console.warn('LeadViewDialog: failed to parse message string', s); return null; }
                    }).filter(Boolean);
                } catch (e) {
                    console.error('LeadViewDialog: error parsing Messages strings', e);
                    messagesArray = [];
                }
            }

            if (!messagesArray || !Array.isArray(messagesArray) || messagesArray.length === 0) {
                message.warning('Сообщения отсутствуют');
                setHistoryLoading(false);
                return;
            }

            // Нормализуем каждый элемент к форме { content, type, uname, timestamp }
            const normalized = messagesArray.map((obj) => {
                if (!obj || typeof obj !== 'object') return null;
                // Формат: { creator, message: { message }, timestamp }
                if (obj.creator !== undefined && obj.message) {
                    const content = (typeof obj.message === 'string') ? obj.message : (obj.message.message || '');
                    const type = (obj.creator === 1) ? 'assistant' : 'user';
                    return { content, type, uname: obj.uname || obj.username || null, timestamp: obj.timestamp || obj.time || null };
                }
                // Формат: { content, type }
                if (obj.content !== undefined && obj.type !== undefined) {
                    return { content: obj.content, type: obj.type, uname: obj.uname || obj.username || null, timestamp: obj.timestamp || obj.time || null };
                }
                // fallback
                const contentField = obj.message?.message || obj.text || obj.content || '';
                const typeField = obj.type || (obj.from === 'agent' ? 'assistant' : 'user');
                return { content: contentField, type: typeField, uname: obj.uname || obj.username || null, timestamp: obj.timestamp || obj.time || null };
            }).filter(Boolean);

            console.log('LeadViewDialog: normalized messages:', normalized);

            // Преобразуем в формат для отображения (как раньше)
            const formattedMessages = normalized.map((msg, index) => ({
                text: <MarkdownRenderer text={(msg.content || '').replace(/\n/g, '<br />')} />,
                originalText: msg.content || '',
                name: msg.type === 'assistant' ? 'Агент' : (msg.uname || contact?.Contact || 'Пользователь'),
                type: msg.type,
                side: msg.type === 'user' ? 'left' : 'right',
                timestamp: msg.timestamp ? new Date(msg.timestamp) : (data.LastUsed ? new Date(data.LastUsed) : new Date()),
                index: index
            }));

            setHistoryMessages(formattedMessages);
        } catch (e) {
            console.error('Ошибка чтения истории диалога:', e);
            showErrorNotification("Ошибка чтения истории диалога");
        } finally {
            setHistoryLoading(false);
        }
    }, [contact]);

    useEffect(() => {
        if (visible && contact) {
            loadHistoryData();
        } else {
            // Очищаем данные при закрытии
            setHistoryMessages([]);
        }
    }, [visible, contact, loadHistoryData]);

    const exportHistoryToHTML = () => {
        if (historyMessages.length === 0) {
            message.info('Нет сообщений для экспорта');
            return;
        }

        // Генерируем HTML
        let html = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>История диалога с ${contact?.Contact}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .chat-container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .chat-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1890ff; padding-bottom: 15px; }
        .chat-header h2 { margin: 0; color: #1890ff; }
        .chat-header p { margin: 5px 0 0 0; color: #666; }
        .message { padding: 12px 16px; margin: 10px 0; border-radius: 8px; max-width: 70%; }
        .left { background-color: #f0f0f0; margin-right: 30%; }
        .right { background-color: #e6f7ff; margin-left: 30%; }
        .message-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .message-name { font-weight: bold; color: #1890ff; }
        .message-content { color: #262626; line-height: 1.6; }
        .export-footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #d9d9d9; color: #8c8c8c; font-size: 12px; }
    </style>
</head>
<body>
    <div class="chat-container">
        <div class="chat-header">
            <h2>История диалога</h2>
            <p>Контакт: ${contact?.Contact}</p>
            <p>Дата экспорта: ${new Date().toLocaleString('ru-RU')}</p>
        </div>`;

        // Добавляем сообщения
        historyMessages.forEach(msg => {
            const escapeHtml = (text) => {
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML.replace(/\n/g, '<br>');
            };

            const messageText = msg.originalText ? escapeHtml(msg.originalText) : '';

            html += `
        <div class="message ${msg.side}">
            <div class="message-header">
                <span class="message-name">${escapeHtml(msg.name)}</span>
            </div>
            <div class="message-content">
                ${messageText}
            </div>
        </div>`;
        });

        html += `
        <div class="export-footer">
            Экспортировано из системы управления контактами
        </div>
    </div>
</body>
</html>`;

        // Создаем Blob и ссылку для скачивания
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `dialog-history-${contact?.Contact}-${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        message.success('Экспорт успешно выполнен');
    };

    const renderMessages = () => {
        if (historyLoading) {
            return (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <Spin size="large" />
                    <div style={{ color: '#8c8c8c', marginTop: '16px' }}>
                        Загрузка истории диалога...
                    </div>
                </div>
            );
        }

        if (historyMessages.length === 0) {
            return (
                <div className="no-messages">
                    <MessageOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
                    <div>Сообщения отсутствуют</div>
                </div>
            );
        }

        let currentDate = null;

        return (
            <div className="view-dialogs-chat-messages">
                {historyMessages.map((msg, index) => {
                    const messageDate = msg.timestamp;
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

                    return (
                        <React.Fragment key={index}>
                            {dateHeader}
                            <div className={`chat-message ${msg.side}`}>
                                <div className={`message-name ${msg.side}`}>
                                    {msg.name}
                                </div>
                                <div className={`message-text ${msg.side}`}>
                                    {msg.text}
                                </div>
                                <div className={`message-timestamp ${msg.side}`}>
                                    {messageDate.toLocaleTimeString()}
                                </div>
                            </div>
                        </React.Fragment>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>
        );
    };

    return (
        <Modal
            title={
                <span>
                    <MessageOutlined /> История диалога с {contact?.Contact}
                </span>
            }
            open={visible}
            onCancel={onClose}
            footer={
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                        key="export"
                        type="primary"
                        icon={<DownloadOutlined />}
                        onClick={exportHistoryToHTML}
                        disabled={historyMessages.length === 0}
                        style={{ color: 'black' }}
                    >
                        Экспортировать
                    </Button>
                </div>
            }
            width={800}
            className="dialog-view-modal"
        >
            {renderMessages()}
        </Modal>
    );
}
