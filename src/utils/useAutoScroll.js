import { useEffect } from 'react';

export function useAutoScroll(ref, dependencies) {
    useEffect(() => {
        if (ref.current) {
            // Ищем ближайший родительский элемент с прокруткой
            // Поддерживаем ViewDialog, ChatWindow и FloatingChatDemo
            const scrollableParent = ref.current.closest('.view-dialogs-chat-messages, .chat-messages, .chat-messages-demo');

            if (scrollableParent) {
                // Прокручиваем только внутри контейнера сообщений
                scrollableParent.scrollTop = scrollableParent.scrollHeight;
            } else {
                // Fallback - если не найден специфический контейнер, используем старый способ
                // но с block: 'nearest' чтобы минимизировать прокрутку страницы
                ref.current.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'nearest'
                });
            }
        }
    }, [dependencies, ref]);
}
