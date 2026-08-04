import React, {useCallback, useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {IoSend} from 'react-icons/io5';
import {sendWidgetMessage, validateWidgetToken} from './widgetUtils';

export interface TransceiverProps {
    userName: string;
    token: string;
    setToken: React.Dispatch<React.SetStateAction<string | null>>;
    setPermit?: (value: boolean) => void;
    setIsModalOpen?: (value: boolean) => void;
    addMessage?: (message: string, name: string, side: 'left' | 'right', timestamp: Date) => void;
    inputStyle?: React.CSSProperties;
    sendButtonStyle?: React.CSSProperties;
}

interface WidgetError extends Error {
    status?: number;
}

const SendIcon = IoSend as unknown as React.ComponentType;

export function MessageInput({
    userName,
    token,
    setToken,
    setPermit,
    setIsModalOpen,
    addMessage,
    inputStyle = {},
    sendButtonStyle = {},
}: TransceiverProps) {
    const [message, setMessage] = useState('');
    const [shouldRefresh, setShouldRefresh] = useState(false);
    const {t} = useTranslation();

    const safeSetPermit = useCallback((value: boolean) => {
        if (typeof setPermit === 'function') setPermit(value);
    }, [setPermit]);

    const sendMessage = async () => {
        const content = message.trim();
        if (!content) return;

        addMessage?.(content, userName, 'left', new Date());

        try {
            await sendWidgetMessage(token, userName, content);
            setMessage('');
        } catch (rawError) {
            const error = rawError as WidgetError;
            const status = error.status;

            if (status === 429) {
                setTimeout(() => void sendMessage(), 1000);
            } else if (status === 402 || status === 403) {
                safeSetPermit(false);
            } else if (status === 401) {
                setShouldRefresh(true);
            } else if (status === 500) {
                safeSetPermit(false);
                setIsModalOpen?.(false);
            } else {
                console.error('Ошибка при отправке данных:', error.message);
            }
        }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            void sendMessage();
        }
    };

    useEffect(() => {
        if (!shouldRefresh) return;

        let cancelled = false;
        const retry = async () => {
            try {
                const newToken = await validateWidgetToken(token);
                if (!newToken) {
                    safeSetPermit(false);
                    return;
                }

                if (cancelled) return;
                setToken(newToken);
                const content = message.trim();
                if (content) {
                    await sendWidgetMessage(newToken, userName, content);
                    if (!cancelled) setMessage('');
                }
            } catch (error) {
                console.error('Ошибка при обновлении токена', error);
                safeSetPermit(false);
            } finally {
                if (!cancelled) setShouldRefresh(false);
            }
        };

        void retry();
        return () => { cancelled = true; };
    }, [message, safeSetPermit, setToken, shouldRefresh, token, userName]);

    return (
        <div className="tr-input-container">
            <input
                id="message-input"
                type="text"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('SimpleTransceiver-entermsg')}
                style={inputStyle}
            />
            <button type="button" onClick={() => void sendMessage()} style={sendButtonStyle}>
                <SendIcon/>
            </button>
        </div>
    );
}
