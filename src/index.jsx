import React, {useEffect, useState} from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import reportWebVitals, { logWebVitals } from './reportWebVitals';
import './i18n';
import {ThemeProvider} from './ThemeContext';
import {getOrSetUserId} from './utils/getOrSetUserId';
import {UserContext} from './UserContext';

export {UserContext};

function Root() {
    const [userId] = useState(getOrSetUserId()); // Вызываем функцию и сохраняем userId

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
