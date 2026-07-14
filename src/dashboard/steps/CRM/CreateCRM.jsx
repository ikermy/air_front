import React, { useState, useEffect, useRef } from 'react';
import { Badge, Button, Card, Empty, Modal, Switch, Typography, FloatButton, Tour } from 'antd';
import { ApiOutlined, DatabaseOutlined, QuestionCircleOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { AddCRM } from './AddCRM';
import { AmoCRMSection } from './sections/AmoCRMSection';
import {healthCheck, getCRMConfig, toggleCRMActive, deleteCRMConfig} from './crmUtils';
import {showErrorNotification, showNotification, showWarningNotification} from '../../hotification/showNotification';
import { getTourPanelState, setTourPanelState } from '../../../utils/cookieUtils';
import { useTranslation } from 'react-i18next';
import '../Channals/Chanels.css';
import '../Channals/ChannelsModern.css';
import '../Tour.css';

export function CreateCRM() {
    const { t } = useTranslation();

    // Refs для Tour targets
    const crmHeaderRef = useRef(null);
    const addCrmButtonRef = useRef(null);
    const crmListRef = useRef(null);
    const crmCardRef = useRef(null);
    const crmConfigRef = useRef(null);
    const crmOAuthRef = useRef(null);
    const crmTokenRef = useRef(null);

    const [availableCRMs, setAvailableCRMs] = useState([
        {
            key: "amoCRM",
            label: "amoCRM",
            icon: <DatabaseOutlined/>,
            isExpanded: false,
            isEnabled: false,
            configName: '',
            subdomain: '',
            clientId: '',
            clientSecret: '', // Используется только при создании, не загружается с сервера
            redirectUrl: '',
            expiresAt: null,
            createdAt: null,
            updatedAt: null
        }
    ]);
    const [selectedCRMs, setSelectedCRMs] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [crmToRemove, setCrmToRemove] = useState(null);

    // Tour states
    const [tourVisible, setTourVisible] = useState(false);
    const [current, setCurrent] = useState(0);
    const [tourPanelVisible, setTourPanelVisible] = useState(getTourPanelState('createcrm'));

    // Загрузка сохраненных конфигураций CRM при монтировании компонента
    useEffect(() => {
        const loadCRMConfigs = async () => {
            try {
                const configResult = await getCRMConfig('amoCRM');
                if (configResult.success && configResult.config) {
                    const { config } = configResult;
                    // Обрезаем суффикс /crm/oauth/amoCRM/callback из redirectUrl
                    const rawRedirectUrl = config.credentials?.redirect_url || '';
                    const cleanRedirectUrl = rawRedirectUrl.replace('/crm/oauth/amoCRM/callback', '');

                    setAvailableCRMs(prev => prev.filter(crm => crm.key !== 'amoCRM'));
                    setSelectedCRMs(prev => {
                        if (prev.find(crm => crm.key === 'amoCRM')) return prev;
                        return [...prev, {
                            key: "amoCRM",
                            label: "amoCRM",
                            icon: <DatabaseOutlined/>,
                            isExpanded: false,
                            isEnabled: config.isActive,
                            configName: config.name,
                            subdomain: config.subdomain,
                            clientId: config.credentials?.client_id || '',
                            clientSecret: '', // Не загружается с сервера из соображений безопасности
                            redirectUrl: cleanRedirectUrl,
                            expiresAt: config.credentials?.expires_at || null,
                            createdAt: config.createdAt,
                            updatedAt: config.updatedAt,
                            originalConfig: {
                                configName: config.name,
                                subdomain: config.subdomain,
                                clientId: config.credentials?.client_id || '',
                                redirectUrl: cleanRedirectUrl
                            }
                        }];
                    });
                } else {
                    console.log('Конфигурация amoCRM не найдена или ошибка:', configResult.error);
                }
            } catch (error) {
                console.error('Ошибка при загрузке конфигураций CRM:', error);
            }
        };
        loadCRMConfigs();
    }, []);

    const handleCRMSelect = async (crm) => {
        // Если выбирается amoCRM, сначала делаем healthCheck
        if (crm.key === 'amoCRM') {
            console.log('Начинаем healthCheck для amoCRM...');
            const result = await healthCheck();
            console.log('Результат healthCheck:', result);

            if (!result.ok) {
                console.log('Показываем ошибку, т.к. result.ok =', result.ok);
                showErrorNotification(
                    t("notifVerificationError") || 'Ошибка',
                    t("crmUnavailable") || 'Сервис CRM недоступен'
                );
                return; // Не добавляем CRM, если healthCheck не прошёл
            } else {
                console.log('HealthCheck успешен, статус:', result.status);
            }
        }

        setAvailableCRMs(prev => prev.filter(c => c.key !== crm.key));
        setSelectedCRMs(prev => [...prev, {...crm, isExpanded: true}]);
    };

    const handleToggleExpand = (key) => {
        setSelectedCRMs(prev =>
            prev.map(crm =>
                crm.key === key
                    ? {...crm, isExpanded: !crm.isExpanded}
                    : crm
            )
        );
    };

    const handleToggleSwitch = async (key) => {
         const crm = selectedCRMs.find(c => c.key === key);
         // Проверяем наличие реальной конфигурации (загруженной с сервера)
         const hasConfig = crm && crm.originalConfig;

        if (!hasConfig) {
            showWarningNotification(
                t("crmCannotEnable") || "Невозможно включить CRM",
                t("crmCannotEnableDesc") || "Сначала необходимо создать и сохранить конфигурацию CRM"
            );
            return;
        }

        const newEnabledState = !crm.isEnabled;

        try {
            // Вызываем API для изменения статуса на сервере
            const result = await toggleCRMActive( 'amoCRM', newEnabledState);

            if (result.success) {
                // Обновляем состояние локально только при успешном ответе
                setSelectedCRMs(prev =>
                    prev.map(c =>
                        c.key === key
                            ? {...c, isEnabled: newEnabledState}
                            : c
                    )
                );

                showNotification(
                    newEnabledState ? (t("crmEnabledNotif") || "CRM включена") : (t("crmDisabledNotif") || "CRM выключена"),
                    newEnabledState ? (t("crmEnabledDesc", {name: crm.label}) || `CRM система ${crm.label} включена`) : (t("crmDisabledDesc", {name: crm.label}) || `CRM система ${crm.label} выключена`)
                );

                console.log(`CRM ${key} ${newEnabledState ? 'включена' : 'выключена'}`);
            } else {
                showErrorNotification(
                    t("crmStatusChangeError") || "Ошибка изменения статуса",
                    result.error || (t("crmStatusChangeErrorDesc") || "Не удалось изменить статус CRM")
                );
            }
        } catch (error) {
            console.error('Ошибка при изменении статуса CRM:', error);
            showErrorNotification(t("error") || "Ошибка", t("crmStatusChangeErrorDesc") || "Произошла ошибка при изменении статуса");
        }
    };


    const handleConfirmRemove = async () => {
        const removedCRM = selectedCRMs.find(crm => crm.key === crmToRemove);

        if (removedCRM) {
            // Удаляем конфиг на сервере по типу CRM (key == crmType)
            const crmType = removedCRM.key; // для amoCRM это 'amoCRM'
            const result = await deleteCRMConfig(crmType);

            if (!result.success) {
                showErrorNotification('Ошибка удаления', result.error || 'Не удалось удалить конфигурацию CRM');
                return;
            }

            // Очищаем CRM локально и возвращаем в доступные
            const clearedCRM = {
                key: removedCRM.key,
                label: removedCRM.label,
                icon: removedCRM.icon,
                isExpanded: false,
                isEnabled: false,
                configName: '',
                subdomain: '',
                clientId: '',
                clientSecret: '',
                accessToken: null,
                expiresAt: null,
                createdAt: null,
                updatedAt: null
            };

            setAvailableCRMs(prev => [...prev, clearedCRM]);
            setSelectedCRMs(prev => prev.filter(crm => crm.key !== crmToRemove));
            showNotification(t("crmDeleted") || 'CRM удалена', t("crmDeletedDesc") || 'CRM конфигурация успешно удалена');
        }

        setIsModalVisible(false);
        setCrmToRemove(null);
    };

    const handleCancelRemove = () => {
        setIsModalVisible(false);
        setCrmToRemove(null);
    };

    // Функция для запуска тура
    const startTour = () => {
        setTourVisible(true);
        setCurrent(0);
        setTourPanelState('createcrm', false);
    };

    // Функция для показа панели Tour при клике на FloatButton
    const showTourPanel = () => {
        setTourPanelVisible(true);
        setTourPanelState('createcrm', true);
    };

    // Функция для скрытия панели Tour
    const hideTourPanel = () => {
        setTourPanelVisible(false);
        setTourPanelState('createcrm', false);
    };

    // Шаги Tour для CreateCRM
    const steps = [
        {
            title: t("crmTourWelcome") || '🔗 Добро пожаловать в CRM интеграции',
            description: t("crmTourWelcomeDesc") || 'Этот модуль позволяет интегрировать различные CRM системы с вашим сервисом для автоматизации работы с клиентами. Давайте рассмотрим основные возможности!',
            target: () => (crmHeaderRef.current instanceof HTMLElement ? crmHeaderRef.current : null),
        },
        {
            title: t("crmTourAdd") || '➕ Добавление CRM системы',
            description: t("crmTourAddDesc") || 'Нажмите здесь, чтобы добавить новую CRM систему. Вы можете подключить amoCRM и другие популярные CRM платформы для синхронизации данных о клиентах.',
            target: () => (addCrmButtonRef.current instanceof HTMLElement ? addCrmButtonRef.current : null),
        },
        {
            title: t("crmTourList") || '📋 Список настроенных CRM',
            description: t("crmTourListDesc") || 'Здесь отображаются все подключенные CRM системы. Вы можете управлять каждой из них: включать/выключать, редактировать настройки или удалять.',
            target: () => (crmListRef.current instanceof HTMLElement ? crmListRef.current : null),
        },
        {
            title: t("crmTourConfig") || '⚙️ Настройка amoCRM',
            description: t("crmTourConfigDesc") || 'При настройке amoCRM вам потребуется указать: название конфигурации, поддомен вашего аккаунта, Client ID и Client Secret из интеграции. После сохранения выполните OAuth авторизацию.',
            target: () => (crmConfigRef.current instanceof HTMLElement ? crmConfigRef.current : null),
            expandCRM: true,
        },
        {
            title: t("crmTourOAuth") || '🔐 OAuth авторизация',
            description: t("crmTourOAuthDesc") || 'После сохранения базовых настроек используйте кнопку "Авторизовать через OAuth" для получения токена доступа. Это необходимо для работы с API amoCRM.',
            target: () => (crmOAuthRef.current instanceof HTMLElement ? crmOAuthRef.current : null),
            expandCRM: true,
        },
        {
            title: t("crmTourToken") || '🔄 Управление токенами',
            description: t("crmTourTokenDesc") || 'Токены доступа имеют ограниченный срок действия. Модуль автоматически обновляет токены, но вы также можете обновить их вручную через кнопку "Тестировать соединение".',
            target: () => (crmTokenRef.current instanceof HTMLElement ? crmTokenRef.current : null),
            expandCRM: true,
        },
        {
            title: t("crmTourReady") || '✅ Готово к работе!',
            description: t("crmTourReadyDesc") || 'Теперь вы знаете, как настроить интеграцию с CRM системами. После настройки ваши лиды и контакты будут автоматически синхронизироваться с выбранной CRM!',
            target: () => (crmHeaderRef.current instanceof HTMLElement ? crmHeaderRef.current : null),
        },
    ];

    return (
        <>
            <div className="create-model-container">
                <div className="section-title" ref={crmHeaderRef}>
                    <ApiOutlined/>
                    {t("crmTitle") || "CRM Системы"}
                </div>
                <div className="section-description">
                    {t("crmDescription") || "Настройте интеграцию с CRM системами для автоматизации работы с клиентами"}
                </div>

                <div className="tour-layout">
                    <div className="tour-content">
                        {availableCRMs.length > 0 && (
                            <div style={{marginBottom: 16, marginTop: '16px'}} ref={addCrmButtonRef}>
                                <AddCRM
                                    availableCRMs={availableCRMs}
                                    onCRMSelect={handleCRMSelect}
                                />
                            </div>
                        )}

                        <Typography.Title level={3} style={{ marginTop: 24 }} ref={crmListRef}>
                            {t("crmConfiguredSystems") || "Настроенные CRM системы"}
                        </Typography.Title>
                        <Typography.Text type="secondary">
                            {t("crmTotalSystems") || "Всего систем:"} {selectedCRMs.length}
                        </Typography.Text>

                        {selectedCRMs.length === 0 && (
                            <Empty
                                description={t("crmNoSystems") || "Нет настроенных CRM систем"}
                                style={{marginTop: '24px'}}
                            />
                        )}

                        {selectedCRMs.map((crm) => {
                                    // Конфигурация существует только если есть originalConfig (загружена с сервера)
                                    const hasConfig = Boolean(crm.originalConfig);
                                    const latestDate = crm.updatedAt || crm.createdAt;
                                    const dateLabel = crm.updatedAt ? (t("crmUpdated") || 'Обновлено') : (t("crmCreated") || 'Создано');
                                    return (
                                        <div key={crm.key} className="channel-list-item" ref={crm.key === 'amoCRM' ? crmCardRef : null}>
                                            {crm.isExpanded ? (
                                                <Card className="channel-card-modern">
                                                    <div
                                                        className="channel-card-header-modern"
                                                        onClick={() => handleToggleExpand(crm.key)}
                                                        style={{ cursor: 'pointer' }}
                                                    >
                                                        <div className="channel-info-modern">
                                                            <div
                                                                className={`channel-icon-modern ${crm.isEnabled ? 'enabled' : ''}`}>
                                                                {crm.icon}
                                                            </div>
                                                            <div>
                                                                <Typography.Title level={5} className="channel-title-modern">
                                                                    {crm.label}
                                                                </Typography.Title>
                                                                {latestDate && (
                                                                    <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                                                                        {dateLabel}: {new Date(latestDate).toLocaleString('ru-RU')}
                                                                    </Typography.Text>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="channel-header-actions-modern">
                                                            <div
                                                                className="channel-status-switch-modern"
                                                                onMouseDown={(e) => e.stopPropagation()}
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <Typography.Text
                                                                    style={{marginRight: 8}}>{t("crmStatus") || "Статус:"}</Typography.Text>
                                                                <Switch
                                                                    checked={crm.isEnabled && hasConfig}
                                                                    onChange={() => handleToggleSwitch(crm.key)}
                                                                    disabled={!hasConfig}
                                                                    checkedChildren={<span
                                                                        style={{color: "black"}}>{t("crmEnabled") || "Включен"}</span>}
                                                                    unCheckedChildren={<span
                                                                        style={{color: "black"}}>{t("crmDisabled") || "Выключен"}</span>}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="channel-card-content-modern">
                                                        {crm.key === "amoCRM" && (
                                                            <AmoCRMSection
                                                                channel={crm}
                                                                setSelectedChannels={setSelectedCRMs}
                                                                configRef={crmConfigRef}
                                                                oauthRef={crmOAuthRef}
                                                                tokenRef={crmTokenRef}
                                                            />
                                                        )}
                                                    </div>
                                                </Card>
                                            ) : (
                                                <div
                                                    className="channel-list-item-content"
                                                    onClick={() => handleToggleExpand(crm.key)}
                                                >
                                                    <div className="list-item-left-modern">
                                                        <div className={`list-channel-icon ${crm.isEnabled ? 'enabled' : ''}`}>
                                                            {crm.icon}
                                                        </div>
                                                        <div className="list-item-info-modern">
                                                            <div className="list-item-header-modern">
                                                                <Typography.Text strong>{crm.label}</Typography.Text>
                                                            </div>
                                                            <Typography.Text type="secondary">
                                                                {hasConfig ? (t("crmConfigured") || 'Настроен и готов к использованию') : (t("crmNeedsSetup") || 'Требует настройки')}
                                                            </Typography.Text>
                                                        </div>
                                                    </div>
                                                    <div className="list-item-right-modern">
                                                        <Badge
                                                            status={crm.isEnabled && hasConfig ? "success" : "default"}
                                                            text={crm.isEnabled && hasConfig ? (t("crmActive") || "Активна") : (t("crmInactive") || "Неактивна")}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                    </div>

                    {/* Панель управления Tour справа */}
                    {tourPanelVisible && (
                    <div className="tour-controls tour-primary">
                        <div className="tour-controls-header">
                            <PlayCircleOutlined className="tour-controls-icon" />
                            <h3 className="tour-controls-title">
                                {t("crmTourTitle") || "Интерактивный обзор"}
                            </h3>
                            <p className="tour-controls-subtitle">
                                {t("crmTourSubtitle") || "Изучите возможности CRM интеграций"}
                            </p>
                        </div>

                        <div className="tour-start-button">
                            <Button
                                type="primary"
                                block
                                size="large"
                                onClick={startTour}
                            >
                                {t("crmTourStart") || "🚀 Начать тур"}
                            </Button>
                        </div>

                        {tourVisible && (
                            <div className="tour-progress">
                                <div className="tour-progress-step">
                                    <span className="tour-progress-step-text">
                                        {t("crmTourStep") || "Шаг"} {current + 1} {t("crmTourOf") || "из"} {steps.length}
                                    </span>
                                </div>
                                <div className="tour-progress-bar">
                                    <div
                                        className="tour-progress-fill"
                                        style={{width: `${((current + 1) / steps.length) * 100}%`}}
                                    />
                                </div>
                                <div className="tour-progress-title">
                                    {steps[current]?.title}
                                </div>
                            </div>
                        )}

                        <div className="tour-info">
                            <div className="tour-info-title">{t("crmTourWhatYouLearn") || "📋 Что вы изучите:"}</div>
                            <ul className="tour-info-list">
                                <li>{t("crmTourLearn1") || "Добавление CRM систем"}</li>
                                <li>{t("crmTourLearn2") || "Настройку amoCRM"}</li>
                                <li>{t("crmTourLearn3") || "OAuth авторизацию"}</li>
                                <li>{t("crmTourLearn4") || "Управление токенами"}</li>
                                <li>{t("crmTourLearn5") || "Активацию/деактивацию CRM"}</li>
                                <li>{t("crmTourLearn6") || "Удаление конфигураций"}</li>
                            </ul>
                        </div>
                    </div>
                )}
                </div>

                <Modal
                title={t("crmDeleteTitle") || "Подтверждение удаления"}
                open={isModalVisible}
                onOk={handleConfirmRemove}
                onCancel={handleCancelRemove}
                okText={t("delete") || "Удалить"}
                cancelText={t("cancel") || "Отмена"}
                okButtonProps={{danger: true}}
            >
                <p>{t("crmDeleteConfirm") || "Вы уверены, что хотите удалить эту CRM систему?"}</p>
            </Modal>

            <FloatButton
                icon={<QuestionCircleOutlined />}
                tooltip={t("tourFloatButtonTooltip") || "Начать обзор интерфейса"}
                className="tour-float-button"
                onClick={showTourPanel}
            />

            <Tour
                open={tourVisible}
                onClose={() => {
                    setTourVisible(false);
                    setCurrent(0);
                    hideTourPanel();
                }}
                steps={steps}
                current={current}
                onChange={(next) => {
                    setCurrent(next);
                    // Автоматически раскрываем CRM карточку при переходе на шаги с expandCRM
                    if (steps[next]?.expandCRM && selectedCRMs.length > 0) {
                        const amoCRM = selectedCRMs.find(crm => crm.key === 'amoCRM');
                        if (amoCRM && !amoCRM.isExpanded) {
                            handleToggleExpand('amoCRM');
                        }
                    }
                }}
                indicatorsRender={(current, total) => (
                    <span className="tour-indicator">
                        {current + 1} / {total}
                    </span>
                )}
                type="primary"
                arrow={false}
            />
            </div>
        </>
    );
}






