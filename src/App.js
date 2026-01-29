import React, {useCallback, useEffect} from 'react';
import {BrowserRouter, Routes, Route, useNavigate, Navigate} from 'react-router-dom';
import { useTheme } from "./ThemeContext";
import './App.css';
import EmailConfirm from "./landing/auth/EmailConfirm"
import Home from "./Home";
import ResetPassword from "./landing/auth/ResetPassword";
import {AuthProvider, useAuth} from "./AuthContext";
import {ChatVisibilityProvider} from "./ChatVisibilityContext";
import Dashboard from "./dashboard/Dashboard";
import {handleError} from "./landing/auth/notificationHandlers";
import {message} from "antd";
import {useNotificationInit} from "./dashboard/hotification/showNotification";
import SimpleAuthForm from "./dashboard/steps/Dev-tolls/SimpleAuthForm";
import PrivacyPolicy from "./landing/PrivacyPolicy";
import { useAppPreloader } from "./utils/useAppPreloader";

const showSimpleAuth = process.env.REACT_APP_SHOW_SIMPLE_AUTH === "false";

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isAuthenticated) {
            navigate("/")
        }
    }, [isAuthenticated, navigate]);

    return isAuthenticated ? children : null;
};

function App() {
    const { theme } = useTheme();
    const [messageApi, contextHolder] = message.useMessage();
    const { contextHolder: notificationContextHolder } = useNotificationInit();
    // Стабильная функция handleError
    const stableHandleError = useCallback(() => handleError(messageApi), [messageApi]);

    useEffect(() => {
        document.body.className = theme;
    }, [theme]);

    // Предзагружаем критически важные изображения
    useAppPreloader();

    return (
        <AuthProvider>
            <ChatVisibilityProvider>
                <BrowserRouter>
                    <div className={`App ${theme}`}>
                        {contextHolder}
                        {notificationContextHolder}
                        <Routes>
                            {showSimpleAuth && (
                                <Route path="/" element={<SimpleAuthForm />} />
                            )}

                            <Route path="/" element={<Home />} />
                            <Route path="/confirm" element={<EmailConfirm />} />
                            <Route path="/reset" element={<ResetPassword />} />

                            <Route
                                path="/dashboard"
                                element={
                                    <ProtectedRoute>
                                        <Dashboard
                                            handleError={stableHandleError}
                                        />
                                    </ProtectedRoute>
                                }
                            />
                            <Route path="/privacy-policy" element={<PrivacyPolicy />} />

                            {/* catch-all: перенаправляем всё неизвестное на корень */}
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </div>
                </BrowserRouter>
            </ChatVisibilityProvider>
        </AuthProvider>
    );
}

export default App;