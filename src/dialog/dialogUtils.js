import {useEffect} from "react";
import { authFetch } from "../utils/easyUtils";

const WIDGET_API_BASE = process.env.LAND_URL;

export function ReadDialog({mode, dialogId, onDialogData, userName, inToken, setRudSuck}) {
    useEffect(() => {
        let cancelled = false;

        async function fetchAndHandle() {
            try {

                if (cancelled) return;

                let response;
                switch (mode) {
                    case "work": // Используется для в Land для чтения истории диалога
                        response = await authFetch(`/v1/dialog/view/${dialogId}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' }
                        }, inToken);
                        break;
                    case "widget":
                        const widgetToken = await validateAndRefreshWidgetToken(inToken);
                        if (widgetToken === null) {
                            console.error("Токен не обновлен!");
                            return;
                        }

                        const params = new URLSearchParams({name: userName});
                        const url = `${WIDGET_API_BASE}/v1/widget/dialog?${params.toString()}`;
                        response = await fetch(url, {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${widgetToken}`
                            },
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

                if (mode === "widget" && response.status === 403) {
                    console.error('Текущий сайт не входит в список разрешённых origin');
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

export async function DeleteDialog(dialogId) {
    try {
        const response = await authFetch(`/v1/dialog/${encodeURIComponent(dialogId)}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
        });

        if (response.ok) {
            let result = {};
            try { result = await response.json(); } catch (e) { /* игнорировать */ }
            return { status: "ok", result };
        } else {
            const result = await response.json().catch(() => ({}));
            const errorMessage = result.error || "Не удалось удалить диалог";
            console.error("Ошибка удаления диалога:", errorMessage);
            return { status: "error", error: errorMessage };
        }
    } catch (error) {
        console.error("Ошибка при удалении диалога:", error);
        return { status: "error", error: error.message || "Сетевая ошибка" };
    }
}

export async function DeleteDialogs(ids) {
    // Нормализуем ids в массив чисел
    let idsArr = [];
    if (Array.isArray(ids)) {
        idsArr = ids.slice();
    } else if (typeof ids === "number") {
        idsArr = [ids];
    } else if (typeof ids === "string") {
        idsArr = ids.split(",").map(s => s.trim()).filter(Boolean).map(s => Number(s));
    }

    idsArr = idsArr.map(Number).filter(n => Number.isFinite(n) && n > 0);

    if (idsArr.length === 0) {
        return { status: "error", error: "empty_ids" };
    }

    try {
        const response = await authFetch(`/v1/dialog/list`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({ ids: idsArr }),
        });

        if (response.ok) {
            let result = {};
            try { result = await response.json(); } catch (e) { /* игнорировать */ }
            return { status: "ok", result };
        } else {
            const result = await response.json().catch(() => ({}));
            const errorMessage = result.error || "Не удалось удалить диалоги";
            console.error("Ошибка пакетного удаления диалогов:", errorMessage);
            return { status: "error", error: errorMessage };
        }
    } catch (error) {
        console.error("Сетевая ошибка при удалении диалогов:", error);
        return { status: "error", error: error.message || "Network error" };
    }
}

export const validateAndRefreshWidgetToken = async (token) => {
    if (token === "no_balance") { return token } // Такого не бывает

    try {
        // Пытаемся валидировать текущий токен
        const response = await fetch(`${WIDGET_API_BASE}/v1/widget/validate`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            // credentials: 'include', // Куки будут отправлены
        });

        if (response.status === 401) {
            const newToken = await refreshWidgetToken({oldtoken: token});
            if (newToken) {
                return newToken; // Возвращаем новый токен
            } else {
                return null; // Ошибка обновления токена
            }
        } else if (response.ok) {
            return token; // Возвращаем существующий токен
        } else {
            console.error("Неизвестная ошибка при проверке токена");
            if (typeof window !== "undefined") {
                localStorage.removeItem("authToken");
            }
            return null; // Ошибка при валидации токена
        }
    } catch (error) {
        console.error("Ошибка при проверке токена:", error);
        return null; // Исключение при валидации
    }
};

const refreshWidgetToken = async ({oldtoken}) => {
    try {
        const response = await fetch(`${WIDGET_API_BASE}/v1/widget/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${oldtoken}`
            },
        });

        if (response.ok) {
            const data = await response.json();
            if (data.token) {
                return data.token; // Возвращаю обновленный токен
            }
        } else {
            console.error("Не удалось обновить токен");
            return null
        }
    } catch (error) {
        console.error("Ошибка при обновлении токена:", error);
        return null
    }
};

