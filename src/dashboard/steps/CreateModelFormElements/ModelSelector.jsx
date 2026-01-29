import React, { useState } from 'react';
import { Card, Button, Badge, Spin, Tooltip } from 'antd';
import { CheckCircleOutlined, PlusOutlined, RocketOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import './ModelSelector.css';
import OpenAILogo from '../../../assets/img/openai-logo.svg';
import MistralAILogo from '../../../assets/img/mistral-ai-logo.png';
import GeminiLogo from '../../../assets/img/gemini-logo.png';

const PROVIDERS = [
    {
        key: 'openai',
        name: 'OpenAI',
        logo: OpenAILogo,
        color: '#10a37f',
        description: 'ChatGPT, GPT-4, GPT-5',
        disabled: false
    },
    {
        key: 'mistral',
        name: 'MistralAI',
        logo: MistralAILogo,
        color: '#f88500',
        description: 'Voxtral, Magistral, Mistral',
        disabled: false
    },
    {
        key: 'google',
        name: 'Gemini',
        logo: GeminiLogo,
        color: '#1092ff',
        description: 'Gemini 3 Pro, Nano Banana',
        disabled: false
    }
];

export const ModelSelector = ({
    allModelsData,
    activeProvider,
    selectedProvider,
    onSelectProvider,
    onSetActive,
    loading,
    hasUnsavedChanges = false
}) => {
    const { t } = useTranslation();
    const [activatingProvider, setActivatingProvider] = useState(null);

    const handleSetActive = async (providerKey) => {
        setActivatingProvider(providerKey);
        try {
            await onSetActive(providerKey);
        } catch (error) {
            console.error("Ошибка при установке активной модели:", error);
        } finally {
            setActivatingProvider(null);
        }
    };

    return (
        <div className="model-selector-container">
            <div className="model-selector-header">
                <h3 className="model-selector-title">
                    <RocketOutlined /> {t("modelSelectorTitle") || "Выбор провайдера AI модели"}
                </h3>
                <p className="model-selector-description">
                    {t("modelSelectorDescription") || "Выберите провайдера для работы с моделью. Активная модель используется во всех диалогах."}
                </p>
            </div>

            <div className="model-selector-grid">
                {PROVIDERS.map((provider) => {
                    const modelData = allModelsData?.[provider.key];
                    const isActive = activeProvider === provider.key;
                    const isSelected = selectedProvider === provider.key;
                    const hasModel = !!modelData;
                    const isActivating = activatingProvider === provider.key;
                    const isDisabled = provider.disabled;

                    return (
                        <Card
                            key={provider.key}
                            className={`provider-card ${isSelected ? 'selected' : ''} ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
                            style={{
                                borderColor: isSelected ? provider.color : undefined,
                                opacity: (loading && !isActivating) || isDisabled ? 0.6 : 1
                            }}
                            hoverable={!loading && !isDisabled}
                            onClick={() => !isDisabled && hasModel && !loading && onSelectProvider(provider.key)}
                        >
                            <Spin spinning={isActivating} tip={t("modelActivating") || "Активация..."}>
                                {/*...existing code...*/}
                                {/*    <Badge.Ribbon*/}
                                {/*        text="Недоступно"*/}
                                {/*        color="gray"*/}
                                {/*        className="disabled-ribbon"*/}
                                {/*    />*/}
                                {/*)}*/}

                                {!isDisabled && isSelected && hasUnsavedChanges && (
                                    <Badge.Ribbon
                                        text={t("modelUnsaved") || "Не сохранено"}
                                        color="orange"
                                        className="unsaved-ribbon"
                                    />
                                )}

                                {/*{!isDisabled && isActive && !(isSelected && hasUnsavedChanges) && (*/}
                                {/*    <Badge.Ribbon*/}
                                {/*        text="Активная"*/}
                                {/*        color={provider.color}*/}
                                {/*        className="active-ribbon"*/}
                                {/*    />*/}
                                {/*)}*/}

                                <div className="provider-card-content">
                                    <div className="provider-logo-container">
                                        <img
                                            src={provider.logo}
                                            alt={provider.name}
                                            className="provider-logo"
                                            style={{ filter: (!hasModel || isDisabled) ? 'grayscale(100%) opacity(0.3)' : 'none' }}
                                        />
                                    </div>

                                    <div className="provider-info">
                                        <h4 className="provider-name" style={{ color: provider.color }}>
                                            {provider.name}
                                        </h4>
                                        <p className="provider-description">
                                            {provider.description}
                                        </p>
                                    </div>

                                    {hasModel && (
                                        <div className="provider-model-name">
                                            <Tooltip title={t("modelNameTooltip") || "Название модели"}>
                                                <span className="model-name-text">
                                                    {modelData.name || (t("modelNoName") || "Без названия")}
                                                </span>
                                            </Tooltip>
                                        </div>
                                    )}

                                    <div className="provider-actions">
                                        {isDisabled ? (
                                            <Button
                                                type="default"
                                                block
                                                disabled
                                                style={{ opacity: 0.5 }}
                                            >
                                                {t("modelProviderDisabled") || "Провайдер отключен"}
                                            </Button>
                                        ) : !hasModel ? (
                                            <Button
                                                style={{ color : "var(--text-color)", borderColor: provider.color }}
                                                type="dashed"
                                                icon={<PlusOutlined />}
                                                block
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    !loading && onSelectProvider(provider.key);
                                                }}
                                                disabled={loading}
                                            >
                                                {t("modelCreateButton") || "Создать модель"}
                                            </Button>
                                        ) : isActive ? (
                                            <Button
                                                type="primary"
                                                icon={<CheckCircleOutlined />}
                                                block
                                                disabled
                                                style={{ backgroundColor: provider.color, borderColor: provider.color }}
                                            >
                                                {t("modelActiveButton") || "Активная модель"}
                                            </Button>
                                        ) : (
                                            <Button
                                                type="default"
                                                block
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSetActive(provider.key);
                                                }}
                                                disabled={loading || isActivating}
                                            >
                                                {t("modelActivateButton") || "Сделать активной"}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </Spin>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

