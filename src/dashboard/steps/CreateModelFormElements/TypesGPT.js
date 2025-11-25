import React, {useCallback, useEffect, useState} from "react";
import {Select} from "antd";
import {showErrorNotification} from "../../hotification/showNotification";
import {getTypesGPT} from "./getTypesGPT";

export const TypesGPT = ({ value, onChange }) => {
    const token = localStorage.getItem("authToken");
    const [models, setModels] = useState([]);
    const [loading, setLoading] = useState(false);


    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const result = await getTypesGPT(token);
            setModels(Array.isArray(result) ? result : []);
        } catch (e) {
            showErrorNotification("Ошибка получения данных", e);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <Select
            value={value?.id || null}
            onChange={(id, option) => {
                onChange({ id, name: option.children });
            }}
            style={{ minWidth: 200, flex: 1 }}
            placeholder="Выберите модель"
            loading={loading}
            allowClear
        >
            {models.map(model => (
                <Select.Option key={model.Id} value={model.Id}>
                    {model.Name}
                </Select.Option>
            ))}
        </Select>
    );
};

