import React, {createContext, useEffect, useState} from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals, { logWebVitals } from './reportWebVitals';
import './i18n';
import {ThemeProvider} from './ThemeContext';
import {getOrSetUserId} from './utils/getOrSetUserId';
import { trackVisitor } from './utils/tracking';

// Создание контекста
export const UserContext = createContext();

function Root() {
    const [userId] = useState(getOrSetUserId()); // Вызываем функцию и сохраняем userId

    useEffect(() => {
        // минимум 1 минута между отправками
        trackVisitor(userId, {minIntervalMs: 60000 }).catch(error => {
            if (process.env.NODE_ENV === 'development') console.error('Ошибка трекинга посетителя:', error);
        });
    }, [userId]);

    // Отправка при закрытии вкладки: используем sendBeacon, без сэмплинга и rate-limit
    useEffect(() => {
        const onPageHide = () => {
            try {
                trackVisitor(userId, { useBeaconOnly: true, event: 'pagehide', minIntervalMs: 0, sampleRate: 1 });
            } catch (e) { /* ignore */ }
        };
        window.addEventListener('pagehide', onPageHide);
        return () => window.removeEventListener('pagehide', onPageHide);
    }, [userId]);

    return (
        // <React.StrictMode> // Режим отладки
            <UserContext.Provider value={userId}>
                <ThemeProvider>
                    <App/>
                </ThemeProvider>
            </UserContext.Provider>
        // </React.StrictMode>
    );
}

const renderApp = () => {
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<Root/>);
}

renderApp();

// Включаем детальное логирование метрик в development режиме
if (process.env.NODE_ENV === 'development') {
    reportWebVitals(logWebVitals);
} else {
    // В production можно передать функцию для отправки в аналитику
    reportWebVitals();
}
