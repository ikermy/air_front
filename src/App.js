import React, {useCallback, useEffect, Suspense, lazy} from 'react';
import {useRouter as useNextRouter} from 'next/router';
import {BrowserRouter, MemoryRouter, Routes, Route, useNavigate, Navigate} from 'react-router-dom';
import { useTheme } from "./ThemeContext";
import {AuthProvider, useAuth} from "./AuthContext";
import {ChatVisibilityProvider} from "./ChatVisibilityContext";
import {handleError} from "./landing/auth/notificationHandlers";
import {message, Spin} from "antd";
import {useNotificationInit} from "./dashboard/hotification/showNotification";
import { useAppPreloader } from "./utils/useAppPreloader";
import { goToLanding } from "./utils/goToLanding";

// Lazy loading для маршрутов
const Home = lazy(() => import("./Home"));
const LoginPage = lazy(() => import("./auth/LoginPage"));
const EmailConfirm = lazy(() => import("./landing/auth/EmailConfirm"));
const ResetPassword = lazy(() => import("./landing/auth/ResetPassword"));
const Dashboard = lazy(() => import("./dashboard/Dashboard"));
const SimpleAuthForm = lazy(() => import("./dashboard/steps/Dev-tolls/SimpleAuthForm"));
const PrivacyPolicy = lazy(() => import("./landing/PrivacyPolicy"));
const GoogleOAuthSuccess = lazy(() => import("./dashboard/steps/OAuth/GoogleOAuthSuccess"));
const GoogleOAuthError = lazy(() => import("./dashboard/steps/OAuth/GoogleOAuthError"));
const AvitoOAuthSuccess = lazy(() => import("./dashboard/steps/OAuth/AvitoOAuthSuccess"));
const AvitoOAuthError = lazy(() => import("./dashboard/steps/OAuth/AvitoOAuthError"));

// SaleMode
const showSimpleAuth = false;

// Компонент загрузки
const LoadingFallback = () => (
    <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
    }}>
        <Spin size="large" fullscreen description="Загрузка..." />
    </div>
);

const AppRouter = ({children}) => {
    const nextRouter = useNextRouter();
    if (typeof window === 'undefined') {
        return <MemoryRouter initialEntries={[nextRouter.asPath || '/']}>{children}</MemoryRouter>;
    }
    return <BrowserRouter>{children}</BrowserRouter>;
};

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isAuthenticated) {
            // Лендинг живёт в App Router — клиентская навигация react-router
            // туда не доведёт. Уходим полной загрузкой и просим лендинг
            // сразу открыть модалку входа.
            goToLanding('login');
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
                <AppRouter>
                    <div className={`App ${theme}`}>
                        {contextHolder}
                        {notificationContextHolder}
                        <Suspense fallback={<LoadingFallback />}>
                            <Routes>
                                {showSimpleAuth && (
                                    <Route path="/" element={<SimpleAuthForm />} />
                                )}

                                <Route path="/" element={<Home />} />
                                <Route path="/login" element={<LoginPage />} />
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
                                <Route path="/auth/google/success" element={<GoogleOAuthSuccess />} />
                                <Route path="/auth/google/error" element={<GoogleOAuthError />} />
                                <Route path="/auth/avito/success" element={<AvitoOAuthSuccess />} />
                                <Route path="/auth/avito/error" element={<AvitoOAuthError />} />

                                {/* catch-all: перенаправляем всё неизвестное на корень */}
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                        </Suspense>
                    </div>
                </AppRouter>
            </ChatVisibilityProvider>
        </AuthProvider>
    );
}

export default App;
