import {useContext, useEffect} from 'react';
import {UserContext} from "../index";

export function Examinator({ mode, examId, examKey, setToken, setIsTokenLoading }) {
    const respId = useContext(UserContext);

    useEffect(() => {
        const checkPermission = async () => {
            try {
                const LAND_URL = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND) || process.env.REACT_APP_LAND;

                let response
                switch (mode) {
                    case "widget":
                        response = await fetch(`${LAND_URL}/widget/exam`, {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({
                                b: examKey,
                                c: respId,
                            }),
                        });
                        break
                    case "demo":
                        response = await fetch(`${LAND_URL}/demo/exam`, {
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
