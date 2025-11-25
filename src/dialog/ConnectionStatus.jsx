import { useEffect } from 'react';
import axios from 'axios';
import {getWidgetURL} from "../widget/utils";


const LAND_URL = window.runtimeConfig?.REACT_APP_LAND || process.env.REACT_APP_LAND;
const DEMO_URL = window.runtimeConfig?.REACT_APP_DEMO || process.env.REACT_APP_DEMO;
// const DEMO_URL = process.env.REACT_APP_DEMO;
// const WIDGET_URL = window.runtimeConfig?.REACT_APP_WIDGET || process.env.REACT_APP_WIDGET;

export function ConnectionStatus({ mode, setConnected }) {
    useEffect(() => {
        const checkConnection = async () => {
            try {
                const WIDGET_URL = getWidgetURL();

                let url;

                switch (mode) {
                    case "work":
                        url = `${LAND_URL}/healthcheck`;
                        break;
                    case "demo":
                        url = `${DEMO_URL}/healthcheck`;
                        break;
                    case "widget":
                        url = `${WIDGET_URL}/available`;
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
