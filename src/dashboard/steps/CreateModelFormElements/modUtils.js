import {validateAndRefreshToken} from "../../../utils/easyUtils";
import {showErrorNotification, showNotification} from "../../hotification/showNotification";

const LAND_URL = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND) || process.env.REACT_APP_LAND;

export const saveModelData = async ({
                                        token,
                                        values,
                                        isUpdate = false,
                                        provider = null
                                    }) => {

    const endpoint = isUpdate ? '/model/update' : '/model/create';
    const providerParam = provider ? `&provider=${provider}` : '';

    try {
        // Создаем объект с данными запроса в соответствии с новой структурой ModelDataRequest
        const requestData = {
            name: values.name,
            prompt: values.prompt || "",
            mact: values.action || "",
            trig: values.triggers || [],
            search: Boolean(values.search),
            interpreter: Boolean(values.interp),
            espero: values.espero,
            gpttype: values.gptType || values.gpttype,
            // Если S3 отключено, очищаем fileids, иначе берем из values
            fileids: Boolean(values.s3files) ? (values.fileids || []) : [],
            s3: Boolean(values.s3files),
            operator: Boolean(values.operator),
            // Mistral-специфичные возможности
            image: Boolean(values.image),
            web_search: Boolean(values.web_search),
            // Google-специфичные возможности
            video: Boolean(values.video),
            // LeadHaunter-помечает модель как пригодную для поиска лидов
            haunter: Boolean(values.haunter),
        };

        // Отправляем запрос
        const response = await fetch(`${LAND_URL}${endpoint}?token=${token}${providerParam}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include", // Отправка cookies
            body: JSON.stringify(requestData),
        });

        const result = await response.json();

        if (response.ok) {
            if (result.message === "ok" || result.status === "ok") {
                // Если создаем новую модель, сохраняем информацию в localStorage
                if (!isUpdate) {
                    localStorage.setItem("userModel", true);
                }
                return { status: "ok" };
            }
        }

        return { status: "error" };
    } catch (error) {
        console.error(`Ошибка при ${isUpdate ? 'обновлении' : 'создании'} модели:`, error);
        return { status: "error" };
    }
};

// Функция для установки активного провайдера
export const setActiveProvider = async (token, provider) => {
    const newToken = await validateAndRefreshToken(token);
    try {
        const url = `${LAND_URL}/model/setactive?token=${encodeURIComponent(newToken)}&provider=${encodeURIComponent(provider)}`;
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
        });

        if (response.ok) {
            const result = await response.json();
            showNotification("Активная модель изменена", `Провайдер ${provider} теперь активен`);
            return { status: "ok", active_channels: result.active_channels };
        } else {
            const result = await response.json();
            const errorMessage = result.error || "Не удалось изменить активную модель";
            showErrorNotification("Ошибка смены провайдера", errorMessage);
            return { status: "error", error: errorMessage };
        }
    } catch (error) {
        console.error('Ошибка при установке активного провайдера:', error);
        showErrorNotification("Ошибка смены провайдера", "Произошла ошибка при смене активной модели");
        return { status: "error", error: error.message };
    }
};

// TODO возможно не нужен, был только для получения моделей GPT в режиме sale сейчас они выбираются в Dev
export async function getTypesGPT(token) {
    try {
        const response = await fetch(`${LAND_URL}/model/gpt?token=${encodeURIComponent(token)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
        });

        if (!response.ok) {
            // Если статус ответа не 200-299, обрабатываем ошибку
            const errorData = await response.json();
            throw new Error(errorData.error || `Ошибка сервера: ${response.status}`);
        }

        // Получаем и парсим данные модели
        return await response.json();
    } catch (error) {
        console.error('Ошибка при получении TypesGPT:', error);
        throw error.message;
    }
}

// Проверяет демо ли пользователь
export async function checkDemo(token) {
    try {
        const response = await fetch(`${LAND_URL}/model/demo`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(`Ошибка при проверке демо статуса: ${response.status}`, errorData);
            return { success: false, error: errorData.error || `HTTP ${response.status}` };
        }

        const result = await response.json();

        return { success: true, status: result.status };
    } catch (error) {
        console.error('Ошибка при проверке демо статуса:', error);
        return { success: false, error: error.message };
    }
}


