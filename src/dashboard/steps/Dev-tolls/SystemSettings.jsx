import React, {useState, useEffect, useCallback} from 'react';
import {Card, Alert, Spin, Row, Col, Typography, Badge, Space} from 'antd';
import {useTranslation} from 'react-i18next';
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    ExclamationCircleOutlined,
    BellOutlined,
    MailOutlined,
    RobotOutlined,
    LockOutlined
} from '@ant-design/icons';
import {showErrorNotification} from '../../hotification/showNotification';
import './SystemSettings.css';
import {checkSettings} from "./gevUtils";

const {Title, Text, Paragraph} = Typography;

export const SystemSettings = () => {
    const { t } = useTranslation();
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('authToken');

    const fetchSettings = useCallback(async () => {
        try {
            setLoading(true);
            const result = await checkSettings(token);
            setSettings(result);
        } catch (error) {
            showErrorNotification(t("sysSettingsErrorFetch") || 'Ошибка получения настроек', error);
        } finally {
            setLoading(false);
        }
    }, [token, t]);

    useEffect(() => {
        if (token !== null) {
            fetchSettings()
        }
    }, [token, fetchSettings]);

    const getStatusTag = (status, isRequired = true) => {
        if (status) {
            return <Text strong style={{ color: '#52c41a' }}>{t("sysSettingsConfigured") || "✓ Настроено"}</Text>;
        } else if (isRequired) {
            return <Text strong style={{ color: '#ff4d4f' }}>{t("sysSettingsMissing") || "✗ Отсутствует"}</Text>;
        } else {
            return <Text strong style={{ color: '#faad14' }}>{t("sysSettingsNotConfigured") || "⚠ Не настроено"}</Text>;
        }
    };

    const renderSectionHeader = (icon, title, description) => (
        <Col xs={24} style={{ marginTop: '32px', marginBottom: '16px' }}>
            <div style={{
                padding: '20px 24px',
                background: 'linear-gradient(135deg, rgba(24, 144, 255, 0.1) 0%, rgba(114, 46, 209, 0.1) 100%)',
                borderRadius: '12px',
                border: '1px solid rgba(24, 144, 255, 0.2)',
                boxShadow: '0 2px 8px rgba(24, 144, 255, 0.1)'
            }}>
                <Space direction="horizontal" size={12} align="center">
                    <div style={{
                        fontSize: '28px',
                        lineHeight: 1,
                        display: 'flex',
                        alignItems: 'center'
                    }}>
                        {icon}
                    </div>
                    <div>
                        <Title level={3} style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
                            {title}
                        </Title>
                        {description && (
                            <Text type="secondary" style={{ fontSize: '13px' }}>
                                {description}
                            </Text>
                        )}
                    </div>
                </Space>
            </div>
        </Col>
    );

    const settingsGroups = {
        keys: {
            title: t("sysSettingsKeysTitle") || 'Ключи доступа',
            description: t("sysSettingsKeysDesc") || 'Базовые ключи для доступа к системе и каналам',
            icon: '🔐'
        },
        models: {
            title: t("sysSettingsModelsTitle") || 'API ключи моделей ИИ',
            description: t("sysSettingsModelsDesc") || 'Ключи для работы с различными провайдерами искусственного интеллекта',
            icon: '🤖'
        },
        notifications: {
            title: t("sysSettingsNotificationsTitle") || 'Уведомления',
            description: t("sysSettingsNotificationsDesc") || 'Настройки для отправки уведомлений через различные каналы',
            icon: '📬'
        }
    };

    const settingsConfig = [
        {
            key: 'user_key',
            title: 'UserKey',
            subtitle: t("sysSettingsUserKeySubtitle") || 'Основной ключ доступа',
            icon: <LockOutlined />,
            description: t("sysSettingsUserKeyDesc") || 'Необходим для доступа к каналам и базовой аутентификации в системе.',
            isRequired: true,
            color: '#ff4d4f',
            category: 'keys',
            badge: t("sysSettingsRequired") || 'ОБЯЗАТЕЛЬНЫЙ'
        },
        {
            key: 'open_key',
            title: 'OpenAI',
            subtitle: 'ChatGPT, GPT-4, GPT-5',
            icon: <RobotOutlined />,
            description: t("sysSettingsOpenAIDesc") || 'API ключ для работы с моделями OpenAI: ChatGPT, GPT-4, GPT-4 Turbo и GPT-5.',
            isRequired: false,
            color: '#10a37f',
            category: 'models',
            badge: t("sysSettingsOptional") || 'ОПЦИОНАЛЬНЫЙ'
        },
        {
            key: 'mistral_key',
            title: 'MistralAI',
            subtitle: 'Voxtral, Magistral, Mistral',
            icon: <RobotOutlined />,
            description: t("sysSettingsMistralDesc") || 'API ключ для работы с моделями MistralAI с поддержкой мультимодальности.',
            isRequired: false,
            color: '#f88500',
            category: 'models',
            badge: t("sysSettingsOptional") || 'ОПЦИОНАЛЬНЫЙ'
        },
        {
            key: 'google_key',
            title: 'Google Gemini',
            subtitle: 'Gemini Pro, Flash, Nano',
            icon: <RobotOutlined />,
            description: t("sysSettingsGoogleDesc") || 'API ключ для работы с моделями Google Gemini различных версий.',
            isRequired: false,
            color: '#1092ff',
            category: 'models',
            badge: t("sysSettingsOptional") || 'ОПЦИОНАЛЬНЫЙ'
        },
        {
            key: 'carpintero',
            title: 'Telegram Bot',
            subtitle: t("sysSettingsTelegramSubtitle") || 'Telegram уведомления',
            icon: <BellOutlined />,
            description: t("sysSettingsTelegramDesc") || 'Настройка бота для отправки уведомлений через Telegram мессенджер.',
            isRequired: false,
            color: '#0088cc',
            category: 'notifications',
            badge: t("sysSettingsOptional") || 'ОПЦИОНАЛЬНЫЙ'
        },
        {
            key: 'smtp',
            title: 'Email (SMTP)',
            subtitle: t("sysSettingsEmailSubtitle") || 'Email уведомления',
            icon: <MailOutlined />,
            description: t("sysSettingsEmailDesc") || 'SMTP сервер для отправки уведомлений по электронной почте.',
            isRequired: false,
            color: '#faad14',
            category: 'notifications',
            badge: t("sysSettingsOptional") || 'ОПЦИОНАЛЬНЫЙ'
        }
    ];

    if (loading) {
        return (
            <div className="system-settings">
                <div className="settings-loading">
                    <Spin size="large"/>
                    <p className="settings-loading-text">{t("sysSettingsLoading") || "Загрузка информации о настройках..."}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="system-settings">
            <div className="settings-header" style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '32px',
                borderRadius: '16px',
                marginBottom: '32px',
                boxShadow: '0 8px 24px rgba(102, 126, 234, 0.25)',
                color: 'white'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                    <div style={{
                        fontSize: '42px',
                        lineHeight: 1
                    }}>
                        ⚙️
                    </div>
                    <div>
                        <Title level={2} style={{
                            color: 'white',
                            margin: 0,
                            fontSize: '28px',
                            fontWeight: 700
                        }}>
                            {t("sysSettingsTitle") || "Системные настройки"}
                        </Title>
                        <Paragraph style={{
                            color: 'rgba(255, 255, 255, 0.9)',
                            margin: 0,
                            fontSize: '15px',
                            marginTop: '4px'
                        }}>
                            {t("sysSettingsSubtitle") || "Управление ключами доступа и интеграциями"}
                        </Paragraph>
                    </div>
                </div>

                {/* Статистика */}
                {settings && (
                    <div style={{
                        display: 'flex',
                        gap: '16px',
                        marginTop: '20px',
                        flexWrap: 'wrap'
                    }}>
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.15)',
                            backdropFilter: 'blur(10px)',
                            padding: '12px 20px',
                            borderRadius: '10px',
                            border: '1px solid rgba(255, 255, 255, 0.2)'
                        }}>
                            <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px', display: 'block' }}>
                                {t("sysSettingsMainKeys") || "Основные ключи"}
                            </Text>
                            <Text style={{ color: 'white', fontSize: '20px', fontWeight: 600 }}>
                                {settings.user_key ? '1/1' : '0/1'}
                            </Text>
                        </div>

                        <div style={{
                            background: 'rgba(255, 255, 255, 0.15)',
                            backdropFilter: 'blur(10px)',
                            padding: '12px 20px',
                            borderRadius: '10px',
                            border: '1px solid rgba(255, 255, 255, 0.2)'
                        }}>
                            <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px', display: 'block' }}>
                                {t("sysSettingsApiModels") || "API моделей"}
                            </Text>
                            <Text style={{ color: 'white', fontSize: '20px', fontWeight: 600 }}>
                                {[settings.open_key, settings.mistral_key, settings.google_key].filter(Boolean).length}/3
                            </Text>
                        </div>

                        <div style={{
                            background: 'rgba(255, 255, 255, 0.15)',
                            backdropFilter: 'blur(10px)',
                            padding: '12px 20px',
                            borderRadius: '10px',
                            border: '1px solid rgba(255, 255, 255, 0.2)'
                        }}>
                            <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px', display: 'block' }}>
                                {t("sysSettingsNotifications") || "Уведомления"}
                            </Text>
                            <Text style={{ color: 'white', fontSize: '20px', fontWeight: 600 }}>
                                {[settings.carpintero, settings.smtp].filter(Boolean).length}/2
                            </Text>
                        </div>
                    </div>
                )}
            </div>

            {!settings?.user_key && (
                <Alert
                    message={t("sysSettingsMissingKeyTitle") || "⚠️ Отсутствует обязательный ключ"}
                    description={t("sysSettingsMissingKeyDesc") || "UserKey не настроен. Без этого ключа невозможно взаимодействие с каналами и базовые функции системы."}
                    type="error"
                    showIcon
                    style={{
                        marginBottom: '24px',
                        borderRadius: '12px',
                        border: '1px solid #ff4d4f40'
                    }}
                />
            )}

            {!settings?.open_key && !settings?.mistral_key && !settings?.google_key && (
                <Alert
                    message={t("sysSettingsRecommendationTitle") || "💡 Рекомендация по настройке"}
                    description={t("sysSettingsRecommendationDesc") || "Не настроен ни один API ключ для моделей ИИ. Рекомендуется настроить хотя бы один ключ (OpenAI, MistralAI или Google Gemini) для полноценной работы с моделями искусственного интеллекта."}
                    type="warning"
                    showIcon
                    style={{
                        marginBottom: '24px',
                        borderRadius: '12px',
                        border: '1px solid #faad1440'
                    }}
                />
            )}

            <Row gutter={[20, 20]} className="settings-grid">
                {/* Группируем настройки по категориям */}
                {Object.entries(settingsGroups).map(([categoryKey, groupInfo]) => (
                    <React.Fragment key={categoryKey}>
                        {renderSectionHeader(
                            groupInfo.icon,
                            groupInfo.title,
                            groupInfo.description
                        )}

                        {settingsConfig.filter(s => s.category === categoryKey).map((setting) => {
                            const isConfigured = settings?.[setting.key];

                            return (
                                <Col xs={24} sm={12} lg={12} key={setting.key}>
                                    <Badge.Ribbon
                                        text={setting.badge}
                                        color={setting.isRequired ? 'red' : 'blue'}
                                        style={{ fontSize: '11px', color: 'white' }}
                                    >
                                        <Card
                                            className="settings-card"
                                            hoverable
                                            style={{
                                                height: '100%',
                                                borderRadius: '12px',
                                                border: isConfigured
                                                    ? `2px solid ${setting.color}20`
                                                    : '1px solid #f0f0f0',
                                                boxShadow: isConfigured
                                                    ? `0 4px 12px ${setting.color}15`
                                                    : '0 2px 8px rgba(0,0,0,0.06)',
                                                transition: 'all 0.3s ease',
                                                overflow: 'hidden'
                                            }}
                                        >
                                            {/* Цветная полоска сверху */}
                                            <div style={{
                                                height: '4px',
                                                background: `linear-gradient(90deg, ${setting.color}, ${setting.color}80)`,
                                                marginBottom: '16px',
                                                borderRadius: '2px 2px 0 0'
                                            }} />

                                            {/* Заголовок */}
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: '16px',
                                                marginBottom: '20px'
                                            }}>
                                                <div
                                                    style={{
                                                        width: '48px',
                                                        height: '48px',
                                                        borderRadius: '12px',
                                                        background: `linear-gradient(135deg, ${setting.color}15, ${setting.color}25)`,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: setting.color,
                                                        fontSize: '24px',
                                                        flexShrink: 0,
                                                        border: `1px solid ${setting.color}30`
                                                    }}
                                                >
                                                    {setting.icon}
                                                </div>

                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <Title
                                                        level={4}
                                                        style={{
                                                            margin: 0,
                                                            marginBottom: '4px',
                                                            fontSize: '18px',
                                                            fontWeight: 600,
                                                            color: setting.color
                                                        }}
                                                    >
                                                        {setting.title}
                                                    </Title>
                                                    <Text
                                                        type="secondary"
                                                        style={{
                                                            fontSize: '13px',
                                                            display: 'block'
                                                        }}
                                                    >
                                                        {setting.subtitle}
                                                    </Text>
                                                </div>
                                            </div>

                                            {/* Статус */}
                                            <Alert
                                                message={
                                                    <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                                                        <Text strong>{t("sysSettingsConfigStatus") || "Статус конфигурации"}</Text>
                                                        {getStatusTag(isConfigured, setting.isRequired)}
                                                    </Space>
                                                }
                                                type={isConfigured ? 'success' : (setting.isRequired ? 'error' : 'warning')}
                                                showIcon
                                                icon={isConfigured ?
                                                    <CheckCircleOutlined /> :
                                                    (setting.isRequired ? <CloseCircleOutlined /> : <ExclamationCircleOutlined />)
                                                }
                                                style={{
                                                    marginBottom: '16px',
                                                    borderRadius: '8px',
                                                }}
                                            />

                                            {/* Описание */}
                                            <Paragraph
                                                style={{
                                                    marginBottom: 0,
                                                    fontSize: '14px',
                                                    lineHeight: '1.6',
                                                }}
                                            >
                                                {setting.description}
                                            </Paragraph>
                                        </Card>
                                    </Badge.Ribbon>
                                </Col>
                            );
                        })}
                    </React.Fragment>
                ))}
            </Row>
        </div>
    );
};

