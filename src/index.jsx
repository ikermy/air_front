import React, {createContext, useEffect, useState} from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
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

// В режиме разработки (npm start) рендерим приложение немедленно.
// В продакшене (в Docker) ждем загрузки динамической конфигурации.
if (process.env.NODE_ENV === 'development') {
    renderApp();
} else {
    window.addEventListener('runtime-config-loaded', renderApp);

    // На случай, если конфиг уже загружен (из кэша)
    if (window.runtimeConfig) {
        renderApp();
    }
}

reportWebVitals();
