import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCookie, setCookie } from './utils/cookieUtils';

const ChatVisibilityContext = createContext();

export const useChatVisibility = () => {
    const context = useContext(ChatVisibilityContext);
    if (!context) {
        throw new Error('useChatVisibility must be used within a ChatVisibilityProvider');
    }
    return context;
};

export const ChatVisibilityProvider = ({ children }) => {
    // Инициализируем состояние видимости из куки: если куки нет, показываем чат
    const [isChatVisible, setIsChatVisibleState] = useState(() => {
        const savedVisibility = getCookie('chatVisible');
        if (savedVisibility === null) {
            return true; // Нет куки -> показываем чат
        }
        return savedVisibility === 'true';
    });

    // При первом показе чата (и отсутствии куки) сохраняем куку автоматически
    useEffect(() => {
        const savedVisibility = getCookie('chatVisible');
        if (savedVisibility === null && isChatVisible) {
            setCookie('chatVisible', 'true', 30);
        }
    }, [isChatVisible]);

    // Обёртка для setIsChatVisible, которая также сохраняет в куки
    const setIsChatVisible = (isVisible) => {
        setIsChatVisibleState(isVisible);
        setCookie('chatVisible', isVisible.toString(), 30); // Сохраняем на 30 дней
    };

    // Загружаем сохранённую позицию из localStorage
    const [chatPosition, setChatPositionState] = useState(() => {
        try {
            const savedPosition = localStorage.getItem('chatPosition');
            return savedPosition ? JSON.parse(savedPosition) : null;
        } catch (error) {
            return null;
        }
    });

    // Обёртка для setChatPosition, которая также сохраняет в localStorage
    const setChatPosition = (position) => {
        try {
            setChatPositionState(position);
            if (position) {
                localStorage.setItem('chatPosition', JSON.stringify(position));
            } else {
                localStorage.removeItem('chatPosition');
            }
        } catch (error) {
            setChatPositionState(position);
        }
    };

    return (
        <ChatVisibilityContext.Provider value={{
            isChatVisible,
            setIsChatVisible,
            chatPosition,
            setChatPosition
        }}>
            {children}
        </ChatVisibilityContext.Provider>
    );
};
