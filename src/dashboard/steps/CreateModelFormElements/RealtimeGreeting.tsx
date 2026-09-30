import React from "react";
import {Input, Switch, Tooltip} from "antd";
import {InfoCircleOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";

interface RealtimeGreetingProps {
    initialGreeting: boolean;
    greeting: string;
    disabled?: boolean;
    /** ElevenLabs: автогенерации нет — нужна явная фраза. */
    elevenLabs?: boolean;
    onInitialGreetingChange: (checked: boolean) => void;
    onGreetingChange: (value: string) => void;
}

/**
 * Блок «Приветствие» — та же логика и интерфейс, что у базовых realtime-провайдеров
 * (OpenAI/Google/Mistral). Используется в режиме ElevenLabs.
 *
 * Особенность ElevenLabs: автогенерации приветствия нет — если фраза пуста,
 * приветствие не произносится (подсказки отличаются от нативных).
 */
export const RealtimeGreeting: React.FC<RealtimeGreetingProps> = ({
    initialGreeting,
    greeting,
    disabled,
    elevenLabs = true,
    onInitialGreetingChange,
    onGreetingChange,
}) => {
    const {t} = useTranslation();
    return (
        <div className="espero-channel-item" style={{display: "flex", flexDirection: "column", gap: 4}}>
            <div className="espero-form-item">
                <div className="espero-switch-container">
                    <div className="espero-switch-label">
                        {t("realtimeInitialGreetingLabel") || "Приветствие при начале диалога"}
                        <Tooltip title={elevenLabs
                            ? (t("realtimeInitialGreetingElevenLabsTip") || "Голосовой шлюз ElevenLabs произнесёт указанную ниже фразу до первого сообщения пользователя. Автогенерации нет.")
                            : (t("realtimeInitialGreetingTip") || "Модель отвечает до первого сообщения пользователя — произносит приветствие. По умолчанию: включено")}>
                            <InfoCircleOutlined style={{color: "#999", marginLeft: 6}}/>
                        </Tooltip>
                    </div>
                    <Switch checked={initialGreeting} onChange={onInitialGreetingChange}
                            disabled={disabled}
                            checkedChildren={<span style={{color: "black"}}>{t("Yes") || "Да"}</span>}
                            unCheckedChildren={<span style={{color: "black"}}>{t("No") || "Нет"}</span>}/>
                </div>
            </div>
            {initialGreeting && (
                <div className="espero-form-item">
                    <div className="espero-form-label">
                        {t("realtimeGreetingLabel") || "Текст приветствия"}
                        <Tooltip title={elevenLabs
                            ? (t("realtimeGreetingElevenLabsTip") || "Явная фраза приветствия. У ElevenLabs автогенерации нет — если оставить пустым, приветствие не произносится.")
                            : (t("realtimeGreetingTip") || "Явная фраза приветствия. Если не задана — модель сформирует приветствие самостоятельно на основе системного промпта.")}>
                            <InfoCircleOutlined style={{color: "#999", marginLeft: 6}}/>
                        </Tooltip>
                    </div>
                    <Input.TextArea
                        value={greeting}
                        onChange={(e) => onGreetingChange(e.target.value)}
                        disabled={disabled}
                        placeholder={elevenLabs
                            ? (t("realtimeGreetingElevenLabsPlaceholder") || "Оставьте пустым — приветствия не будет")
                            : (t("realtimeGreetingPlaceholder") || "Оставьте пустым, чтобы использовать приветствие из промпта")}
                        autoSize={{minRows: 2, maxRows: 5}}
                        style={{marginTop: 4}}
                    />
                </div>
            )}
        </div>
    );
};
