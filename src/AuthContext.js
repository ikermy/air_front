import React, { createContext, useState, useContext, useEffect } from "react";
import { useCookie } from "./hooks/useCookie";
import { apiLogout, refreshToken } from "./utils/easyUtils";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [accessToken, setAccessToken, removeAccessToken] = useCookie('accessToken');
    const [showLoginForm, setShowLoginForm] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(!!accessToken);
    // Готовность = попытка восстановить сессию по refresh-токену завершена.
    // До неё нельзя редиректить на логин, иначе «Запомнить меня» не сработает.
    const [isAuthReady, setIsAuthReady] = useState(false);

    // Синхронизируем состояние аутентификации с кукой
    useEffect(() => {
        setIsAuthenticated(!!accessToken);
    }, [accessToken]);

    // Access token (STA) живёт недолго и хранится в session-cookie, поэтому
    // после перезапуска браузера его уже нет. Долгоживущий refresh-токен лежит
    // в HttpOnly-куке — обмениваем его на новый access token, чтобы возврат в
    // панель не требовал пароля.
    useEffect(() => {
        let active = true;

        const restore = async () => {
            if (accessToken) {
                setIsAuthenticated(true);
                setIsAuthReady(true);
                return;
            }

            const newToken = await refreshToken();
            if (!active) return;

            if (newToken) {
                setAccessToken(newToken, { secure: true, sameSite: 'lax' });
                setIsAuthenticated(true);
            } else {
                setIsAuthenticated(false);
            }
            setIsAuthReady(true);
        };

        restore();
        return () => { active = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const login = (token) => {
        if (token) {
            setAccessToken(token, { secure: true, sameSite: 'lax' });
        }
        setIsAuthenticated(true);
    };

    const logout = async () => {
        await apiLogout();
        removeAccessToken();
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider value={{
            isAuthenticated, isAuthReady, login, logout,
            showLoginForm, setShowLoginForm,
            accessToken
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

