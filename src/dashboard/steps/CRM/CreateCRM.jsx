import React, { useState, useEffect, useRef } from 'react';
import { Badge, Button, Card, Empty, Modal, Switch, Typography, FloatButton, Tour } from 'antd';
import { ApiOutlined, DatabaseOutlined, QuestionCircleOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { AddCRM } from './AddCRM';
import { AmoCRMSection } from './sections/AmoCRMSection';
import {healthCheck, getCRMConfig, toggleCRMActive, deleteCRMConfig} from './crmUtils';
import {showErrorNotification, showNotification, showWarningNotification} from '../../hotification/showNotification';
import {validateAndRefreshToken} from '../../../utils/easyUtils';
import {getTourPanelState, setTourPanelState} from '../../../utils/cookieUtils';
import '../Channals/Chanels.css';
import '../Channals/ChannelsModern.css';
import '../Tour.css';

export function CreateCRM() {
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
            key: "amocrm",
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
                const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
                if (!token) {
                    console.log('Нет токена авторизации');
                    return;
                }
                const configResult = await getCRMConfig(token, 'amocrm');
                if (configResult.success && configResult.config) {
                    const { config } = configResult;
                    setAvailableCRMs(prev => prev.filter(crm => crm.key !== 'amocrm'));
                    setSelectedCRMs(prev => {
                        if (prev.find(crm => crm.key === 'amocrm')) return prev;
                        return [...prev, {
                            key: "amocrm",
                            label: "amoCRM",
                            icon: <DatabaseOutlined/>,
                            isExpanded: false,
                            isEnabled: config.isActive,
                            configName: config.name,
                            subdomain: config.subdomain,
                            clientId: config.credentials?.client_id || '',
                            clientSecret: '', // Не загружается с сервера из соображений безопасности
                            redirectUrl: config.credentials?.redirect_url || '',
                            expiresAt: config.credentials?.expires_at || null,
                            createdAt: config.createdAt,
                            updatedAt: config.updatedAt,
                            originalConfig: {
                                configName: config.name,
                                subdomain: config.subdomain,
                                clientId: config.credentials?.client_id || '',
                                redirectUrl: config.credentials?.redirect_url || ''
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
        if (crm.key === 'amocrm') {
            console.log('Начинаем healthCheck для amoCRM...');
            const result = await healthCheck();
            console.log('Результат healthCheck:', result);

            if (!result.ok) {
                console.log('Показываем ошибку, т.к. result.ok =', result.ok);
                showErrorNotification(
                    'Ошибка подключения к CRM',
                    `Не удалось подключиться к сервису amoCRM. Статус: ${result.status || 'неизвестен'}`
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
        // Проверяем наличие реальной конфигурации по configName или subdomain
        const hasConfig = crm && (crm.configName || crm.subdomain);

        if (!hasConfig) {
            showWarningNotification(
                "Невозможно включить CRM",
                "Сначала необходимо создать и сохранить конфигурацию CRM"
            );
            return;
        }

        const newEnabledState = !crm.isEnabled;

        try {
            const token = await validateAndRefreshToken(localStorage.getItem("authToken"));

            if (!token) {
                showWarningNotification("Ошибка авторизации", "Необходимо повторно авторизоваться!");
                return;
            }

            // Вызываем API для изменения статуса на сервере
            const result = await toggleCRMActive(token, 'amocrm', newEnabledState);

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
                    newEnabledState ? "CRM включена" : "CRM выключена",
                    `CRM система ${crm.label} ${newEnabledState ? 'включена' : 'выключена'}`
                );

                console.log(`CRM ${key} ${newEnabledState ? 'включена' : 'выключена'}`);
            } else {
                showErrorNotification(
                    "Ошибка изменения статуса",
                    result.error || "Не удалось изменить статус CRM"
                );
            }
        } catch (error) {
            console.error('Ошибка при изменении статуса CRM:', error);
            showErrorNotification("Ошибка", "Произошла ошибка при изменении статуса");
        }
    };

    const handleSaveCRM = async (crm) => {
        try {
            const token = await validateAndRefreshToken(localStorage.getItem("authToken"));

            if (!token) {
                showWarningNotification("Ошибка авторизации", "Необходимо повторно авторизоваться!");
                return;
            }

            // Сохраняем только базовую конфигурацию БЕЗ авторизации
            // Авторизация теперь происходит через кнопки внутри AmoCRMSection
            const configData = {
                name: crm.configName || `${crm.label} Config`,
                subdomain: crm.subdomain,
                clientId: crm.clientId,
                clientSecret: crm.clientSecret
            };

            const response = await fetch(`${(window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND) || process.env.REACT_APP_LAND}/crm/api/configs/amocrm`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: configData.name,
                    subdomain: configData.subdomain,
                    credentials: {
                        client_id: configData.clientId,
                        client_secret: configData.clientSecret
                    },
                    is_active: false
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                showErrorNotification("Ошибка", errorData.error || "Не удалось сохранить конфигурацию");
                return;
            }

            const result = await response.json();

            // Обновляем состояние CRM с сохраненными данными
            setSelectedCRMs(prev => prev.map(c => c.key === crm.key ? {
                ...c,
                configName: configData.name,
                subdomain: configData.subdomain,
                clientId: configData.clientId,
                clientSecret: configData.clientSecret,
                createdAt: result.created_at || c.createdAt,
                updatedAt: result.updated_at || new Date().toISOString(),
                originalConfig: {
                    configName: configData.name,
                    subdomain: configData.subdomain,
                    clientId: configData.clientId,
                    clientSecret: configData.clientSecret
                }
            } : c));

            showNotification(
                "Конфигурация сохранена",
                "Базовые настройки CRM сохранены. Для завершения подключения выполните авторизацию."
            );

        } catch (error) {
            console.error('Ошибка при сохранении CRM:', error);
            showErrorNotification("Ошибка", "Произошла ошибка при сохранении");
        }
    };

    const handleRemoveCRM = (key) => {
        setCrmToRemove(key);
        setIsModalVisible(true);
    };

    const handleConfirmRemove = async () => {
        const removedCRM = selectedCRMs.find(crm => crm.key === crmToRemove);

        if (removedCRM) {
            // Получаем токен
            const token = await validateAndRefreshToken(localStorage.getItem('authToken'));
            if (!token) {
                showWarningNotification('Ошибка авторизации', 'Необходимо повторно авторизоваться!');
                return;
            }

            // Удаляем конфиг на сервере по типу CRM (key == crmType)
            const crmType = removedCRM.key; // для amoCRM это 'amocrm'
            const result = await deleteCRMConfig(token, crmType);

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
            showNotification('CRM удалена', 'CRM конфигурация успешно удалена');
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
            title: '🔗 Добро пожаловать в CRM интеграции',
            description: 'Этот модуль позволяет интегрировать различные CRM системы с вашим сервисом для автоматизации работы с клиентами. Давайте рассмотрим основные возможности!',
            target: () => (crmHeaderRef.current instanceof HTMLElement ? crmHeaderRef.current : null),
        },
        {
            title: '➕ Добавление CRM системы',
            description: 'Нажмите здесь, чтобы добавить новую CRM систему. Вы можете подключить amoCRM и другие популярные CRM платформы для синхронизации данных о клиентах.',
            target: () => (addCrmButtonRef.current instanceof HTMLElement ? addCrmButtonRef.current : null),
        },
        {
            title: '📋 Список настроенных CRM',
            description: 'Здесь отображаются все подключенные CRM системы. Вы можете управлять каждой из них: включать/выключать, редактировать настройки или удалять.',
            target: () => (crmListRef.current instanceof HTMLElement ? crmListRef.current : null),
        },
        {
            title: '⚙️ Настройка amoCRM',
            description: 'При настройке amoCRM вам потребуется указать: название конфигурации, поддомен вашего аккаунта, Client ID и Client Secret из интеграции. После сохранения выполните OAuth авторизацию.',
            target: () => (crmConfigRef.current instanceof HTMLElement ? crmConfigRef.current : null),
            expandCRM: true, // Флаг для автоматического раскрытия карточки
        },
        {
            title: '🔐 OAuth авторизация',
            description: 'После сохранения базовых настроек используйте кнопку "Авторизовать через OAuth" для получения токена доступа. Это необходимо для работы с API amoCRM.',
            target: () => (crmOAuthRef.current instanceof HTMLElement ? crmOAuthRef.current : null),
            expandCRM: true,
        },
        {
            title: '🔄 Управление токенами',
            description: 'Токены доступа имеют ограниченный срок действия. Модуль автоматически обновляет токены, но вы также можете обновить их вручную через кнопку "Тестировать соединение".',
            target: () => (crmTokenRef.current instanceof HTMLElement ? crmTokenRef.current : null),
            expandCRM: true,
        },
        {
            title: '✅ Готово к работе!',
            description: 'Теперь вы знаете, как настроить интеграцию с CRM системами. После настройки ваши лиды и контакты будут автоматически синхронизироваться с выбранной CRM!',
            target: () => (crmHeaderRef.current instanceof HTMLElement ? crmHeaderRef.current : null),
        },
    ];

    return (
        <div className="create-model-container">
            <div className="section-title" ref={crmHeaderRef}>
                <ApiOutlined/>
                CRM Системы
            </div>
            <div className="section-description">
                Настройте интеграцию с CRM системами для автоматизации работы с клиентами
            </div>

            <div className="tour-layout">
                <div className="tour-content">
                    <div className="channels-modern">
                        {availableCRMs.length > 0 && (
                            <div style={{marginTop: '16px'}} ref={addCrmButtonRef}>
                                <AddCRM
                                    availableCRMs={availableCRMs}
                                    onCRMSelect={handleCRMSelect}
                                />
                            </div>
                        )}

                        <div className="channels-list-header" ref={crmListRef}>
                            <div className="header-left">
                                <Typography.Title level={3}>
                                    Настроенные CRM системы
                                </Typography.Title>
                                <Typography.Text type="secondary">
                                    Всего систем: {selectedCRMs.length}
                                </Typography.Text>
                            </div>
                        </div>

                {selectedCRMs.length > 0 ? (
                    <div className="channels-list-view">
                        {selectedCRMs.map((crm) => {
                            const hasConfig = Boolean(crm.configName || crm.subdomain);
                            const latestDate = crm.updatedAt || crm.createdAt;
                            const dateLabel = crm.updatedAt ? 'Обновлено' : 'Создано';
                            const original = crm.originalConfig || {};
                            const requiredFilled = crm.configName && crm.subdomain && crm.clientId && crm.clientSecret;
                            const hasChanges = hasConfig && (
                                crm.configName !== original.configName ||
                                crm.subdomain !== original.subdomain ||
                                crm.clientId !== original.clientId ||
                                crm.clientSecret !== original.clientSecret
                            );
                            return (
                                <div key={crm.key} className="channel-list-item" ref={crm.key === 'amocrm' ? crmCardRef : null}>
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
                                                            style={{marginRight: 8}}>Статус:</Typography.Text>
                                                        <Switch
                                                            checked={crm.isEnabled && hasConfig}
                                                            onChange={() => handleToggleSwitch(crm.key)}
                                                            disabled={!hasConfig}
                                                            checkedChildren={<span
                                                                style={{color: "black"}}>Включен</span>}
                                                            unCheckedChildren={<span
                                                                style={{color: "black"}}>Выключен</span>}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="channel-card-content-modern">
                                                {crm.key === "amocrm" && (
                                                    <AmoCRMSection
                                                        channel={crm}
                                                        setSelectedChannels={setSelectedCRMs}
                                                        configRef={crmConfigRef}
                                                        oauthRef={crmOAuthRef}
                                                        tokenRef={crmTokenRef}
                                                    />
                                                )}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f0f0f0' }}>
                                                    <Button
                                                        type="primary"
                                                        onClick={() => handleSaveCRM(crm)}
                                                        disabled={
                                                            !hasConfig
                                                                ? !requiredFilled // режим создания
                                                                : (!requiredFilled || !hasChanges) // режим обновления
                                                        }
                                                        style={{ color: "black" }}
                                                    >
                                                        {hasConfig ? 'Обновить конфигурацию' : 'Сохранить конфигурацию'}
                                                    </Button>
                                                    <Button
                                                        type="primary"
                                                        danger
                                                        onClick={() => handleRemoveCRM(crm.key)}
                                                        disabled={!hasConfig}
                                                    >
                                                        Удалить CRM
                                                    </Button>
                                                </div>
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
                                                        {hasConfig ? 'Настроен и готов к использованию' : 'Требует настройки'}
                                                    </Typography.Text>
                                                </div>
                                            </div>
                                            <div className="list-item-right-modern">
                                                <Badge
                                                    status={crm.isEnabled && hasConfig ? "success" : "default"}
                                                    text={crm.isEnabled && hasConfig ? "Активна" : "Неактивна"}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <Empty
                        description="Нет настроенных CRM систем"
                        style={{marginTop: '24px'}}
                    />
                )}
                    </div>
                </div>

                {/* Панель управления Tour справа */}
                {tourPanelVisible && (
                    <div className="tour-controls tour-primary">
                        <div className="tour-controls-header">
                            <PlayCircleOutlined className="tour-controls-icon" />
                            <h3 className="tour-controls-title">
                                Интерактивный обзор
                            </h3>
                            <p className="tour-controls-subtitle">
                                Изучите возможности CRM интеграций
                            </p>
                        </div>

                        <div className="tour-start-button">
                            <Button
                                type="primary"
                                block
                                size="large"
                                onClick={startTour}
                            >
                                🚀 Начать тур
                            </Button>
                        </div>

                        {tourVisible && (
                            <div className="tour-progress">
                                <div className="tour-progress-step">
                                    <span className="tour-progress-step-text">
                                        Шаг {current + 1} из {steps.length}
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
                            <div className="tour-info-title">📋 Что вы изучите:</div>
                            <ul className="tour-info-list">
                                <li>Добавление CRM систем</li>
                                <li>Настройку amoCRM</li>
                                <li>OAuth авторизацию</li>
                                <li>Управление токенами</li>
                                <li>Активацию/деактивацию CRM</li>
                                <li>Удаление конфигураций</li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>

            <Modal
                title="Подтверждение удаления"
                open={isModalVisible}
                onOk={handleConfirmRemove}
                onCancel={handleCancelRemove}
                okText="Удалить"
                cancelText="Отмена"
                okButtonProps={{danger: true}}
            >
                <p>Вы уверены, что хотите удалить эту CRM систему?</p>
            </Modal>

            <FloatButton
                icon={<QuestionCircleOutlined />}
                tooltip="Начать обзор интерфейса"
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
                        const amoCRM = selectedCRMs.find(crm => crm.key === 'amocrm');
                        if (amoCRM && !amoCRM.isExpanded) {
                            handleToggleExpand('amocrm');
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
    );
}