import React from "react";
import { Button, Dropdown } from "antd";
import { DownOutlined, PlusOutlined } from "@ant-design/icons";

export const AddChannel = ({ availableChannels, onChannelSelect }) => {
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
                Создать канал <DownOutlined />
            </Button>
        </Dropdown>
    );
};