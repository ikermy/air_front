import {RefObject, useCallback, useEffect} from 'react';

export function useAutoScroll(
    messagesEndRef: RefObject<HTMLDivElement>,
    shouldScroll: boolean,
    onScrollHandled: () => void,
) {
    const scrollToEnd = useCallback(() => {
        const element = messagesEndRef.current;
        if (!element) return;

        const scrollableParent = element.closest('.wid-chat-messages');
        if (scrollableParent) {
            scrollableParent.scrollTop = scrollableParent.scrollHeight;
        } else {
            element.scrollIntoView({behavior: 'smooth', block: 'nearest', inline: 'nearest'});
        }
    }, [messagesEndRef]);

    useEffect(() => {
        if (!shouldScroll) return;
        scrollToEnd();
        onScrollHandled();
    }, [onScrollHandled, scrollToEnd, shouldScroll]);

    return {scrollToEnd};
}
