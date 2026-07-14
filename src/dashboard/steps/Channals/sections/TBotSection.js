import {Alert, Input, Switch} from "antd";
import {ApiOutlined} from "@ant-design/icons";
import React, {useEffect, useState, useCallback} from "react";
import {getBotName} from "../chUtils";
import {useTranslation} from "react-i18next";

export const TBotSection = ({channel, selectedChannels, setSelectedChannels}) => {
    const {t} = useTranslation();
    const [botName, setBotName] = useState(null);

    // Парсим channel.data как JSON для получения token и options
    const parseChannelData = useCallback((data) => {
        try {
            if (!data) return {token: '', options: {delta: false}};
            const parsed = typeof data === 'string' ? JSON.parse(data) : data;
            return {
                token: parsed?.token || '',
                options: {
                    delta: parsed?.options?.delta ?? false
                }
            };
        } catch {
            return {token: data || '', options: {delta: false}};
        }
    }, []);

    // Сериализуем token и options обратно в JSON строку
    const serializeChannelData = useCallback((token, delta) => {
        const config = {token};
        if (delta) {
            config.options = {delta: true};
        }
        return JSON.stringify(config);
    }, []);

    const parsed = channel ? parseChannelData(channel.data) : {token: '', options: {delta: false}};

    const fetchBotNameFor = async (chName) => {
        try {
            const res = await getBotName(chName);
            if (res && typeof res === "object") {
                return res.name ?? null;
            }
            return res;
        } catch (err) {
            console.error("Failed to get bot name:", err);
            return null;
        }
    };

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            try {
                if (!channel || !channel.key) {
                    if (mounted) setBotName(null);
                    return;
                }
                const name = await fetchBotNameFor(channel.key);
                if (mounted) setBotName(name);
            } catch (error) {
                console.error("Ошибка при загрузке данных:", error);
            }
        };

        load();
        return () => {
            mounted = false;
        };
    }, [channel]);

    const handleTokenChange = (e) => {
        const value = e.target.value;
        const error =
            value.length > 0 && value.length < 40
                ? t("tbotTokenError") || "API Token должен быть не менее 40 символов!"
                : "";

        if (!channel) return;
        setSelectedChannels(
            selectedChannels.map((ch) =>
                ch.key === channel.key
                    ? {...ch, data: serializeChannelData(value, parsed.options.delta), error: error}
                    : ch
            )
        );
    };

    const handleDeltaChange = (checked) => {
        if (!channel) return;
        setSelectedChannels(
            selectedChannels.map((ch) =>
                ch.key === channel.key
                    ? {...ch, data: serializeChannelData(parsed.token, checked)}
                    : ch
            )
        );
    };

    return (
        <>
            {botName ? (
                <Alert
                    className="channel-alert"
                    message={t("tbotBotRunning") || "Telegram Bot запущен"}
                    description={
                        <>
                            {t("tbotBotRunningDesc") || "Сейчас ваш"}
                            <b>{botName}</b> {t("tbotBotRunningDesc2") || "бот запущен и взаимодействует с Агентом!"}
                        </>
                    }
                    type={channel && channel.data ? "success" : "warning"}
                />
            ) : (
                <div className="padding">
                    <Alert
                        className="channel-alert"
                        message={t("tbotRequireToken") || "Укажите API Token"}
                        description={
                            <>
                                {t("tbotTokenDescription") || "Для работы агента с вашим ботом необходимо указать bot token, получить который можно в Telegram"}
                                <a href="https://t.me/botfather" target="_blank"
                                   rel="noopener noreferrer">&nbsp;BotFather</a>
                            </>
                        }
                        type={channel && channel.data ? "success" : "warning"}
                    />
                    <Input
                        prefix={<ApiOutlined/>}
                        placeholder={t("tbotTokenPlaceholder") || "Введите API Token"}
                        value={parsed.token}
                        onChange={handleTokenChange}
                        status={channel && channel.error ? "error" : ""}
                    />
                </div>
            )}
            {channel && channel.error && <div className="ant-form-item-explain-error">{channel.error}</div>}

            {/* Отображать ответ модели в режиме стриминга */}
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 8,
                paddingLeft: 16,
                justifyContent: "flex-end"
            }}>
                <span>{t("tbotDeltaMode") || "Отображать ответ модели в режиме стриминга"}</span>
                <Switch
                    checked={parsed.options.delta}
                    onChange={handleDeltaChange}
                    checkedChildren={<span style={{color: "black"}}>{t("Yes") || "Да"}</span>}
                    unCheckedChildren={<span style={{color: "black"}}>{t("No") || "Нет"}</span>}
                />
            </div>
        </>
    );
};