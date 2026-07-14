import React, {useState, useCallback} from "react";
import {Select, Spin, Tooltip} from "antd";
import {RobotOutlined, InfoCircleOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import {getListModelNames, type GptTypeValue} from "./modUtils";
import "./Espero.css";

interface TypesGPTProps {
    token?: string | null;
    provider?: string | null;
    value?: string | GptTypeValue | null;
    onChange?: (value: GptTypeValue) => void;
}

const normalizeModelValue = (value: unknown): string | undefined => {
    if (typeof value === "string") {
        return value;
    }

    if (value && typeof value === "object") {
        const record = value as Record<string, unknown>;
        if (typeof record.name === "string") {
            return record.name;
        }
        if (typeof record.value === "string") {
            return record.value;
        }
        if (typeof record.Name === "string") {
            return record.Name;
        }
    }

    return undefined;
};

export const TypesGPT: React.FC<TypesGPTProps> = ({provider = null, value, onChange}) => {
    const {t} = useTranslation();
    const [models, setModels] = useState<GptTypeValue[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const normalizedValue = normalizeModelValue(value);

    const resolveSelectedModel = useCallback((selectedName: string): GptTypeValue => {
        const matchedModel = models.find((model) => model.name === selectedName);
        return matchedModel
            ? {name: matchedModel.name, id: matchedModel.id ?? 0}
            : {name: selectedName, id: 0};
    }, [models]);

    const selectOptions = React.useMemo(() => {
        const options = models.map((model) => ({label: model.name, value: model.name}));
        if (normalizedValue && !options.some((option) => option.value === normalizedValue)) {
            options.unshift({label: normalizedValue, value: normalizedValue});
        }
        return options;
    }, [models, normalizedValue]);

    const loadModels = useCallback(async () => {
        if (!provider) {
            setModels([]);
            setError(null);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const list = await getListModelNames(provider);
            setModels(list);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Не удалось загрузить модели");
            setModels([]);
        } finally {
            setLoading(false);
        }
    }, [provider]);

    const handleOpenChange = useCallback((visible: boolean) => {
        setOpen(visible);

        if (!visible) {
            return;
        }

        setLoading(true);
        setError(null);

        if (!provider) {
            setModels([]);
            setLoading(false);
            return;
        }

        void loadModels();
    }, [loadModels, provider]);

    return (
        <>
            <div className="section-title">
                <RobotOutlined />
                {t("typesGPTTitle") || "Выбор языковой модели"}
            </div>
            <div className="section-description">
                {t("typesGPTDesc") || "Выберите конкретную модель провайдера для использования."}
            </div>

            <div className="espero-channel-item" style={{display: "flex", flexDirection: "column", gap: 4}}>
                <div className="espero-form-item">
                    <div className="espero-form-label">
                        {t("typesGPTModelLabel") || "Доступные модели"}
                        <Tooltip title={t("typesGPTModelTip") || "Список доступных моделей актуализируется при открытии списка"}>
                            <InfoCircleOutlined style={{color: "#999", marginLeft: 6}} />
                        </Tooltip>
                    </div>
                    <Select
                        value={normalizedValue ?? undefined}
                        onChange={(nextValue) => onChange?.(resolveSelectedModel(String(nextValue)))}
                        placeholder={t("typesGPTPlaceholder") || "Выберите модель"}
                        open={open}
                        onOpenChange={handleOpenChange}
                        loading={loading}
                        showSearch
                        optionFilterProp="label"
                        filterOption={(input, option) => {
                            const label = typeof option?.label === "string" ? option.label : "";
                            return label.toLowerCase().includes(input.toLowerCase());
                        }}
                        notFoundContent={
                            loading
                                ? <Spin size="small" />
                                : <span style={{color: error ? "#ff4d4f" : undefined}}>{error || (t("typesGPTNotFound") || "Модели не найдены")}</span>
                        }
                        options={selectOptions}
                        style={{width: "100%"}}
                    />
                </div>
            </div>
        </>
    );
};
