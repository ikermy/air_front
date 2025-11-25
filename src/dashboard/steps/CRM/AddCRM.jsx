import React from 'react';
import { Button, Dropdown } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

export const AddCRM = ({ availableCRMs, onCRMSelect }) => {
    const items = availableCRMs.map((crm) => ({
        key: crm.key,
        label: (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {crm.icon}
                <span>{crm.label}</span>
            </div>
        ),
        onClick: () => onCRMSelect(crm)
    }));

    return (
        <Dropdown menu={{ items }} placement="bottomLeft" disabled={availableCRMs.length === 0}>
            <Button
                type="primary"
                icon={<PlusOutlined />}
                size="large"
                disabled={availableCRMs.length === 0}
            >
                Добавить CRM систему
            </Button>
        </Dropdown>
    );
};

