import React from "react";
import { Button, Dropdown } from "antd";
import { DownOutlined, PlusOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";

export const AddChannel = ({ availableChannels, onChannelSelect }) => {
    const { t } = useTranslation();
    const items = availableChannels.map((channel) => ({
        key: channel.key,
        icon: channel.icon,
        label: channel.label,
    }));

    const handleMenuClick = ({ key }) => {
        onChannelSelect(key);
    };

    return (
        <Dropdown
            menu={{
                items,
                onClick: handleMenuClick,
            }}
            trigger={["click"]}
        >
            <Button
                style={{
                    color: "black",
                }}
                type="primary"
                icon={<PlusOutlined />}
            >
                {t("channelCreateButton") || "Создать канал"} <DownOutlined />
            </Button>
        </Dropdown>
    );
};
