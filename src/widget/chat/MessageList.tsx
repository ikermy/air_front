import React from 'react';
import {TypingIndicator} from '../../utils/TypingIndicator';
import {ChatMessage} from '../model/message.types';
import {MessageItem} from './MessageItem';

export interface MessageListProps {
    messages: ChatMessage[];
    isTyping: boolean;
    modelName: string | null;
    messageStyles: {user?: React.CSSProperties; bot?: React.CSSProperties};
    onOpenImage: (url: string, name: string) => void;
    messagesEndRef: React.RefObject<HTMLDivElement>;
}

export function MessageList({messages, isTyping, modelName, messageStyles, onOpenImage, messagesEndRef}: MessageListProps) {
    return (
        <div className="wid-chat-messages">
            {messages.map((message) => (
                <MessageItem key={message.id} message={message}
                             style={message.side === 'right' ? messageStyles.user : messageStyles.bot}
                             onOpenImage={onOpenImage}/>
            ))}
            {isTyping && (
                <div className="chat-message right" style={messageStyles.user}>
                    <TypingIndicator isTyping={isTyping} intervalTime={300} name={modelName}/>
                </div>
            )}
            <div ref={messagesEndRef}/>
        </div>
    );
}
