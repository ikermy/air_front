import {useContext, useEffect} from 'react';
import {UserContext} from "../index";
import {getWidgetURL} from "./utils";


const DEMO_URL = window.runtimeConfig?.REACT_APP_DEMO || process.env.REACT_APP_DEMO;
// const WIDGET_URL = window.runtimeConfig?.REACT_APP_WIDGET || process.env.REACT_APP_WIDGET;

export function Examinator({ mode, examId, examKey, setToken, setIsTokenLoading }) {
    const respId = useContext(UserContext);

    useEffect(() => {
        const checkPermission = async () => {
            try {
                const WIDGET_URL = getWidgetURL();

                let response
                switch (mode) {
                    case "widget":
                        response = await fetch(`${WIDGET_URL}/exam`, {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({
                                b: examKey,
                                c: respId,
                            }),
                        });
                        break
                    case "demo":
                        response = await fetch(`${DEMO_URL}/exam`, {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({
                                a: examId, // demoAssist
                                c: respId, // фактически respId
                            }),
                        });
                        break
                    default:
                        console.warn('Unknown mode');
                        if (setIsTokenLoading) setIsTokenLoading(false);
                        return;
                }

                if (!response.ok) {
                    if (setIsTokenLoading) setIsTokenLoading(false);
                    return;
                }

                const data = await response.json()
                setToken(data.resp);

            } catch (error) {
                console.error('Error:', error);
            } finally {
                // Уведомляем о завершении загрузки токена
                if (setIsTokenLoading) setIsTokenLoading(false);
            }
        };

        checkPermission();
    }, [examId, examKey, respId, setToken, setIsTokenLoading, mode]);

    return null; // Ничего не отображаем
}
