import {useCallback, useState} from 'react';
import {AddMessageInput, ChatMessage} from '../model/message.types';
import {createChatMessage} from '../model/messageMappers';

export function useWidgetMessages(initialMessages: ChatMessage[] = []) {
    const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
    const [isTyping, setIsTyping] = useState(false);
    const [shouldAutoScroll, setShouldAutoScroll] = useState(false);

    const addMessage = useCallback((input: AddMessageInput) => {
        const message = createChatMessage(input);
        if (input.side === 'left') {
            setMessages((previous) => [...previous, message]);
            setShouldAutoScroll(true);
            return;
        }

        setIsTyping(true);
        const duration = message.text.length * 25;
        window.setTimeout(() => {
            setMessages((previous) => [...previous, message]);
            setIsTyping(false);
            setShouldAutoScroll(true);
        }, duration);
    }, []);

    const replaceMessages = useCallback((nextMessages: ChatMessage[]) => {
        setMessages(nextMessages);
        setShouldAutoScroll(true);
    }, []);

    return {
        messages,
        isTyping,
        shouldAutoScroll,
        addMessage,
        replaceMessages,
        setShouldAutoScroll,
    };
}
