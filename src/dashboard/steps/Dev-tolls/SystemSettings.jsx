import React, {useState, useEffect, useCallback} from 'react';
import {Card, Alert, Spin, Row, Col, Tag, Typography} from 'antd';
import {CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined, KeyOutlined, ApiOutlined, BellOutlined, MailOutlined} from '@ant-design/icons';
import {checkSettings} from './checkSettings';
import {showErrorNotification} from '../../hotification/showNotification';
import './SystemSettings.css';

const {Title, Text, Paragraph} = Typography;

export const SystemSettings = () => {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('authToken');


    const fetchSettings = useCallback(async () => {
        try {
            setLoading(true);
            const result = await checkSettings(token);
            setSettings(result);
        } catch (error) {
            showErrorNotification('Ошибка получения настроек', error);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (token !== null) {
            fetchSettings()
        }
    }, [token, fetchSettings]);

    const getStatusTag = (status, isRequired = true) => {
        const tagStyle = {
            fontSize: '11px',
            padding: '0 7px',
            height: '22px',
            lineHeight: '22px',
            display: 'inline-flex',
            alignItems: 'center',
            flexShrink: 0,
            width: '120px',
            justifyContent: 'center'
        };

        if (status) {
            return <Tag icon={<CheckCircleOutlined/>} color="success" style={tagStyle}>Настроено</Tag>;
        } else if (isRequired) {
            return <Tag icon={<CloseCircleOutlined/>} color="error" style={tagStyle}>Отсутствует</Tag>;
        } else {
            return <Tag icon={<ExclamationCircleOutlined/>} color="warning" style={tagStyle}>Не настроено</Tag>;
        }
    };

    const settingsConfig = [
        {
            key: 'user_key',
            title: 'UserKey',
            icon: <KeyOutlined />,
            description: 'Необходим для доступа к каналам. Обязательный параметр.',
            isRequired: true,
            color: '#ff4d4f'
        },
        {
            key: 'api_key',
            title: 'OpenAI API',
            icon: <ApiOutlined />,
            description: 'Необходим для работы с GPT API. Обязательный параметр.',
            isRequired: true,
            color: '#52c41a'
        },
        {
            key: 'carpintero',
            title: 'Уведомления (Telegram Bot)',
            icon: <BellOutlined />,
            description: 'Необходим для интеграции с Telegram. Опциональный параметр.',
            isRequired: false,
            color: '#1890ff'
        },
        {
            key: 'smtp',
            title: 'Уведомления (Email)',
            icon: <MailOutlined />,
            description: 'Необходим для отправки уведомлений по email. Опциональный параметр.',
            isRequired: false,
            color: '#faad14'
        }
    ];

    if (loading) {
        return (
            <div className="system-settings">
                <div className="settings-loading">
                    <Spin size="large"/>
                    <p className="settings-loading-text">Загрузка информации о настройках...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="system-settings">
            <div className="settings-header">
                <Title level={2}>
                    Системные настройки Dev Tools
                </Title>
                <Paragraph className="settings-description">
                    Здесь отображается статус основных системных настроек.
                    Убедитесь, что все обязательные параметры настроены корректно.
                </Paragraph>
            </div>

            {(!settings?.user_key || !settings?.api_key) && (
                <div className="settings-alerts">
                    {!settings?.user_key && (
                        <Alert
                            message="Отсутствует UserKey"
                            description="Не указан UserKey, невозможно взаимодействие с каналами!"
                            type="error"
                            showIcon
                            style={{marginBottom: '16px'}}
                        />
                    )}
                    {!settings?.api_key && (
                        <Alert
                            message="Отсутствует OpenAI API"
                            description="Для корректной работы системы необходимо указать OpenAI API ключ."
                            type="error"
                            showIcon
                            style={{marginBottom: '16px'}}
                        />
                    )}
                </div>
            )}

            <Row gutter={[24, 24]} className="settings-grid">
                {settingsConfig.map((setting) => (
                    <Col xs={24} sm={12} lg={12} key={setting.key}>
                        <Card className="settings-card">
                            <div className="settings-card-header" style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                marginBottom: '16px',
                                padding: '12px',
                                backgroundColor: 'rgba(0, 0, 0, 0.02)',
                                borderRadius: '8px'
                            }}>
                                <div
                                    className="settings-card-icon"
                                    style={{
                                        color: setting.color,
                                        fontSize: '32px',
                                        lineHeight: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    {setting.icon}
                                </div>
                                <div className="settings-card-content" style={{
                                    flex: 1,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '12px',
                                }}>
                                    <Title level={4} className="settings-card-title" style={{
                                        marginBottom: 0,
                                        marginTop: 0,
                                        lineHeight: '32px',
                                        flex: 1
                                    }}>
                                        {setting.title}
                                    </Title>
                                    <Tag
                                        color={setting.isRequired ? 'red' : 'blue'}
                                        style={{
                                            fontSize: '11px',
                                            padding: '0 7px',
                                            height: '22px',
                                            lineHeight: '22px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            flexShrink: 0,
                                            width: '120px',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        {setting.isRequired ? 'ОБЯЗАТЕЛЬНЫЙ' : 'ОПЦИОНАЛЬНЫЙ'}
                                    </Tag>
                                </div>
                            </div>

                            <div className="settings-card-status" style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '12px'
                            }}>
                                <Text strong style={{ flex: 1 }}>Статус:</Text>
                                {getStatusTag(settings?.[setting.key], setting.isRequired)}
                            </div>

                            <Paragraph className="settings-card-description" style={{ marginBottom: 0 }}>
                                {setting.description}
                            </Paragraph>
                        </Card>
                    </Col>
                ))}
            </Row>
        </div>
    );
};
