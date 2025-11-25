import {Alert, Input} from "antd";
import {ApiOutlined} from "@ant-design/icons";
import React, {useEffect, useState} from "react";
import {validateAndRefreshToken} from "../../../../utils/easyUtils";
import {getBotName} from "../getBotName";

export const TBotSection = ({channel, selectedChannels, setSelectedChannels}) => {
    const [botName, setBotName] = useState(null);

    const fetchBotNameFor = async (chName) => {
        const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
        if (!token) return null;

        try {
            const res = await getBotName(token, chName);
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

    return (
        <>
            {botName ? (
                <Alert
                    className="channel-alert"
                    message="Telegram Bot запущен"
                    description={
                        <>
                            Сейчас ваш <b>{botName}</b> бот запущен и взаимодействует с Ассистентом!
                        </>
                    }
                    type={channel && channel.data ? "success" : "warning"}
                />
            ) : (
                <div className="padding">
                    <Alert
                        className="channel-alert"
                        message="Укажите API Token"
                        description={
                            <>
                                Для работы ассистента с вашим ботом необходимо указать bot token, получить который можно в
                                Telegram
                                <a href="https://t.me/botfather" target="_blank" rel="noopener noreferrer">&nbsp;BotFather</a>
                            </>
                        }
                        type={channel && channel.data ? "success" : "warning"}
                    />
                    <Input
                        prefix={<ApiOutlined/>}
                        placeholder="Введите API Token"
                        value={channel ? channel.data : ""}
                        onChange={(e) => {
                            const value = e.target.value;
                            const error =
                                value.length > 0 && value.length < 40
                                    ? "API Token должен быть не менее 40 символов!"
                                    : "";

                            if (!channel) return;
                            setSelectedChannels(
                                selectedChannels.map((ch) =>
                                    ch.key === channel.key ? { ...ch, data: value, error: error } : ch
                                )
                            );
                        }}
                        status={channel && channel.error ? "error" : ""}
                    />
                </div>
            )}
            {channel && channel.error && <div className="ant-form-item-explain-error">{channel.error}</div>}
        </>
    );
};