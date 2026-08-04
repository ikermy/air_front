import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Spin, Tooltip, Alert } from 'antd';
import { CheckCircleOutlined, PlusOutlined, RocketOutlined, KeyOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { fetchProvidersAvailability } from './providersUtils';
import { showErrorNotification } from '../../hotification/showNotification';
import { AI_PROVIDERS } from './providersConfig';

const PROVIDERS = AI_PROVIDERS;

export const ModelSelector = ({
    allModelsData,
    activeProvider,
    selectedProvider,
    onSelectProvider,
    onSetActive,
    loading,
    hasUnsavedChanges = false,
    setSelectedMenu
}) => {
    const { t } = useTranslation();
    const [activatingProvider, setActivatingProvider] = useState(null);
    const [availableProviders, setAvailableProviders] = useState(null);
    const [unavailableProviders, setUnavailableProviders] = useState([]);
    const [providersLoading, setProvidersLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        const loadProviders = async () => {
            setProvidersLoading(true);

            const result = await fetchProvidersAvailability();

            if (cancelled) return;

            if (result.success && result.data) {
                setAvailableProviders(result.data.available || []);
                setUnavailableProviders(result.data.unavailable || []);
            } else {
                setAvailableProviders([]);
                setUnavailableProviders([]);
                showErrorNotification(
                    t("modelProvidersLoadError") || "Ошибка загрузки провайдеров",
                    result.error || t("modelProvidersLoadErrorDesc") || "Не удалось получить список доступных провайдеров"
                );
            }
            setProvidersLoading(false);
        };

        void loadProviders();

        return () => {
            cancelled = true;
        };
    }, [t]);

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

    const visibleProviders = availableProviders === null
        ? PROVIDERS
        : PROVIDERS.filter(p => availableProviders.includes(p.key));

    const unavailableProviderObjects = PROVIDERS.filter(p => unavailableProviders.includes(p.key));

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

            <Spin spinning={providersLoading}>
                <div className="model-selector-grid">
                    {visibleProviders.map((provider) => {
                        const providerLogo = typeof provider.logo === 'string'
                            ? provider.logo
                            : provider.logo?.src;
                        const modelData = allModelsData?.[provider.key];
                        const isActive = activeProvider === provider.key;
                        const isSelected = selectedProvider === provider.key;
                        const hasModel = !!modelData;
                        const isActivating = activatingProvider === provider.key;
                        const isDisabled = provider.disabled;

                        return (
                            <Card
                                key={provider.key}
                                className={`provider-card ${provider.key} ${isSelected ? 'selected' : ''} ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
                                style={{
                                    borderColor: isSelected ? provider.color : undefined,
                                    opacity: (loading && !isActivating) || isDisabled ? 0.6 : 1
                                }}
                                hoverable={!loading && !isDisabled}
                                onClick={() => !isDisabled && hasModel && !loading && onSelectProvider(provider.key)}
                            >
                                <Spin spinning={isActivating} description={t("modelActivating") || "Активация..."}>
                                    {!isDisabled && isSelected && hasUnsavedChanges && (
                                        <Badge.Ribbon
                                            text={t("modelUnsaved") || "Не сохранено"}
                                            color="orange"
                                            className="unsaved-ribbon"
                                        />
                                    )}

                                    <div className="provider-card-content">
                                        <div className="provider-logo-container">
                                            <img
                                                src={providerLogo}
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
                                                <Button type="default" block disabled style={{ opacity: 0.5 }}>
                                                    {t("modelProviderDisabled") || "Провайдер отключен"}
                                                </Button>
                                            ) : !hasModel ? (
                                                <Button
                                                    style={{ color: "var(--text-color)", borderColor: provider.color }}
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

                {unavailableProviderObjects.length > 0 && (
                    <div className="unavailable-providers-section">
                        <Alert
                            type="warning"
                            icon={<KeyOutlined />}
                            showIcon
                            message={
                                <span>
                                    {t("modelUnavailableProviders") || "Провайдеры без API-ключа"}&nbsp;—&nbsp;
                                    <strong>{unavailableProviderObjects.map(p => p.name).join(', ')}</strong>.&nbsp;
                                    {t("modelSetApiKeyHint") || "Для их использования необходимо"}&nbsp;
                                    {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                                    <a onClick={() => setSelectedMenu('user')} style={{ cursor: 'pointer' }}>
                                        {t("modelSetApiKeyLink") || "установить API Key"}
                                    </a>
                                </span>
                            }
                        />
                    </div>
                )}
            </Spin>
        </div>
    );
};

