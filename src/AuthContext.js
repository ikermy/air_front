import React, { createContext, useState, useContext } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [showLoginForm, setShowLoginForm] = useState(false); // Показ формы авторизации
    const [isAuthenticated, setIsAuthenticated] = useState(false); // Состояние авторизации
    // const [role, setRole] = useState(''); // Состояние авторизации
    // const [name, setName] = useState(''); // Состояние авторизации
    // const [ball, setBall] = useState(''); // Состояние авторизации
    // const [curr, setCurr] = useState(''); // Состояние авторизации

    const login = () => setIsAuthenticated(true); // Логика авторизации
    const logout = () => setIsAuthenticated(false); // Логика выхода

    return (
        <AuthContext.Provider value={{
            isAuthenticated, login, logout,
            showLoginForm, setShowLoginForm,
            // role, setRole,
            // name, setName,
            // ball, setBall,
            // curr, setCurr,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);