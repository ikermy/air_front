import {useCallback} from 'react';
import {useWidgetEvents, WidgetEventFile} from './hooks/useWidgetEvents';

export interface ReceiverFile {
    type?: string;
    url: string;
    fileName?: string;
    caption?: string;
}

export interface ReceiverProps {
    addMessage: (message: string, name: string, side: 'left' | 'right', timestamp: Date, imageUrl?: string | null, files?: ReceiverFile[]) => void;
    token: string;
    setIsModalOpen: (value: boolean) => void;
    setModelName: (value: string) => void;
}

export function Receiver({addMessage, token, setIsModalOpen, setModelName}: ReceiverProps) {
    const handleAssist = useCallback((content: string, name: string, timestamp: Date, files: WidgetEventFile[]) => {
        setModelName(name);
        addMessage(content, name, 'right', timestamp, null, files);
    }, [addMessage, setModelName]);

    useWidgetEvents({
        token,
        onAssist: handleAssist,
        onShutdown: () => setIsModalOpen(false),
        onError: () => setIsModalOpen(false),
    });

    return null;
}
