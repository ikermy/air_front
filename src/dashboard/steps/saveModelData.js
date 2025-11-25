export const saveModelData = async ({
    token,
    // modelData = null,
    values,
    isUpdate = false
}) => {
    const LAND_URL = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND) || process.env.REACT_APP_LAND;
    const endpoint = isUpdate ? '/update-model' : '/create-model';

    try {
        // Создаем объект с данными запроса в соответствии с новой структурой ModelDataRequest
        const requestData = {
            token: token,
            name: values.name,
            prompt: values.prompt || "",
            mact: values.action || "",  // Исправляем на правильное поле
            trig: values.triggers || [],
            search: values.search || false,
            interpreter: values.interp || false,
            espero: values.espero,
            gpttype: values.gptType || values.gpttype,
            fileids: values.fileids || [],
            s3: values.s3files || false,
            operator: values.operator || false,
        };

        // Отправляем запрос
        const response = await fetch(`${LAND_URL}${endpoint}`, {
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
