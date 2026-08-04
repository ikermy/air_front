import { authFetch } from "../../../utils/easyUtils";

/**
 * Получить список диалогов пользователя
 */
export async function getUserDialogs() {
    return authFetch(`/v1/dialog/all`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });
}

/**
 * Удалить один диалог
 */
export async function deleteDialog(dialogId: number) {
    try {
        const response = await authFetch(`/v1/dialog/${encodeURIComponent(dialogId)}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
        });

        if (response.ok) {
            let result = {};
            try {
                result = await response.json();
            } catch (e) {
                /* игнорировать */
            }
            return { status: "ok" as const, result };
        } else {
            const result = await response.json().catch(() => ({}));
            const errorMessage = result.error || "Не удалось удалить диалог";
            console.error("Ошибка удаления диалога:", errorMessage);
            return { status: "error" as const, error: errorMessage };
        }
    } catch (error) {
        console.error("Ошибка при удалении диалога:", error);
        return {
            status: "error" as const,
            error: (error as Error).message || "Сетевая ошибка"
        };
    }
}

/**
 * Пакетное удаление диалогов
 */
export async function DeleteDialogs(ids: number[] | string) {
    // Нормализуем ids в массив чисел
    let idsArr: number[] = [];
    if (Array.isArray(ids)) {
        idsArr = ids.slice();
    } else if (typeof ids === "number") {
        idsArr = [ids];
    } else if (typeof ids === "string") {
        idsArr = ids.split(",").map(s => s.trim()).filter(Boolean).map(Number);
    }

    idsArr = idsArr.map(Number).filter(n => Number.isFinite(n) && n > 0);

    if (idsArr.length === 0) {
        return { status: "error", error: "empty_ids" } as const;
    }

    try {
        const response = await authFetch(`/v1/dialog/list`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({ ids: idsArr }),
        });


        if (response.ok) {
            let result = {};
            try {
                result = await response.json();
            } catch (e) {
                /* игнорировать */
            }
            return { status: "ok" as const, result };
        } else {
            const result = await response.json().catch(() => ({}));
            const errorMessage = result.error || "Не удалось удалить диалоги";
            console.error("Ошибка пакетного удаления диалогов:", errorMessage);
            return { status: "error" as const, error: errorMessage };
        }
    } catch (error) {
        console.error("Сетевая ошибка при удалении диалогов:", error);
        return {
            status: "error" as const,
            error: (error as Error).message || "Network error"
        };
    }
}
