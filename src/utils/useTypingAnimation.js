import { useState, useEffect } from 'react';

export function useTypingAnimation(isTyping, intervalTime = 300) {
    const [typingAnimation, setTypingAnimation] = useState(0);

    useEffect(() => {
        if (isTyping) {
            const interval = setInterval(() => {
                setTypingAnimation(prev => (prev + 1) % 3);
            }, intervalTime);
            return () => clearInterval(interval);
        } else {
            // Сбрасываем состояние анимации, когда печать прекращена
            setTypingAnimation(0);
        }
    }, [isTyping, intervalTime]);

    return typingAnimation;
}
