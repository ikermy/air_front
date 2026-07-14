import React, { createContext, useState, useContext, useEffect } from "react";
import { useCookie } from "./hooks/useCookie";
import { apiLogout } from "./utils/easyUtils";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [accessToken, setAccessToken, removeAccessToken] = useCookie('accessToken');
    const [showLoginForm, setShowLoginForm] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(!!accessToken);

    // Синхронизируем состояние аутентификации с кукой
    useEffect(() => {
        setIsAuthenticated(!!accessToken);
    }, [accessToken]);

    const login = (token) => {
        if (token) {
            const maxAge = process.env.REACT_APP_ACCESS_TOKEN_MAX_AGE || 900;
            setAccessToken(token, { maxAge, secure: true, sameSite: 'lax' });
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
            isAuthenticated, login, logout,
            showLoginForm, setShowLoginForm,
            accessToken
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

