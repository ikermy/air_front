import {useEffect} from 'react';
import {getWidgetURL, validateAndRefreshWidgetToken} from "../widget/utils";
import {validateAndRefreshToken} from "../utils/easyUtils";

const LAND_URL = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND) || process.env.REACT_APP_LAND;

export function ReadDialog({mode, dialogId, onDialogData, userName, inToken, setRudSuck}) {
    useEffect(() => {
        let cancelled = false;

        async function fetchAndHandle() {
            try {

                if (cancelled) return;

                let response;
                switch (mode) {
                    case "work": // Используется для в Land для чтения истории диалога
                        const workToken = await validateAndRefreshToken(inToken)
                        if (workToken === null) {
                            console.error("Токен не обновлен!");
                            return;
                        }
                        response = await fetch(`${LAND_URL}/viewdialog`, {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({
                                "token": workToken,
                                "id": Number(dialogId)
                            })
                        });
                        break;
                    case "widget":
                        const widgetToken = await validateAndRefreshWidgetToken(inToken);
                        if (widgetToken === null) {
                            console.error("Токен не обновлен!");
                            return;
                        }

                        const WIDGET_URL = getWidgetURL();
                        const params = new URLSearchParams({token: widgetToken, name: userName});
                        const url = `${WIDGET_URL}/read-dialog?${params.toString()}`;
                        response = await fetch(url, {
                            method: 'GET',
                            headers: {
                                'Accept': 'application/json'
                            }
                        });
                        break;
                    default:
                        console.error("Undefined mode");
                }

                if (cancelled) return;

                if (!response) {
                    console.error('No response from fetch');
                    return;
                }

                if (response.status === 401) {
                    console.error('Токен недействителен или истек');
                    return;
                }

                if (!response.ok) {
                    console.error('Network response was not ok');
                    return;
                }

                const dialogData = await response.json();

                if (cancelled) return;
                onDialogData(dialogData);

                if (mode === "widget") {
                    if (cancelled) return;
                    setRudSuck(true);
                }
            } catch (error) {
                if (!cancelled) {
                    console.error('Failed to fetch dialog data:', error);
                }
            }
        }

        fetchAndHandle();

        return () => {
            cancelled = true;
        };
    }, [mode, dialogId, onDialogData, userName, inToken, setRudSuck]);

    return null; // Этот компонент не отображает данные напрямую
}