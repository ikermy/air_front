/**
 * Компонент для настройки интеграции с AmoCRM
 *
 * Функциональность:
 * 1. Ввод базовых данных: Subdomain, Client ID, Client Secret
 * 2. OAuth авторизация через AmoCRM (открывает popup окно)
 * 3. Отображение статуса авторизации и срока действия токена
 *
 * Процесс OAuth авторизации:
 * - Шаг 1: Сохранение конфигурации на сервере
 * - Шаг 2: Получение auth URL от сервера
 * - Шаг 3: Открытие popup окна AmoCRM для авторизации
 * - Шаг 4: Обмен кода авторизации на access/refresh токены
 */
import React, {useState, useEffect, useRef} from 'react';
import {Input, Typography, Button, Space, Alert, Tooltip, Modal, Descriptions, Radio, Card, Switch, Tag} from 'antd';
import {CheckCircleOutlined, ApiOutlined, CloudServerOutlined, SettingOutlined} from '@ant-design/icons';
import {validateAndRefreshToken} from '../../../../utils/easyUtils';
import {showNotification, showErrorNotification, showWarningNotification} from '../../../hotification/showNotification';
import {
    testAmoCRMConnection,
    authorizeAmoCRM,
    isAmoCRMAuthorized,
    getAmoCRMCustomFields,
    saveAmoCRMSourceField,
    getAmoCRMCustomFieldsMetadata,
    createAmoCRMCustomField
} from '../crmUtils';
// добавляем импорт методов для воронок
import {
    getAmoCRMPipelines,
    saveAmoCRMDefaultPipeline,
    getCRMChannelSettings,
    saveCRMChannelSettings
} from '../crmUtils';

const {Text} = Typography;

export const AmoCRMSection = ({
                                  channel,
                                  setSelectedChannels,
                                  configRef,
                                  oauthRef,
                                  tokenRef
                              }) => {
    const [isAuthLoading, setIsAuthLoading] = useState(false);
    const [isAccountInfoModalOpen, setIsAccountInfoModalOpen] = useState(false);
    const [accountInfo, setAccountInfo] = useState(null);
    const [isCustomFieldsModalOpen, setIsCustomFieldsModalOpen] = useState(false);
    const [customFields, setCustomFields] = useState([]);
    const [isLoadingCustomFields, setIsLoadingCustomFields] = useState(false);
    const [selectedSourceField, setSelectedSourceField] = useState(null);
    // состояния для модального окна метаданных кастомных полей
    const [isMetadataModalOpen, setIsMetadataModalOpen] = useState(false);
    const [metadataFields, setMetadataFields] = useState([]);
    const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
    const [newFieldName, setNewFieldName] = useState('');
    const [isSavingNewField, setIsSavingNewField] = useState(false);
    const [selectedTelegramField, setSelectedTelegramField] = useState(null);
    const [selectedInstagramField, setSelectedInstagramField] = useState(null);
    const [selectedWidgetField, setSelectedWidgetField] = useState(null);
    const [isSelectFieldModalOpen, setIsSelectFieldModalOpen] = useState(false);
    const [currentSelectingField, setCurrentSelectingField] = useState(null);
    // состояния для работы с воронками
    const [isPipelinesModalOpen, setIsPipelinesModalOpen] = useState(false);
    const [pipelines, setPipelines] = useState([]);
    const [isLoadingPipelines, setIsLoadingPipelines] = useState(false);
    const [selectedPipelineId, setSelectedPipelineId] = useState(null);
    const [selectedStatusId, setSelectedStatusId] = useState(null);
    const savePipelineLockRef = useRef(false);
    // состояния для настроек каналов
    const [isChannelSettingsModalOpen, setIsChannelSettingsModalOpen] = useState(false);
    const [isLoadingChannelSettings, setIsLoadingChannelSettings] = useState(false);
    const [isSavingChannelSettings, setIsSavingChannelSettings] = useState(false);
    const [channelSettings, setChannelSettings] = useState({
        Assist: '',
        User: '',
        Meta: '',
        Voice: '',
        File: '',
        LeadName: '',
        Tags: [],
        CreateNewContact: false,
        CreateNewLead: false,
        ChatMessages: false,
        MetaExist: false,
        AltContact: false
    });
    const [tagInput, setTagInput] = useState('');

    // Устанавливаем значение по умолчанию для redirectUrl при первом рендере
    useEffect(() => {
        if (!channel.redirectUrl) {
            handleInputChange('redirectUrl', 'https://info-bot.online');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleInputChange = (field, value) => {
        setSelectedChannels(prevChannels =>
            prevChannels.map(ch =>
                ch.key === channel.key
                    ? {...ch, [field]: value}
                    : ch
            )
        );
    };

    // Проверка наличия всех необходимых данных для авторизации
    const canAuthorize = channel.configName && channel.subdomain && channel.clientId && channel.clientSecret && channel.redirectUrl;

    // Проверка наличия токена (авторизован ли)
    const isAuthorized = channel.isEnabled;

    // Проверка истечения токена
    const isTokenExpired = channel.expiresAt && new Date(channel.expiresAt * 1000) < new Date();

    /**
     * Загрузка кастомных полей AmoCRM
     */
    const handleLoadCustomFields = async () => {
        try {
            setIsLoadingCustomFields(true);
            const token = await validateAndRefreshToken();
            if (!token) {
                showErrorNotification('Ошибка авторизации', 'Необходимо войти в систему');
                return;
            }

            const result = await getAmoCRMCustomFields(token, 'amocrm');
            if (result.success) {
                setCustomFields(result.custom_fields || []);
                // Восстанавливаем выбранное поле из конфигурации
                if (channel.sourceFieldId) {
                    setSelectedSourceField(channel.sourceFieldId);
                }
                setIsCustomFieldsModalOpen(true);
                showNotification('Успешно', `Загружено полей: ${result.custom_fields?.length || 0}`);
            } else {
                showErrorNotification('Ошибка загрузки', result.error || 'Не удалось загрузить кастомные поля');
            }
        } catch (e) {
            showErrorNotification('Ошибка', e.message);
        } finally {
            setIsLoadingCustomFields(false);
        }
    };

    /**
     * Загрузка метаданных кастомных полей контактов AmoCRM
     */
    const handleLoadMetadataFields = async () => {
        try {
            setIsLoadingMetadata(true);
            const token = await validateAndRefreshToken();
            if (!token) {
                showErrorNotification('Ошибка авторизации', 'Необходимо войти в систему');
                return;
            }

            // Загружаем метаданные полей
            const result = await getAmoCRMCustomFieldsMetadata(token, 'amocrm');
            if (!result.success) {
                showErrorNotification('Ошибка загрузки', result.error || 'Не удалось загрузить метаданные полей');
                return;
            }

            setMetadataFields(result.custom_fields || []);

            // Добавляю небольшую задержку для избежания блокировки от сервера
            await new Promise(resolve => setTimeout(resolve, 500));

            // Загружаем настройки каналов для восстановления сохраненных значений
            const settingsResult = await getCRMChannelSettings(token, 'amocrm');
            if (settingsResult.success && settingsResult.settings) {
                const { Telegram, Instagram, Widget } = settingsResult.settings;

                // Если есть сохраненные ID, находим соответствующие поля
                if (Telegram) {
                    const telegramField = result.custom_fields.find(f => f.id === Telegram);
                    if (telegramField) {
                        setSelectedTelegramField(telegramField);
                    }
                }

                if (Instagram) {
                    const instagramField = result.custom_fields.find(f => f.id === Instagram);
                    if (instagramField) {
                        setSelectedInstagramField(instagramField);
                    }
                }

                if (Widget) {
                    const widgetField = result.custom_fields.find(f => f.id === Widget);
                    if (widgetField) {
                        setSelectedWidgetField(widgetField);
                    }
                }
            }

            setIsMetadataModalOpen(true);
            showNotification('Успешно', `Загружено метаданных полей: ${result.custom_fields?.length || 0}`);
        } catch (e) {
            showErrorNotification('Ошибка', e.message);
        } finally {
            setIsLoadingMetadata(false);
        }
    };

    /**
     * Создание нового кастомного поля контакта
     */
    const handleCreateNewField = async () => {
        if (!newFieldName.trim()) {
            showWarningNotification('Предупреждение', 'Введите название поля');
            return;
        }

        try {
            setIsSavingNewField(true);
            const token = await validateAndRefreshToken();
            if (!token) {
                showErrorNotification('Ошибка авторизации', 'Необходимо войти в систему');
                return;
            }

            const fieldData = {
                name: newFieldName.trim(),
                type: 'text'
            };

            const result = await createAmoCRMCustomField(token, fieldData, 'amocrm');
            if (result.success) {
                showNotification('Успешно', result.message || 'Кастомное поле успешно создано');
                setNewFieldName('');

                // Повторно загружаем метаданные для получения актуального списка с новым полем
                const metadataResult = await getAmoCRMCustomFieldsMetadata(token, 'amocrm');
                if (metadataResult.success) {
                    setMetadataFields(metadataResult.custom_fields || []);
                }
            } else {
                showErrorNotification('Ошибка создания', result.error || 'Не удалось создать кастомное поле');
            }
        } catch (e) {
            showErrorNotification('Ошибка', e.message);
        } finally {
            setIsSavingNewField(false);
        }
    };

    /**
     * Обработчик выбора поля источника перехода
     */
    const handleSelectSourceField = async (fieldId) => {
        setSelectedSourceField(fieldId);
        const selectedField = customFields.find(f => f.id === fieldId);
        if (selectedField) {
            handleInputChange('sourceFieldId', fieldId);
            handleInputChange('sourceFieldName', selectedField.name);
            handleInputChange('sourceFieldCode', selectedField.code);
            showNotification('Поле выбрано', `Источник перехода: ${selectedField.name}`);
            // Сохраняем на сервере
            try {
                const token = await validateAndRefreshToken();
                if (!token) {
                    showErrorNotification('Ошибка авторизации', 'Необходимо войти в систему');
                    return;
                }
                const saveResult = await saveAmoCRMSourceField(token, fieldId, 'amocrm');
                if (saveResult.success) {
                    showNotification('Сохранено', saveResult.message || 'Поле источника перехода сохранено');
                } else {
                    showErrorNotification('Ошибка сохранения', saveResult.error || 'Не удалось сохранить поле');
                }
            } catch (e) {
                showErrorNotification('Ошибка', e.message);
            }
        }
    };

    /**
     * Загрузка воронок AmoCRM
     */
    const handleLoadPipelines = async () => {
        try {
            setIsLoadingPipelines(true);
            const token = await validateAndRefreshToken();
            if (!token) {
                showErrorNotification('Ошибка авторизации', 'Необходимо войти в систему');
                return;
            }
            const result = await getAmoCRMPipelines(token, 'amocrm');
            if (result.success) {
                setPipelines(result.pipelines || []);

                // Автоматически выбираем сохраненную воронку (default_pipeline_id трактуем как ID воронки)
                const defaultPipelineId = result.default_pipeline_id;
                if (defaultPipelineId) {
                    const pipeline = result.pipelines?.find(p => p.id === defaultPipelineId);
                    if (pipeline) {
                        setSelectedPipelineId(defaultPipelineId);
                        if (pipeline.statuses && pipeline.statuses.length > 0) {
                            setSelectedStatusId(pipeline.statuses[0].id);
                        }
                    }
                }

                setIsPipelinesModalOpen(true);
                showNotification('Успешно', `Загружено воронок: ${result.pipelines?.length || 0}`);
            } else {
                showErrorNotification('Ошибка загрузки', result.error || 'Не удалось загрузить воронки');
            }
        } catch (e) {
            showErrorNotification('Ошибка', e.message);
        } finally {
            setIsLoadingPipelines(false);
        }
    };

    /**
     * Реальная OAuth авторизация через AmoCRM
     */
    const handleRealOAuth = async () => {
        if (!canAuthorize) {
            showWarningNotification('Недостаточно данных', 'Заполните все обязательные поля');
            return;
        }
        setIsAuthLoading(true);
        try {
            const token = await validateAndRefreshToken(localStorage.getItem('authToken'));
            if (!token) {
                showErrorNotification('Ошибка авторизации', 'Необходимо повторно авторизоваться!');
                return;
            }
            const fullRedirectUrl = `${(channel.redirectUrl || '').trim()}/crm/oauth/amocrm/callback`;
            const result = await authorizeAmoCRM(token, {
                name: channel.configName,
                subdomain: channel.subdomain,
                clientId: channel.clientId,
                clientSecret: channel.clientSecret,
                url: fullRedirectUrl
            });
            if (!result.success) {
                showErrorNotification('Ошибка OAuth', result.error || 'Не удалось авторизовать');
                return;
            }
            const authorized = await isAmoCRMAuthorized(token);
            setSelectedChannels(prev => prev.map(ch => ch.key === channel.key ? {
                ...ch,
                expiresAt: result.expires_at || ch.expiresAt || null,
                updatedAt: new Date().toISOString(),
                isEnabled: authorized
            } : ch));
            showNotification('Успешно', 'AmoCRM авторизована через OAuth');
        } catch (e) {
            console.error(e);
            showErrorNotification('Ошибка OAuth', e.message);
        } finally {
            setIsAuthLoading(false);
        }
    };

    const handleSelectStatus = async (pipelineId, statusId) => {
        setSelectedPipelineId(pipelineId);
        setSelectedStatusId(statusId);
        const pipeline = pipelines.find(p => p.id === pipelineId);
        const status = pipeline?.statuses.find(s => s.id === statusId);

        if (!pipeline || !status) {
            return;
        }

        handleInputChange('defaultPipelineId', pipelineId);
        handleInputChange('defaultPipelineName', pipeline.name);
        handleInputChange('defaultStatusId', statusId);
        handleInputChange('defaultStatusName', status.name);

        if (savePipelineLockRef.current) {
            return;
        }
        savePipelineLockRef.current = true;

        try {
            const rawToken = localStorage.getItem('authToken');
            const token = await validateAndRefreshToken(rawToken);
            if (!token) {
                showErrorNotification('Ошибка авторизации', 'Необходимо войти в систему');
                return;
            }
            // Передаем оба идентификатора: pipeline и статус
            const saveResult = await saveAmoCRMDefaultPipeline(token, pipelineId, statusId, 'amocrm');
            if (saveResult.success) {
                showNotification('Сохранено', `Выбрано: ${pipeline.name} → ${status.name}`);
            } else {
                showErrorNotification('Ошибка сохранения', saveResult.error || 'Не удалось сохранить настройки лида');
            }
        } catch (e) {
            console.error('handleSelectStatus: ошибка', e);
            showErrorNotification('Ошибка', e.message);
        } finally {
            savePipelineLockRef.current = false;
        }
    };

    /**
     * Загрузка настроек канала с сервера
     */
    const handleLoadChannelSettings = async () => {
        setIsLoadingChannelSettings(true);
        try {
            const token = await validateAndRefreshToken();
            if (!token) {
                showErrorNotification('Ошибка авторизации', 'Необходимо войти в систему');
                return;
            }
            const result = await getCRMChannelSettings(token, 'amocrm');
            if (result.success && result.settings) {
                setChannelSettings(result.settings);
                setIsChannelSettingsModalOpen(true);
                showNotification('Успешно', 'Настройки канала загружены');
            } else {
                showErrorNotification('Ошибка загрузки', result.error || 'Не удалось загрузить настройки канала');
            }
        } catch (e) {
            showErrorNotification('Ошибка', e.message);
        } finally {
            setIsLoadingChannelSettings(false);
        }
    };

    /**
     * Сохранение настроек канала на сервер
     */
    const handleSaveChannelSettings = async () => {
        setIsSavingChannelSettings(true);
        try {
            const token = await validateAndRefreshToken();
            if (!token) {
                showErrorNotification('Ошибка авторизации', 'Необходимо войти в систему');
                return;
            }
            const result = await saveCRMChannelSettings(token, channelSettings, 'amocrm');
            if (result.success) {
                showNotification('Сохранено', 'Настройки канала успешно сохранены');
            } else {
                showErrorNotification('Ошибка сохранения', result.error || 'Не удалось сохранить настройки канала');
            }
        } catch (e) {
            showErrorNotification('Ошибка', e.message);
        } finally {
            setIsSavingChannelSettings(false);
            setIsChannelSettingsModalOpen(false);
        }
    };

    /**
     * Загрузка значений по умолчанию для настроек канала
     */
    const loadDefaultChannelSettings = () => {
        setChannelSettings({
            Assist: '🤖 Агент',
            User: '👤 Клиент',
            Meta: 'Цель в диалоге достигнута',
            Voice: 'голосовое сообщение',
            File: 'Отправлен файл',
            LeadName: 'AI диалог',
            Tags: ['MarusiaAI', 'Новый клиент'],
            CreateNewContact: true,
            CreateNewLead: false,
            ChatMessages: true,
            MetaExist: true,
            AltContact: true
        });
        showNotification('Загружено', 'Значения по умолчанию установлены');
    };

    /**
     * Открытие диалогового окна выбора типа поля
     */
    const handleOpenSelectFieldModal = (field) => {
        setCurrentSelectingField(field);
        setIsSelectFieldModalOpen(true);
    };

    /**
     * Выбор поля для Telegram, Instagram или Widget
     */
    const handleSelectFieldType = (fieldType) => {
        if (!currentSelectingField) return;

        if (fieldType === 'telegram') {
            setSelectedTelegramField(currentSelectingField);
        } else if (fieldType === 'instagram') {
            setSelectedInstagramField(currentSelectingField);
        } else if (fieldType === 'widget') {
            setSelectedWidgetField(currentSelectingField);
        }

        setIsSelectFieldModalOpen(false);
        setCurrentSelectingField(null);

        const fieldNames = {
            'telegram': 'Telegram',
            'instagram': 'Instagram',
            'widget': 'Widget'
        };

        showNotification(
            'Поле выбрано',
            `Поле "${currentSelectingField.name}" назначено для ${fieldNames[fieldType]}`
        );
    };

    /**
     * Сохранение изменений метаданных (Telegram, Instagram, Widget)
     */
    const handleSaveMetadataChanges = async () => {
        try {
            const token = await validateAndRefreshToken();
            if (!token) {
                showErrorNotification('Ошибка авторизации', 'Необходимо войти в систему');
                return;
            }

            // Получаем текущие настройки каналов
            const currentSettings = await getCRMChannelSettings(token, 'amocrm');
            const settings = currentSettings.success && currentSettings.settings
                ? currentSettings.settings
                : {
                    Assist: '',
                    User: '',
                    Meta: '',
                    Voice: '',
                    File: '',
                    LeadName: '',
                    Tags: [],
                    CreateNewContact: false,
                    CreateNewLead: false,
                    ChatMessages: false,
                    MetaExist: false,
                    AltContact: false
                };

            // Обновляем только поля Telegram, Instagram, Widget (сохраняем как числа)
            settings.Telegram = selectedTelegramField ? selectedTelegramField.id : 0;
            settings.Instagram = selectedInstagramField ? selectedInstagramField.id : 0;
            settings.Widget = selectedWidgetField ? selectedWidgetField.id : 0;

            // Добавляю небольшую задержку для избежания блокировки от сервера
            await new Promise(resolve => setTimeout(resolve, 500));

            // Сохраняем настройки
            const result = await saveCRMChannelSettings(token, settings, 'amocrm');
            if (result.success) {
                showNotification('Сохранено', 'Настройки полей контактов успешно сохранены');
            } else {
                showErrorNotification('Ошибка сохранения', result.error || 'Не удалось сохранить настройки');
            }
        } catch (e) {
            showErrorNotification('Ошибка', e.message);
        }
    };

    return (
        <div className="channel-section">
            {/* Статус авторизации */}
            {isAuthorized && (
                <Alert
                    message={
                        <Space>
                            {isTokenExpired ? (
                                <>
                                    <Text>Токен истек</Text>
                                </>
                            ) : (
                                <>
                                    <Text>Авторизовано</Text>
                                </>
                            )}
                            {channel.expiresAt && (
                                <Text type="secondary" style={{fontSize: '12px'}}>
                                    (до {new Date(channel.expiresAt * 1000).toLocaleString('ru-RU')})
                                </Text>
                            )}
                        </Space>
                    }
                    type={isTokenExpired ? "warning" : "success"}
                    style={{marginBottom: '16px'}}
                    showIcon
                />
            )}

            <div className="input-group-modern" ref={configRef}>
                <Text className="input-label-modern">Название конфигурации *</Text>
                <Input
                    placeholder="Введите название (например: My AmoCRM)"
                    value={channel.configName || ''}
                    onChange={(e) => handleInputChange('configName', e.target.value)}
                    className="channel-input-modern"
                />
            </div>

            <div className="input-group-modern">
                <Text className="input-label-modern">Ссылка для перенаправления *</Text>
                <Space.Compact style={{width: '100%'}}>
                    <Input
                        placeholder="https://info-bot.online"
                        value={channel.redirectUrl || ''}
                        onChange={(e) => handleInputChange('redirectUrl', e.target.value.trim())}
                        className="channel-input-modern"
                        style={{flex: 1}}
                        addonAfter="/crm/oauth/amocrm/callback"
                    />
                    <Button
                        onClick={() => handleInputChange('redirectUrl', 'https://info-bot.online')}
                        type="primary"
                    >
                        По умолчанию
                    </Button>
                </Space.Compact>
            </div>

            <div className="input-group-modern">
                <Text className="input-label-modern">Subdomain *</Text>
                <Input
                    placeholder="mycompany (из адреса mycompany.amocrm.ru)"
                    value={channel.subdomain || ''}
                    onChange={(e) => handleInputChange('subdomain', e.target.value)}
                    className="channel-input-modern"
                    addonAfter=".amocrm.ru"
                />
            </div>

            <div className="input-group-modern">
                <Text className="input-label-modern">Client ID *</Text>
                <Input
                    placeholder="Введите Client ID из личного кабинета amoCRM"
                    value={channel.clientId || ''}
                    onChange={(e) => handleInputChange('clientId', e.target.value)}
                    className="channel-input-modern"
                />
            </div>

            <div className="input-group-modern">
                <Text className="input-label-modern">Client Secret *</Text>
                <Input.Password
                    placeholder="Введите Client Secret из личного кабинета amoCRM"
                    value={channel.clientSecret || ''}
                    onChange={(e) => handleInputChange('clientSecret', e.target.value)}
                    className="channel-input-modern"
                />
            </div>

            {/* Кнопки авторизации */}
            <div className="input-group-modern" style={{marginTop: '20px'}} ref={oauthRef}>
                <Space direction="vertical" style={{width: '100%'}}>
                    <Tooltip title={!canAuthorize ? "Заполните все обязательные поля" : ""}>
                        <Button
                            type="primary"
                            icon={<ApiOutlined/>}
                            loading={isAuthLoading}
                            onClick={handleRealOAuth}
                            disabled={!canAuthorize}
                            block
                        >
                            {isAuthorized ? 'Переавторизовать через OAuth' : 'Авторизовать через OAuth'}
                        </Button>
                    </Tooltip>

                    <Tooltip
                        title={!canAuthorize ? "Сначала заполните все поля и сохраните конфигурацию" : "Проверка доступности и валидности конфигурации"}>
                        <Button
                            type="primary"
                            icon={<CloudServerOutlined/>}
                            onClick={async () => {
                                try {
                                    const token = await validateAndRefreshToken(localStorage.getItem('authToken'));
                                    if (!token) {
                                        showErrorNotification('Ошибка авторизации', 'Необходимо повторно авторизоваться');
                                        return;
                                    }

                                    const result = await testAmoCRMConnection(token, 'amocrm');
                                    if (result.success) {
                                        // Сохраняем информацию об аккаунте и показываем модальное окно
                                        if (result.account) {
                                            setAccountInfo(result.account);
                                            setIsAccountInfoModalOpen(true);
                                        } else {
                                            showNotification('Тест успешен', result.message);
                                        }
                                    } else {
                                        showErrorNotification('Тест не пройден', result.error || 'Ошибка тестирования соединения');
                                    }
                                } catch (e) {
                                    showErrorNotification('Ошибка тестирования', e.message);
                                }
                            }}
                            disabled={!isAuthorized}
                            block
                            ref={tokenRef}
                        >
                            Тестировать соединение
                        </Button>
                    </Tooltip>

                    <Text>
                        Настройки интеграции контента MarusiaAI в AmoCRM
                    </Text>
                    {/* Сетка из 4 кнопок 2x2 с визуальным выделением */}
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                        <Tooltip
                            title={!isAuthorized ? 'Сначала необходимо авторизоваться' : 'Выбрать кастомное поле контактных данных для источников перехода которые не содержат номер телефона клиента, например Telegram, Instagram, Widget и т.д.'}>
                            <Button
                                type="default"
                                icon={<SettingOutlined/>}
                                onClick={handleLoadMetadataFields}
                                disabled={!isAuthorized}
                                loading={isLoadingMetadata}
                                block
                            >
                                Установить поле контакта
                            </Button>
                        </Tooltip>

                        <Tooltip
                            title={!isAuthorized ? 'Сначала необходимо авторизоваться' : 'Выбрать поле в объекте "Контакт" для указания источника перехода при создании нового контакта AI Агентом'}>
                            <Button
                                type="default"
                                icon={<ApiOutlined/>}
                                onClick={handleLoadCustomFields}
                                disabled={!isAuthorized}
                                loading={isLoadingCustomFields}
                                block
                            >
                                Установить источник перехода
                            </Button>
                        </Tooltip>

                        <Tooltip
                            title={!isAuthorized ? 'Сначала необходимо авторизоваться' : 'Выбрать воронку для изменения статуса лида при продолжении диалога существующим пользователем'}>
                            <Button
                                type="default"
                                icon={<ApiOutlined/>}
                                onClick={handleLoadPipelines}
                                disabled={!isAuthorized}
                                loading={isLoadingPipelines}
                                block
                            >
                                Выбрать воронку для лида
                            </Button>
                        </Tooltip>

                        <Tooltip
                            title={!isAuthorized ? 'Сначала необходимо авторизоваться' : 'Настройки создаваемых данных в AmoCRM'}>
                            <Button
                                type="default"
                                icon={<SettingOutlined/>}
                                onClick={handleLoadChannelSettings}
                                disabled={!isAuthorized}
                                loading={isLoadingChannelSettings}
                                block
                            >
                                Настройки AmoCRM
                            </Button>
                        </Tooltip>
                    </div>
                </Space>
            </div>

            {/* Информация о конфигурации (только если авторизован) */}
            {isAuthorized && (
                <>
                    {channel.sourceFieldName && (
                        <div className="input-group-modern" style={{marginTop: '16px'}}>
                            <Alert
                                message="Поле для источника перехода"
                                description={
                                    <div>
                                        <Text strong>{channel.sourceFieldName}</Text>
                                        {channel.sourceFieldCode && (
                                            <Text type="secondary" style={{marginLeft: '8px', fontSize: '12px'}}>
                                                (код: {channel.sourceFieldCode})
                                            </Text>
                                        )}
                                    </div>
                                }
                                type="info"
                                showIcon
                                style={{marginBottom: '12px'}}
                            />
                        </div>
                    )}

                    {channel.createdAt && (
                        <div className="input-group-modern" style={{marginTop: '16px'}}>
                            <Text type="secondary" style={{fontSize: '12px'}}>
                                Создано: {new Date(channel.createdAt).toLocaleString('ru-RU')}
                            </Text>
                        </div>
                    )}

                    {channel.updatedAt && (
                        <div className="input-group-modern">
                            <Text type="secondary" style={{fontSize: '12px'}}>
                                Обновлено: {new Date(channel.updatedAt).toLocaleString('ru-RU')}
                            </Text>
                        </div>
                    )}

                    {channel.defaultPipelineName && (
                        <div className="input-group-modern" style={{marginTop: '8px'}}>
                            <Alert
                                message="Воронка по умолчанию"
                                description={
                                    <div>
                                        <Text strong>{channel.defaultStatusName}</Text>
                                    </div>
                                }
                                type="info"
                                showIcon
                                style={{marginBottom: '12px'}}
                            />
                        </div>
                    )}
                </>
            )}

            {/* Модальное окно с информацией об аккаунте AmoCRM */}
            <Modal
                title={
                    <Space>
                        <CheckCircleOutlined style={{color: '#52c41a'}}/>
                        <span>Тест подключения успешен</span>
                    </Space>
                }
                open={isAccountInfoModalOpen}
                onCancel={() => {
                    setIsAccountInfoModalOpen(false);
                    setAccountInfo(null);
                }}
                footer={[
                    <Button
                        style={{color: 'black'}}
                        key="close" type="primary" onClick={() => {
                        setIsAccountInfoModalOpen(false);
                        setAccountInfo(null);
                    }}>
                        Закрыть
                    </Button>
                ]}
                width={600}
            >
                {accountInfo && (
                    <>
                        <Alert
                            message="Подключение к AmoCRM установлено успешно"
                            type="success"
                            showIcon
                            style={{marginBottom: 16}}
                        />
                        <Descriptions bordered column={1} size="small">
                            <Descriptions.Item label="ID аккаунта">
                                {accountInfo.id}
                            </Descriptions.Item>
                            <Descriptions.Item label="Название">
                                {accountInfo.name}
                            </Descriptions.Item>
                            <Descriptions.Item label="Поддомен">
                                <a
                                    href={`https://${accountInfo.subdomain}.amocrm.ru`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {accountInfo.subdomain}.amocrm.ru
                                </a>
                            </Descriptions.Item>
                            <Descriptions.Item label="Дата создания">
                                {accountInfo.created_at ? new Date(accountInfo.created_at * 1000).toLocaleString('ru-RU') : 'Не указана'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Страна">
                                {accountInfo.country || 'Не указана'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Валюта">
                                {accountInfo.currency || 'Не указана'}
                            </Descriptions.Item>
                        </Descriptions>
                    </>
                )}
            </Modal>

            {/* Модальное окно с кастомными полями контактов */}
            <Modal
                title={
                    <Space>
                        <ApiOutlined style={{color: 'var(--link-hover-color)'}}/>
                        <span>Выбрать поле для указания источника перехода</span>
                    </Space>
                }
                open={isCustomFieldsModalOpen}
                onCancel={() => {
                    setIsCustomFieldsModalOpen(false);
                    setCustomFields([]);
                }}
                footer={[
                    <Button
                        style={{color: 'black'}}
                        key="close" type="primary" onClick={() => {
                        setIsCustomFieldsModalOpen(false);
                        setCustomFields([]);
                    }}>
                        Закрыть
                    </Button>
                ]}
                width={900}
            >
                {customFields && customFields.length > 0 ? (
                    <>
                        <Alert
                            message={`Найдено полей: ${customFields.length}. Выберите поле для сохранения источника перехода клиента.`}
                            type="info"
                            showIcon
                            style={{marginBottom: 16}}
                        />
                        {selectedSourceField && (
                            <Alert
                                message={`Выбрано: ${customFields.find(f => f.id === selectedSourceField)?.name}`}
                                type="success"
                                showIcon
                                style={{marginBottom: 16}}
                            />
                        )}
                        <Radio.Group
                            value={selectedSourceField}
                            onChange={(e) => handleSelectSourceField(e.target.value)}
                            style={{width: '100%'}}
                        >
                            <div style={{
                                maxHeight: '500px',
                                overflowY: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px'
                            }}>
                                {customFields.map((field) => (
                                    <Card
                                        key={field.id}
                                        size="small"
                                        hoverable
                                        onClick={() => handleSelectSourceField(field.id)}
                                        style={{
                                            cursor: 'pointer',
                                            backgroundColor: selectedSourceField === field.id ? 'var(--main-color)' : undefined
                                        }}
                                        styles={{
                                            body: {
                                                padding: '12px 16px',
                                                color: selectedSourceField === field.id ? 'black' : undefined
                                            }
                                        }}
                                    >
                                        <Space align="start" style={{width: '100%'}}>
                                            <Radio value={field.id} style={{marginTop: '2px'}}/>
                                            <div style={{flex: 1, minWidth: 0}}>
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    marginBottom: '4px'
                                                }}>
                                                    <Text
                                                        strong
                                                        style={{
                                                            fontSize: '14px',
                                                            color: selectedSourceField === field.id ? 'black' : undefined
                                                        }}
                                                    >
                                                        {field.name}
                                                    </Text>
                                                    {field.type && (
                                                        <Text
                                                            type="secondary"
                                                            style={{
                                                                fontSize: '12px',
                                                                color: selectedSourceField === field.id ? 'black' : undefined
                                                            }}
                                                        >
                                                            {field.type}
                                                        </Text>
                                                    )}
                                                </div>
                                                <div
                                                    data-field-id={field.id}
                                                    data-field-code={field.code}
                                                    style={{display: 'none'}}
                                                />
                                            </div>
                                        </Space>
                                    </Card>
                                ))}
                            </div>
                        </Radio.Group>
                    </>
                ) : (
                    <Alert
                        message="Кастомные поля не найдены"
                        type="warning"
                        showIcon
                    />
                )}
            </Modal>

            {/* Модальное окно выбора воронки */}
            <Modal
                title={
                    <Space>
                        <ApiOutlined style={{color: 'var(--link-hover-color)'}}/>
                        <span>Выбрать статус воронки (pipeline)</span>
                    </Space>
                }
                open={isPipelinesModalOpen}
                onCancel={() => {
                    setIsPipelinesModalOpen(false);
                    setPipelines([]);
                }}
                footer={[
                    <Button
                        style={{color: 'black'}}
                        key="close" type="primary" onClick={() => {
                        setIsPipelinesModalOpen(false);
                        setPipelines([]);
                    }}>
                        Закрыть
                    </Button>
                ]}
                width={950}
            >
                {pipelines && pipelines.length > 0 ? (
                    <>
                        <Alert
                            message={`Найдено воронок: ${pipelines.length}. Выберите конкретный статус (этап).`}
                            type="info"
                            showIcon
                            style={{marginBottom: 16}}
                        />
                        {selectedStatusId && (
                            <Alert
                                message={`Выбрано: ${pipelines.find(p => p.id === selectedPipelineId)?.name} → ${pipelines.find(p => p.id === selectedPipelineId)?.statuses.find(s => s.id === selectedStatusId)?.name}`}
                                type="success"
                                showIcon
                                style={{marginBottom: 16}}
                            />
                        )}
                        <div style={{
                            maxHeight: '550px',
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                        }}>
                            {pipelines.map(pipeline => (
                                <Card
                                    key={pipeline.id}
                                    size="small"
                                    hoverable={false}
                                    variant="outlined"
                                    style={{
                                        marginBottom: 8,
                                        borderColor: selectedPipelineId === pipeline.id ? 'var(--link-hover-color)' : undefined,
                                        borderRadius: 6
                                    }}
                                    styles={{
                                        header: {padding: '6px 8px'},
                                        body: {padding: '6px 8px'}
                                    }}
                                    title={
                                        <span style={{fontWeight: 600, fontSize: 13}}>
                                            {pipeline.name} <Text type="secondary"
                                                                  style={{fontSize: 11}}>(ID: {pipeline.id})</Text>
                                        </span>
                                    }
                                >
                                    {pipeline.statuses && pipeline.statuses.length > 0 ? (
                                        <div style={{display: 'flex', flexWrap: 'wrap', gap: '6px'}}>
                                            {pipeline.statuses.map((status) => {
                                                const isSelected = selectedStatusId === status.id;
                                                return (
                                                    <span
                                                        key={status.id}
                                                        onClick={() => handleSelectStatus(pipeline.id, status.id)}
                                                        style={{
                                                            cursor: 'pointer',
                                                            color: status.color || 'var(--text-color)',
                                                            fontSize: 12,
                                                            fontWeight: isSelected ? 600 : 500,
                                                            lineHeight: '16px',
                                                            padding: 0,
                                                            borderBottom: isSelected ? '1px solid var(--link-hover-color)' : '1px solid transparent'
                                                        }}
                                                    >
                                                        {status.name}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <Text type="secondary" style={{fontSize: 12}}>Статусы отсутствуют</Text>
                                    )}
                                </Card>
                            ))}
                        </div>
                    </>
                ) : (
                    <Alert
                        message="Воронки не найдены"
                        type="warning"
                        showIcon
                    />
                )}
            </Modal>

            {/* Модальное окно настроек канала */}
            <Modal
                title={
                    <Space>
                        <SettingOutlined style={{color: 'var(--link-hover-color)'}}/>
                        <span>Настройки канала AmoCRM</span>
                    </Space>
                }
                open={isChannelSettingsModalOpen}
                onCancel={() => setIsChannelSettingsModalOpen(false)}
                footer={[
                    <Button
                        key="default"
                        onClick={loadDefaultChannelSettings}
                    >
                        Загрузить все по умолчанию
                    </Button>,
                    <Button
                        style={{color: 'black'}}
                        key="save"
                        type="primary"
                        loading={isSavingChannelSettings}
                        onClick={handleSaveChannelSettings}
                    >
                        Сохранить настройки
                    </Button>,
                ]}
                width={800}
            >
                <div style={{maxHeight: '600px', overflowY: 'auto'}}>
                    {/* Общие настройки */}
                    <Text strong style={{fontSize: '16px'}}>Общие настройки</Text>
                    <div style={{marginTop: '12px', marginBottom: '16px'}}>
                        <Text className="input-label-modern">Подпись сообщения Агента</Text>
                        <Space.Compact style={{width: '100%'}}>
                            <Input
                                placeholder="Введите значение для Agent"
                                value={channelSettings.Assist}
                                onChange={(e) => setChannelSettings({...channelSettings, Assist: e.target.value})}
                                className="channel-input-modern"
                                style={{flex: 1}}
                            />
                            <Button
                                onClick={() => setChannelSettings({...channelSettings, Assist: '🤖 Агент'})}
                            >
                                По умолчанию
                            </Button>
                        </Space.Compact>
                    </div>

                    <div style={{marginTop: '12px', marginBottom: '16px'}}>
                        <Text className="input-label-modern">Подпись сообщения клиента</Text>
                        <Space.Compact style={{width: '100%'}}>
                            <Input
                                placeholder="Введите значение для User"
                                value={channelSettings.User}
                                onChange={(e) => setChannelSettings({...channelSettings, User: e.target.value})}
                                className="channel-input-modern"
                                style={{flex: 1}}
                            />
                            <Button
                                onClick={() => setChannelSettings({...channelSettings, User: '👤 Клиент'})}
                            >
                                По умолчанию
                            </Button>
                        </Space.Compact>
                    </div>

                    <div style={{marginTop: '12px', marginBottom: '16px'}}>
                        <Text className="input-label-modern">Meta</Text>
                        <Space.Compact style={{width: '100%'}}>
                            <Input
                                placeholder="Введите значение для Meta"
                                value={channelSettings.Meta}
                                onChange={(e) => setChannelSettings({...channelSettings, Meta: e.target.value})}
                                className="channel-input-modern"
                                style={{flex: 1}}
                            />
                            <Button
                                onClick={() => setChannelSettings({
                                    ...channelSettings,
                                    Meta: 'Цель в диалоге достигнута'
                                })}
                            >
                                По умолчанию
                            </Button>
                        </Space.Compact>
                    </div>

                    <div style={{marginTop: '12px', marginBottom: '16px'}}>
                        <Text className="input-label-modern">Voice</Text>
                        <Space.Compact style={{width: '100%'}}>
                            <Input
                                placeholder="Введите значение для Voice"
                                value={channelSettings.Voice}
                                onChange={(e) => setChannelSettings({...channelSettings, Voice: e.target.value})}
                                className="channel-input-modern"
                                style={{flex: 1}}
                            />
                            <Button
                                onClick={() => setChannelSettings({...channelSettings, Voice: 'голосовое сообщение'})}
                            >
                                По умолчанию
                            </Button>
                        </Space.Compact>
                    </div>

                    <div style={{marginTop: '12px', marginBottom: '16px'}}>
                        <Text className="input-label-modern">File</Text>
                        <Space.Compact style={{width: '100%'}}>
                            <Input
                                placeholder="Введите значение для File"
                                value={channelSettings.File}
                                onChange={(e) => setChannelSettings({...channelSettings, File: e.target.value})}
                                className="channel-input-modern"
                                style={{flex: 1}}
                            />
                            <Button
                                onClick={() => setChannelSettings({...channelSettings, File: 'Отправлен файл'})}
                            >
                                По умолчанию
                            </Button>
                        </Space.Compact>
                    </div>

                    <div style={{marginTop: '12px', marginBottom: '16px'}}>
                        <Text className="input-label-modern">Название нового лида</Text>
                        <Space.Compact style={{width: '100%'}}>
                            <Input
                                placeholder="Введите название лида"
                                value={channelSettings.LeadName}
                                onChange={(e) => setChannelSettings({...channelSettings, LeadName: e.target.value})}
                                className="channel-input-modern"
                                style={{flex: 1}}
                            />
                            <Button
                                onClick={() => setChannelSettings({...channelSettings, LeadName: 'AI диалог'})}
                            >
                                По умолчанию
                            </Button>
                        </Space.Compact>
                    </div>

                    <div style={{marginTop: '12px', marginBottom: '24px'}}>
                        <Text className="input-label-modern">Теги при создании контакта и лида</Text>
                        <Space.Compact style={{width: '100%'}}>
                            <Input
                                placeholder="Введите теги (через запятую)"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                className="channel-input-modern"
                                style={{flex: 1}}
                            />
                            <Button
                                style={{color: 'black'}}
                                type="primary"
                                onClick={() => {
                                    if (tagInput.trim() === '') return;
                                    const newTags = tagInput.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
                                    setChannelSettings(prev => ({
                                        ...prev,
                                        Tags: [...prev.Tags, ...newTags]
                                    }));
                                    setTagInput('');
                                }}
                            >
                                Добавить тег
                            </Button>
                        </Space.Compact>
                        {channelSettings.Tags.length > 0 && (
                            <div style={{marginTop: '8px'}}>
                                {channelSettings.Tags.map((tag, index) => (
                                    <Tag
                                        key={index}
                                        closable
                                        onClose={() => {
                                            setChannelSettings(prev => ({
                                                ...prev,
                                                Tags: prev.Tags.filter(t => t !== tag)
                                            }));
                                        }}
                                        style={{marginBottom: '8px'}}
                                    >
                                        {tag}
                                    </Tag>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Настройки создания */}
                    <Text strong style={{fontSize: '16px', marginTop: '32px', display: 'block', marginBottom: '16px'}}>Настройки
                        создания</Text>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '16px'
                    }}>
                        <Text className="input-label-modern" style={{marginBottom: 0}}>Создавать новый контакт</Text>
                        <Switch
                            checked={channelSettings.CreateNewContact}
                            onChange={(checked) => setChannelSettings({...channelSettings, CreateNewContact: checked})}
                        />
                    </div>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '16px'
                    }}>
                        <Text className="input-label-modern" style={{marginBottom: 0}}>Создавать новый лид</Text>
                        <Switch
                            checked={channelSettings.CreateNewLead}
                            onChange={(checked) => setChannelSettings({...channelSettings, CreateNewLead: checked})}
                        />
                    </div>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '16px'
                    }}>
                        <Text className="input-label-modern" style={{marginBottom: 0}}>Сообщения диалога в лид</Text>
                        <Switch
                            checked={channelSettings.ChatMessages}
                            onChange={(checked) => setChannelSettings({...channelSettings, ChatMessages: checked})}
                        />
                    </div>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '16px'
                    }}>
                        <Text className="input-label-modern" style={{marginBottom: 0}}>Сообщение о достижении цели в
                            лид</Text>
                        <Switch
                            checked={channelSettings.MetaExist}
                            onChange={(checked) => setChannelSettings({...channelSettings, MetaExist: checked})}
                        />
                    </div>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '16px'
                    }}>
                        <Text className="input-label-modern" style={{marginBottom: 0}}>Создавать контакты без телефона (@Telegram, Instagram, Widget)</Text>
                        <Switch
                            checked={channelSettings.AltContact}
                            onChange={(checked) => setChannelSettings({...channelSettings, AltContact: checked})}
                        />
                    </div>
                </div>
            </Modal>

            {/* Модальное окно метаданных кастомных полей контактов */}
            <Modal
                title={
                    <Space>
                        <SettingOutlined style={{color: 'var(--link-hover-color)'}}/>
                        <span>Метаданные кастомных полей контактов</span>
                    </Space>
                }
                open={isMetadataModalOpen}
                onCancel={() => {
                    setIsMetadataModalOpen(false);
                    setMetadataFields([]);
                    setNewFieldName('');
                    setSelectedTelegramField(null);
                    setSelectedInstagramField(null);
                    setSelectedWidgetField(null);
                }}
                footer={[
                    <Button
                        style={{color: 'black'}}
                        key="save"
                        type="primary"
                        onClick={() => {
                            handleSaveMetadataChanges();
                        }}
                    >
                        Сохранить изменения
                    </Button>,
                    <Button
                        style={{color: 'black'}}
                        key="close"
                        type="default"
                        onClick={() => {
                            setIsMetadataModalOpen(false);
                            setMetadataFields([]);
                            setNewFieldName('');
                            setSelectedTelegramField(null);
                            setSelectedInstagramField(null);
                            setSelectedWidgetField(null);
                        }}
                    >
                        Закрыть
                    </Button>
                ]}
                width={950}
                styles={{
                    body: {
                        maxHeight: '70vh',
                        overflowY: 'auto',
                        scrollbarWidth: 'none', // для Firefox
                        msOverflowStyle: 'none' // для IE и Edge
                    }
                }}
                className="hide-scrollbar-modal"
            >
                {/* Форма для создания нового поля */}
                <div style={{marginBottom: 16}}>
                    <Space.Compact style={{width: '100%'}}>
                        <Input
                            placeholder="Введите название нового кастомного поля (например: Telegram)"
                            value={newFieldName}
                            onChange={(e) => setNewFieldName(e.target.value)}
                            onPressEnter={handleCreateNewField}
                            disabled={isSavingNewField}
                        />
                        <Button
                            style={{color: 'black'}}
                            type="primary"
                            onClick={handleCreateNewField}
                            loading={isSavingNewField}
                            disabled={!newFieldName.trim()}
                        >
                            Сохранить
                        </Button>
                    </Space.Compact>
                </div>

                {/* Alert'ы для Telegram, Instagram и Widget в одну строку */}
                <div style={{display: 'flex', gap: '8px', marginBottom: 16}}>
                    {/* Alert для Telegram */}
                    <Alert
                        message={
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                <span>
                                    <strong>Telegram:</strong> {selectedTelegramField ? selectedTelegramField.name : 'Не выбрано'}
                                </span>
                                {selectedTelegramField && (
                                    <Button
                                        size="small"
                                        danger
                                        onClick={() => setSelectedTelegramField(null)}
                                    >
                                        Очистить
                                    </Button>
                                )}
                            </div>
                        }
                        type={selectedTelegramField ? 'success' : 'warning'}
                        showIcon
                        style={{flex: 1}}
                    />

                    {/* Alert для Instagram */}
                    <Alert
                        message={
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                <span>
                                    <strong>Instagram:</strong> {selectedInstagramField ? selectedInstagramField.name : 'Не выбрано'}
                                </span>
                                {selectedInstagramField && (
                                    <Button
                                        size="small"
                                        danger
                                        onClick={() => setSelectedInstagramField(null)}
                                    >
                                        Очистить
                                    </Button>
                                )}
                            </div>
                        }
                        type={selectedInstagramField ? 'success' : 'warning'}
                        showIcon
                        style={{flex: 1}}
                    />

                    {/* Alert для Widget */}
                    <Alert
                        message={
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                <span>
                                    <strong>Widget:</strong> {selectedWidgetField ? selectedWidgetField.name : 'Не выбрано'}
                                </span>
                                {selectedWidgetField && (
                                    <Button
                                        size="small"
                                        danger
                                        onClick={() => setSelectedWidgetField(null)}
                                    >
                                        Очистить
                                    </Button>
                                )}
                            </div>
                        }
                        type={selectedWidgetField ? 'success' : 'warning'}
                        showIcon
                        style={{flex: 1}}
                    />
                </div>

                {metadataFields && metadataFields.length > 0 ? (
                    <>
                        <Alert
                            message={`Найдено полей: ${metadataFields.length}`}
                            type="info"
                            showIcon
                            style={{marginBottom: 16}}
                        />
                        <div style={{
                            maxHeight: '550px',
                            overflowY: 'auto',
                            padding: '8px'
                        }}>
                            {metadataFields.map((field) => (
                                <Card
                                    key={field.id}
                                    data-field-id={field.id}
                                    style={{
                                        marginBottom: '12px',
                                        borderLeft: '3px solid var(--link-hover-color)',
                                        cursor: 'pointer'
                                    }}
                                    size="small"
                                    hoverable
                                    onClick={() => handleOpenSelectFieldModal(field)}
                                >
                                    <Space>
                                        <Text strong style={{fontSize: '14px'}}>
                                            {field.name}
                                        </Text>
                                    </Space>
                                </Card>
                            ))}
                        </div>
                    </>
                ) : (
                    <Alert
                        message="Метаданные полей не найдены"
                        type="warning"
                        showIcon
                    />
                )}
            </Modal>

            {/* Диалоговое окно выбора типа поля */}
            <Modal
                title="Выбрать поле для"
                open={isSelectFieldModalOpen}
                onCancel={() => {
                    setIsSelectFieldModalOpen(false);
                    setCurrentSelectingField(null);
                }}
                footer={null}
                width={400}
            >
                {currentSelectingField && (
                    <div style={{marginBottom: 16}}>
                        <Text strong>Поле: </Text>
                        <Text>{currentSelectingField.name}</Text>
                    </div>
                )}
                <Space direction="vertical" style={{width: '100%'}}>
                    <Button
                        style={{ color : 'black' }}
                        type="primary"
                        block
                        size="large"
                        onClick={() => handleSelectFieldType('telegram')}
                    >
                        Telegram
                    </Button>
                    <Button
                        style={{ color : 'black' }}
                        type="primary"
                        block
                        size="large"
                        onClick={() => handleSelectFieldType('instagram')}
                    >
                        Instagram
                    </Button>
                    <Button
                        style={{ color : 'black' }}
                        type="primary"
                        block
                        size="large"
                        onClick={() => handleSelectFieldType('widget')}
                    >
                        Widget
                    </Button>
                </Space>
            </Modal>
        </div>
    );
};
