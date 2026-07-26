import React from 'react';
import {ChatMessage} from '../model/message.types';

export interface MessageItemProps {
    message: ChatMessage;
    style?: React.CSSProperties;
    onOpenImage: (url: string, name: string) => void;
}

export function MessageItem({message, style, onOpenImage}: MessageItemProps) {
    return (
        <div className={`chat-message ${message.side}`} style={style}>
            <div className="message-name">{message.name}</div>
            <div className="message-text">
                {message.text}
                {message.imageUrl && (
                    <div className="message-image-container">
                        <img src={message.imageUrl} alt="+" className="chat-image"
                             onClick={() => onOpenImage(message.imageUrl as string, 'image')}/>
                    </div>
                )}
            </div>
            {message.files && (
                <div className="message-files">
                    {message.files.images.map((file, index) => (
                        <div key={`img-${index}`} className="message-image-container">
                            <img src={file.url} alt={file.file_name} className="chat-image"
                                 onClick={() => onOpenImage(file.url, file.file_name)}/>
                        </div>
                    ))}
                    {message.files.audio.map((file, index) => (
                        <div key={`audio-${index}`} className="message-audio-container">
                            <audio controls className="chat-audio"><source src={file.url} type="audio/mpeg"/></audio>
                            <div className="file-name">{file.file_name}</div>
                        </div>
                    ))}
                    {message.files.videos.map((file, index) => (
                        <div key={`video-${index}`} className="message-video-container">
                            <video controls className="chat-video"><source src={file.url} type="video/mp4"/></video>
                            <div className="file-name">{file.file_name}</div>
                        </div>
                    ))}
                    {message.files.documents.map((file, index) => (
                        <div key={`doc-${index}`} className="message-document-container">
                            <a href={file.url} target="_blank" rel="noopener noreferrer" className="document-link">
                                📄 {file.file_name}
                            </a>
                        </div>
                    ))}
                </div>
            )}
            <div className={`message-timestamp ${message.side}`}>{message.timestamp.toLocaleTimeString()}</div>
        </div>
    );
}
