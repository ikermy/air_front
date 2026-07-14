import { useEffect } from 'react';
import axios from 'axios';


export function ConnectionStatus({ mode, setConnected }) {
    useEffect(() => {
        const checkConnection = async () => {
            try {
                let url;
                switch (mode) {
                    case "work":
                        url = `/healthcheck`;
                        break;
                    case "demo":
                        url = `/system/available/demo`;
                        break;
                    case "widget":
                        url = `/system/available/widget`;
                        break;
                    default:
                        console.warn('Неизвестный режим');
                        setConnected(false);
                        return;
                }

                const response = await axios.get(url);

                if (response.status >= 400) {
                    setConnected(false);
                    return;
                }

                setConnected(true);
            } catch (error) {
                if (error.response) {
                } else {
                }
                setConnected(false);
            }
        };

        // Проверка при монтировании компонента
        checkConnection();

        // Устанавливаем интервал проверки каждые 5 секунд
        const interval = setInterval(checkConnection, 5000);
        return () => clearInterval(interval);
    }, [mode, setConnected]);

    return null;
}
