import React, {useEffect, useState, useRef} from "react";
import {Button, Form, Input, Spin, Tour, FloatButton, Modal} from "antd";
import {
    UserOutlined,
    RobotOutlined,
    QuestionCircleOutlined,
    CheckCircleOutlined,
    ExperimentOutlined
} from "@ant-design/icons";
import {Target} from "./CreateModelFormElements/Target";
import {Triggers} from "./CreateModelFormElements/Triggers";
import {
    getModelData,
    extractAllModels,
    getActiveProviderName,
    saveModelData,
    setActiveProvider
} from "./CreateModelFormElements/modUtils";
import {DeleteModel} from "./deleteModel";
import {showErrorNotification, showNotification, showWarningNotification} from "../hotification/showNotification";
import {getTourPanelState, setTourPanelState} from "../../utils/cookieUtils";
import {UpdateModel} from "./updateModel";
import {Espero} from "./CreateModelFormElements/Espero";
import {Embedding} from "./CreateModelFormElements/Embedding";
import {Prompt} from "./CreateModelFormElements/Prompt";
import {Openai_Interpreter as OpenaiInterpreter} from "./CreateModelFormElements/openai_Interpreter";
import {Openai_Realtime as OpenaiRealtime} from "./CreateModelFormElements/Openai_Realtime";
import {Google_Realtime as GoogleRealtime} from "./CreateModelFormElements/Google_Realtime";
import {Mistral_Realtime as MistralRealtime} from "./CreateModelFormElements/Mistral_Realtime";
import {ModelTest} from "./ModelTest/ModelTest";
import {Mistral_Interpreter as MistralInterpreter} from "./CreateModelFormElements/mistral_interpretator";
import {Google_Interpreter as GoogleInterpreter} from "./CreateModelFormElements/google_interpretator";
import {Operator} from "./CreateModelFormElements/Operator";
import {ModelSelector} from "./CreateModelFormElements/ModelSelector";
import {restartActiveChannels} from "./Channals/chUtils";
import {LeadHaunter} from "./CreateModelFormElements/LeadHaunter";
import {useTranslation} from "react-i18next";
import {GoogleOAuth} from "./GoogleOAuth";
import {UploadFiles} from "./CreateModelFormElements/UploadFiles";
import {TypesGPT} from "./CreateModelFormElements/TypesGPT";
import S3storage from "./CreateModelFormElements/S3storage";


export const CreateModel = ({onMenuChange}) => {
    // Подписываемся на изменения языка, чтобы компонент перерисовывался при смене языка
    const {i18n, t} = useTranslation();
    const [loading, setLoading] = useState(true);
    const [form] = Form.useForm(); // Создаём экземпляр формы
    const [isButtonDisabled, setButtonDisabled] = useState(true)
    const [modelData, setModelData] = useState(null);
    const [tourVisible, setTourVisible] = useState(false);
    const [current, setCurrent] = useState(0);
    const [tourPanelVisible, setTourPanelVisible] = useState(getTourPanelState('createmodel')); // Состояние для видимости панели
    const showSimpleAuth = false;

    // Новые state для мультимодельной архитектуры
    /** @type {[Record<string, any>, React.Dispatch<React.SetStateAction<Record<string, any>>>]} */
    const [allModelsData, setAllModelsData] = useState({}); // Все модели {openai: {...}, anthropic: {...}}
    /** @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]} */
    const [activeProvider, setActiveProviderState] = useState(null); // Активный провайдер
    /** @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]} */
    const [selectedProvider, setSelectedProvider] = useState(null); // Выбранный провайдер для редактирования
    const [providerLoading, setProviderLoading] = useState(false); // Загрузка при смене провайдера
    const [s3FilesEnabled, setS3FilesEnabled] = useState(false); // Состояние S3 файлов для передачи в Mistral_Interpreter
    const [googleOAuthEnabled, setGoogleOAuthEnabled] = useState(false); // Состояние Google OAuth для передачи в Google_Interpreter

    // State для модального окна подтверждения переключения провайдера
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [pendingProvider, setPendingProvider] = useState(null); // Провайдер, на который пытаемся переключиться

    // State для модального окна перезапуска сервисов
    const [isRestartServicesModalOpen, setIsRestartServicesModalOpen] = useState(false);
    const [restartProgressVisible, setRestartProgressVisible] = useState(false);
    const [restartMessages, setRestartMessages] = useState([]);
    const [restartComplete, setRestartComplete] = useState(false);
    const [restartLoading, setRestartLoading] = useState(false);

    // State для модального окна тестирования модели
    const [isTestModalOpen, setIsTestModalOpen] = useState(false);

    // Refs для Tour targets
    const headerRef = useRef(null);
    const basicInfoRef = useRef(null);
    const promptRef = useRef(null);
    const loadTemplateButtonRef = useRef(null);
    const operatorRef = useRef(null);
    const targetRef = useRef(null);
    const triggersRef = useRef(null);
    const filesRef = useRef(null);
    const s3FilesRef = useRef(null);
    const googleOAuthRef = useRef(null);
    const interpreterRef = useRef(null);
    const esperoRef = useRef(null);
    const gptTypeRef = useRef(null);
    const buttonsRef = useRef(null);
    const updateModelRef = useRef(null); // Ref для доступа к методу обновления модели

    const steps = [
        {
            title: t("createModelWelcome") || '🤖 Добро пожаловать в конструктор моделей',
            description: t("createModelWelcomeDesc") || 'Здесь вы можете создать и настроить свою собственную модель ИИ-агента с персонализированными параметрами.',
            target: () => headerRef.current,
        },
        {
            title: t("createModelBasicInfo") || '📝 Основная информация',
            description: t("createModelBasicInfoDesc") || 'Введите название вашей модели. Это имя будет отображаться в интерфейсах и поможет идентифицировать вашего агента.',
            target: () => basicInfoRef.current,
        },
        {
            title: t("createModelPrompt") || '💬 Системный промпт',
            description: t("createModelPromptDesc") || 'Настройте промпт - это основные инструкции, которые определяют характер, стиль общения и поведение вашего агента.',
            target: () => promptRef.current,
        },
        {
            title: t("createModelTemplate") || '📋 Базовый шаблон промпта',
            description: t("createModelTemplateDesc") || 'Для быстрого старта вы можете использовать базовый шаблон промпта. Нажмите кнопку "Загрузить шаблон промпта" чтобы загрузить готовый шаблон, который можно редактировать под свои нужды.',
            target: () => loadTemplateButtonRef.current,
        },
        {
            title: t("createModelOperator") || '👨‍💼 Операторский режим',
            description: t("createModelOperatorDesc") || 'Включите возможность переключения на живых операторов. Настройте список Telegram ID операторов, которые будут отвечать пользователям при срабатывании определенных условий в промпте.',
            target: () => operatorRef.current,
        },
        {
            title: t("createModelTarget") || '🎯 Цели и задачи',
            description: t("createModelTargetDesc") || 'Определите конкретные цели и задачи, которые должен выполнять ваш агент. Это поможет ему быть более целенаправленным.',
            target: () => targetRef.current,
        },
        {
            title: t("createModelTriggers") || '⚡ Триггеры активации',
            description: t("createModelTriggersDesc") || 'Настройте ключевые слова и фразы, которые будут активировать определенные функции или реакции вашего агента.',
            target: () => triggersRef.current,
        },
        // Загрузка файлов для дообучения - не поддерживается для Mistral и Google
        ...(selectedProvider !== 'mistral' && selectedProvider !== 'google' ? [{
            title: t("createModelFiles") || '📁 Загрузка файлов',
            description: t("createModelFilesDesc") || 'Загрузите документы, которые агент сможет использовать для ответов. Поддерживаются текстовые файлы, PDF и другие форматы.',
            target: () => filesRef.current,
        }] : selectedProvider === 'google' ? [{
            title: t("createModelEmbeddings") || '📚 Эмбеддинги текстов',
            description: t("createModelEmbeddingsDesc") || 'Загрузите текстовые фрагменты для контекстного обучения модели. Каждый документ преобразуется в векторное представление.',
            target: () => filesRef.current,
        }] : []),
        {
            title: t("createModelS3") || '☁️ Файлы S3',
            description: t("createModelS3Desc") || 'Подключите внешние файлы из облачного хранилища S3 для расширения базы знаний вашего агента.',
            target: () => s3FilesRef.current,
        },
        {
            title: t("createModelGoogleOAuth") || '📅 Google Integration',
            description: t("createModelGoogleOAuthDesc") || 'Подключите Google аккаунт для интеграции с Google Calendar и Google Sheets. Агент сможет управлять событиями и работать с таблицами.',
            target: () => googleOAuthRef.current,
        },
        {
            title: t("createModelInterpreter") || '⚙️ Интерпретатор кода',
            description: t("createModelInterpreterDesc") || 'Включите возможность выполнения и интерпретации кода. Агент сможет выполнять вычисления и программные задачи.',
            target: () => interpreterRef.current,
        },
        {
            title: t("createModelEspero") || '⏱️ Настройки параметров вопроса',
            description: t("createModelEsperoDesc") || 'Настройте параметры ожидания и лимиты для оптимальной производительности вашего агента.',
            target: () => esperoRef.current,
        },
        ...(showSimpleAuth ? [{
            title: t("createModelGPTType") || '🧠 Языковая модель',
            description: t("createModelGPTTypeDesc") || 'Выберите тип языковой модели GPT, которая будет использоваться вашим агентом для обработки запросов.',
            target: () => gptTypeRef.current,
        }] : []),
        {
            title: t("createModelSave") || '🚀 Сохранение и управление',
            description: t("createModelSaveDesc") || 'Создайте новую модель или обновите существующую. Здесь также доступны функции удаления модели при необходимости.',
            target: () => buttonsRef.current,
        },
        {
            title: t("createModelDone") || '✅ Готово к работе!',
            description: t("createModelDoneDesc") || 'Поздравляем! Ваш ИИ-агент настроен и готов к использованию. Теперь вы можете интегрировать его в свои проекты.',
            target: () => buttonsRef.current,
        },
    ];

    // Вызов асинхронной функции для получения данных модели
    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getModelData();
                if (data != null) {
                    // Извлекаем данные в новом формате
                    const models = extractAllModels(data);
                    const activeProviderName = getActiveProviderName(data);

                    setAllModelsData(models);
                    setActiveProviderState(activeProviderName);

                    // Если есть активный провайдер, выбираем его
                    if (activeProviderName && models[activeProviderName]) {
                        setSelectedProvider(activeProviderName);
                        const providerData = models[activeProviderName];
                        setModelData(providerData);

                        // Заполняем форму данными активной модели
                        const hasS3Data = providerData.s3 || providerData.s3_enabled || providerData.s3files || false;

                        // Инициализируем состояние S3 файлов
                        setS3FilesEnabled(hasS3Data);

                        // Инициализируем состояние Google OAuth
                        const googleOAuth = providerData.g_oauth;
                        const isGoogleOAuthEnabled = googleOAuth && typeof googleOAuth === 'object' &&
                            (googleOAuth.calendar || googleOAuth.sheets);
                        setGoogleOAuthEnabled(isGoogleOAuthEnabled);

                        form.setFieldsValue({
                            name: providerData.name || "",
                            prompt: providerData.instructions || providerData.prompt || "",
                            action: providerData.mact || "",
                            triggers: providerData.trig || [],
                            fileids: providerData.fileids || providerData.fileIds || [],
                            search: providerData.search || false,
                            operator: providerData.operator || false,
                            haunter: providerData.haunter || false,
                            interpreter: providerData.interpreter || providerData.interp || false,
                            s3files: hasS3Data,
                            image: providerData.image || false,
                            web_search: providerData.web_search || false,
                            // Маппинг g_oauth с сервера на google_oauth в форме
                            google_oauth: providerData.g_oauth && typeof providerData.g_oauth === 'object'
                                ? providerData.g_oauth
                                : false,
                            espero: providerData.espero || {
                                wait: 2,
                                limit: 1024,
                            },
                            gpttype: providerData.use_model_name?.gpttype || null,
                            realtime_gpttype: providerData.use_model_name?.realtime || null,
                        });
                    } else {
                        // Нет активного провайдера или данных - показываем предупреждение
                        showWarningNotification(t("modelNotCreated") || "Модель Агента не создана", t("createModelSelectProvider") || "Выберите провайдера и создайте модель");
                        setModelData(null);
                        setSelectedProvider(null);
                    }
                } else {
                    showWarningNotification(t("createModelLoadError") || "Ошибка загрузки модели", t("createModelTokenError") || "Токен не обновлен!")
                }
            } catch (error) {
                console.error("Ошибка получения данных модели:", error);
            } finally {
                setLoading(false);
            }
        };

        void fetchData();
    }, [form, t]);

    // Синхронизируем s3FilesEnabled с значением из формы при изменении modelData
    useEffect(() => {
        if (modelData) {
            const hasS3Data = modelData.s3 || modelData.s3_enabled || modelData.s3files || false;
            setS3FilesEnabled(hasS3Data);
        }
    }, [modelData]);

    if (loading) {
        return (
            <div className="create-model-container">
                <div className="loading-container">
                    <Spin size="large"/>
                    <div className="loading-text">{t("createModelLoading") || "Загрузка данных..."}</div>
                </div>
            </div>
        );
    }

    // Обработчик удаления модели
    const onModelDeleted = async () => {
        form.resetFields();
        setModelData(null);
        setButtonDisabled(true);
        // Обновляем данные после удаления
        await refreshModelsData();
    };

    // Функция для обновления данных всех моделей
    const refreshModelsData = async () => {
        try {
            const data = await getModelData();
            const models = extractAllModels(data);
            const activeProviderName = getActiveProviderName(data);

            setAllModelsData(models);
            setActiveProviderState(activeProviderName);

            // Если текущий выбранный провайдер еще существует, обновляем его данные
            if (selectedProvider && models[selectedProvider]) {
                const providerData = models[selectedProvider];
                setModelData(providerData);
                loadProviderDataToForm(providerData);
            } else if (activeProviderName && models[activeProviderName]) {
                // Иначе загружаем активный провайдер
                const providerData = models[activeProviderName];
                setSelectedProvider(activeProviderName);
                setModelData(providerData);
                loadProviderDataToForm(providerData);
            } else {
                // Нет данных - сбрасываем
                setModelData(null);
                setSelectedProvider(null);
                form.resetFields();
            }

        } catch (error) {
            console.error("Ошибка обновления данных моделей:", error);
        }
    };

    // Функция загрузки данных провайдера в форму
    const loadProviderDataToForm = (providerData) => {
        if (!providerData) {
            console.warn("loadProviderDataToForm: провайдер данных пустой");
            return;
        }

        const hasS3Data = providerData.s3 || providerData.s3_enabled || providerData.s3files || false;

        // Обновляем состояние S3 файлов
        setS3FilesEnabled(hasS3Data);

        // Обновляем состояние Google OAuth
        const googleOAuth = providerData.g_oauth;
        const isGoogleOAuthEnabled = googleOAuth && typeof googleOAuth === 'object' &&
            (googleOAuth.calendar || googleOAuth.sheets);
        setGoogleOAuthEnabled(isGoogleOAuthEnabled);

        // API хранит обычную и realtime-модели в use_model_name.
        const rawGptType = providerData.use_model_name?.gpttype;
        const normalizedGptType = rawGptType?.name || '';

        form.setFieldsValue({
            name: providerData.name || "",
            prompt: providerData.instructions || providerData.prompt || "",
            action: providerData.mact || "",
            triggers: providerData.trig || [],
            fileids: providerData.fileids || providerData.fileIds || [],
            search: providerData.search || false,
            operator: providerData.operator || false,
            haunter: providerData.haunter || false,
            interpreter: providerData.interpreter || providerData.interp || false,
            s3files: hasS3Data,
            image: providerData.image || false,
            web_search: providerData.web_search || false,
            // Маппинг g_oauth с сервера на google_oauth в форме
            google_oauth: providerData.g_oauth && typeof providerData.g_oauth === 'object'
                ? providerData.g_oauth
                : false,
            espero: providerData.espero || {
                wait: 2,
                limit: 1024,
            },
            gpttype: normalizedGptType,
            realtime_gpttype: providerData.use_model_name?.realtime || null,
        });

        // Проверяем что значения действительно установились
        setTimeout(() => {
            form.getFieldsValue();
        }, 100);
    };

    // Обработчик смены провайдера
    const handleProviderChange = (provider) => {
        // Если выбираем тот же провайдер - ничего не делаем
        if (provider === selectedProvider) {
            return;
        }

        // Проверяем наличие несохраненных изменений
        if (!isButtonDisabled && modelData) {
            // Сохраняем провайдер, на который хотим переключиться
            setPendingProvider(provider);
            // Показываем модальное окно
            setIsConfirmModalOpen(true);
        } else {
            // Нет изменений - просто переключаем
            void switchProvider(provider);
        }
    };

    // Обработчик подтверждения переключения провайдера
    const handleConfirmSwitch = () => {
        setIsConfirmModalOpen(false);
        if (pendingProvider) {
            void switchProvider(pendingProvider);
            setPendingProvider(null);
        }
    };

    // Обработчик отмены переключения провайдера
    const handleCancelSwitch = () => {
        setIsConfirmModalOpen(false);
        setPendingProvider(null);
    };

    // Функция переключения провайдера
    const switchProvider = async (provider) => {
        setProviderLoading(true);
        try {
            // Сначала сбрасываем форму полностью
            form.resetFields();

            // Небольшая задержка для корректной работы resetFields
            await new Promise(resolve => setTimeout(resolve, 50));

            setSelectedProvider(provider);
            const providerData = allModelsData[provider];

            if (providerData) {
                // Провайдер существует - загружаем данные
                setModelData(providerData);
                loadProviderDataToForm(providerData);
                setButtonDisabled(true);
            } else {
                // Провайдер не существует - устанавливаем пустую форму
                setModelData(null);
                // Устанавливаем пустые значения после resetFields
                form.setFieldsValue({
                    name: "",
                    prompt: "",
                    action: "",
                    triggers: [],
                    fileids: [],
                    search: false,
                    operator: false,
                    interpreter: false,
                    s3files: false,
                    image: false,
                    web_search: false,
                    google_oauth: false,
                    espero: {
                        wait: 2,
                        limit: 1024,
                    }
                });
                setButtonDisabled(true);
            }
        } finally {
            setProviderLoading(false);
        }
    };

    // Обработчик установки активного провайдера
    const handleSetActiveProvider = async (provider) => {
        setProviderLoading(true);
        try {
            const response = await setActiveProvider(provider);
            if (response.status === "ok") {
                setActiveProviderState(provider);

                // Получаем значение active_channels из ответа
                const hasActiveServices = response.active_channels;

                // Если есть активные сервисы, показываем модальное окно
                if (hasActiveServices) {
                    setIsRestartServicesModalOpen(true);
                }

                await refreshModelsData();
            } else {
            }
        } catch (error) {
            console.error("Ошибка при установке активного провайдера:", error);
        } finally {
            setProviderLoading(false);
        }
    };

    // Обработчик изменений формы
    const handleValuesChange = (changedValues, allValues) => {
        // Обновляем состояние S3 файлов для передачи в Mistral_Interpreter
        if (changedValues.s3files !== undefined) {
            setS3FilesEnabled(changedValues.s3files);
        }

        // Обновляем состояние Google OAuth для передачи в Google_Interpreter
        if (changedValues.google_oauth !== undefined) {
            const isOAuthEnabled = changedValues.google_oauth &&
                (changedValues.google_oauth.calendar || changedValues.google_oauth.sheets);
            setGoogleOAuthEnabled(isOAuthEnabled);
        }

        if (modelData) {
            // Для существующей модели - проверяем, были ли изменения по сравнению с исходными данными
            const hasChanges =
                allValues.name !== modelData.name ||
                allValues.prompt !== (modelData.instructions || modelData.prompt) ||
                allValues.action !== (modelData.mact || "") ||
                JSON.stringify(allValues.triggers || []) !== JSON.stringify(modelData.trig || []) ||
                JSON.stringify(allValues.fileids || []) !== JSON.stringify(modelData.fileIds || modelData.fileids || []) ||
                allValues.operator !== (modelData.operator || false) ||
                allValues.interp !== (modelData.interpreter || modelData.interp || false) ||
                allValues.s3files !== (modelData.s3_enabled || modelData.s3 || false) ||
                // Сравниваем google_oauth (форма) с g_oauth (сервер)
                JSON.stringify(allValues.google_oauth || false) !== JSON.stringify(modelData.g_oauth || false) ||
                JSON.stringify(allValues.espero || {}) !== JSON.stringify(modelData.espero || {wait: 2, limit: 1024}) ||
                // Сравниваем обе модели формы с use_model_name на сервере.
                (allValues.gpttype?.name || allValues.gpttype || "") !==
                    (modelData.use_model_name?.gpttype?.name || "") ||
                (allValues.realtime_gpttype?.name || allValues.realtime_gpttype || "") !==
                    (modelData.use_model_name?.realtime?.name || "") ||
                // Проверка для Mistral провайдера
                (selectedProvider === 'mistral' && (
                    allValues.image !== (modelData.image || false) ||
                    allValues.web_search !== (modelData.web_search || false)
                )) ||
                // Проверка Realtime (только OpenAI)
                (selectedProvider === 'openai' && (
                    allValues.realtime !== (modelData.realtime || false) ||
                    JSON.stringify(allValues.realtime_vad || null) !== JSON.stringify(modelData.realtime_vad || null)
                ));

            setButtonDisabled(!hasChanges);
        } else {
            // Для новой модели - проверяем наличие обязательных полей включая провайдер
            const hasName = allValues.name && allValues.name.trim().length > 0;
            const hasPrompt = allValues.prompt && allValues.prompt.trim().length > 0;
            const hasProvider = selectedProvider !== null;
            setButtonDisabled(!(hasName && hasPrompt && hasProvider));
        }
    };

    const onFinish = async (values) => {
        // Делаем кнопку неактивной перед отправкой данных
        setButtonDisabled(true);

        // Проверяем, что провайдер выбран
        if (!selectedProvider) {
            showErrorNotification(t("createModelErrorProvider") || "Ошибка создания модели", t("createModelProviderNotSelected") || "Провайдер не выбран. Пожалуйста, выберите провайдера AI модели.");
            setButtonDisabled(false);
            return;
        }

        // Отправка данных модели
        const isCreatingNew = !modelData;
        // Вызываем универсальную функцию saveModelData с разными параметрами в зависимости от типа операции
        const response = await saveModelData({
            values,
            isUpdate: !!modelData, // true если модель уже существует, false для создания новой
            provider: selectedProvider // Передаем выбранный провайдер
        });

        if (response.status === "ok") {
            showNotification(
                modelData ? (t("createModelModelUpdated") || "Модель обновлена") : (t("createModelModelCreated") || "Новая модель"),
                modelData ? (t("createModelUpdateSuccess") || "Изменения успешно сохранены!") : (t("createModelCreateSuccess") || "Успешно сохранена!")
            );

            // Обновляем данные после сохранения
            await refreshModelsData();

        } else {
            showErrorNotification(
                modelData ? (t("createModelUpdateError") || "Ошибка обновления") : (t("createModelSaveError") || "Ошибка сохранения"),
                modelData ? (t("createModelUpdateErrorMsg") || "Модель не обновлена") : (t("createModelCreateErrorMsg") || "Новой модели")
            );
            setButtonDisabled(false); // Делаем кнопку активную в случае ошибки
        }
    };

    // Функция для запуска тура
    const startTour = () => {
        setTourVisible(true);
        setCurrent(0);
        setTourPanelState('createmodel', false); // Сохраняем состояние скрытой панели
    };

    // Функция для показа панели Tour при клике на FloatButton
    const showTourPanel = () => {
        setTourPanelVisible(true);
        setTourPanelState('createmodel', true); // Сохраняем состояние показанной панели
    };

    // Функция для скрытия панели Tour
    const hideTourPanel = () => {
        setTourPanelVisible(false);
        setTourPanelState('createmodel', false); // Сохраняем состояние скрытой панели
    };

    return (
        <div className="create-model-container">
            <div className="section-title create-model-header" ref={headerRef}>
                <RobotOutlined/>
                {modelData ? (t("createModelHeaderEdit") || 'Редактирование модели агента') : (t("createModelHeaderCreate") || 'Создание модели агента')}
                {modelData && activeProvider && selectedProvider === activeProvider && (
                    <div className="status-indicator success">
                        <span>{t("createModelActive") || "✓ Модель активна"}</span>
                    </div>
                )}
            </div>
            <div className="section-description">
                {modelData
                    ? (t("createModelEditDesc") || 'Внесите изменения в настройки вашей модели агента')
                    : (t("createModelCreateDesc") || 'Настройте параметры для создания персонализированного ИИ-агента')
                }
            </div>

            {/* Селектор провайдеров */}
            <ModelSelector
                allModelsData={allModelsData}
                activeProvider={activeProvider}
                selectedProvider={selectedProvider}
                onSelectProvider={handleProviderChange}
                onSetActive={handleSetActiveProvider}
                loading={providerLoading}
                hasUnsavedChanges={!isButtonDisabled && !!modelData}
                setSelectedMenu={onMenuChange}
            />

            {!modelData && !selectedProvider && (
                <div style={{
                    padding: '12px',
                    marginBottom: '16px',
                    background: '#fff7e6',
                    border: '1px solid #ffd591',
                    borderRadius: '4px',
                    color: '#d48806'
                }}>
                    {t("createModelSelectProviderWarning") || "⚠️ Выберите провайдера AI модели выше, чтобы начать создание"}
                </div>
            )}

            {(modelData || selectedProvider) && (
                <div className="tour-layout">
                <div className="tour-content">
                    <Spin spinning={providerLoading}
                          description={t("createModelProviderLoadingTip") || "Загрузка данных провайдера..."}>
                        <Form
                            form={form}
                            name="createModel"
                            key={selectedProvider || 'no-provider'}
                            onFinish={onFinish}
                            onValuesChange={handleValuesChange}
                            layout="vertical"
                        >
                            {/* Секция имени модели */}
                            <div className="form-section model-name-section" ref={basicInfoRef}>
                                <div className="section-title">
                                    <UserOutlined/>
                                    {t("createModelBasicInfoSection") || "Основная информация"}
                                </div>
                                <div className="section-description">
                                    {t("createModelBasicInfoNote") || "Имя модели не влияет на промпт, но помогает идентифицировать агента в получаемых уведомлениях."}
                                </div>

                                {/*{!modelData && !selectedProvider && (*/}
                                {/*    <div style={{*/}
                                {/*        padding: '12px',*/}
                                {/*        marginBottom: '16px',*/}
                                {/*        background: '#fff7e6',*/}
                                {/*        border: '1px solid #ffd591',*/}
                                {/*        borderRadius: '4px',*/}
                                {/*        color: '#d48806'*/}
                                {/*    }}>*/}
                                {/*        {t("createModelSelectProviderWarning") || "⚠️ Выберите провайдера AI модели выше, чтобы начать создание"}*/}
                                {/*    </div>*/}
                                {/*)}*/}

                                <Form.Item
                                    name="name"
                                    label={t("createModelNameLabel") || "Название модели"}
                                    rules={[
                                        {
                                            required: true,
                                            message: t("createModelNameRequired") || "Пожалуйста, введите имя модели!",
                                        },
                                        {
                                            pattern: /^[a-zA-Zа-яё0-9\s\-_]+$/,
                                            message: t("createModelNamePattern") || "Имя модели может содержать только буквы, цифры, дефис и пробелы!",
                                        },
                                    ]}
                                >
                                    <Input
                                        prefix={<UserOutlined/>}
                                        placeholder={t("createModelNamePlaceholder") || "Например: Мой агент"}
                                        size="large"
                                    />
                                </Form.Item>

                            </div>

                            {/* Секция промпта */}
                            <div className="form-section model-name-section" ref={promptRef}>
                                <Form.Item name="prompt">
                                    <Prompt modelData={modelData}
                                            loadTemplateButtonRef={loadTemplateButtonRef}/>
                                </Form.Item>
                            </div>

                            {/* Секция операторов */}
                            <div className="form-section model-name-section" ref={operatorRef}>
                                <Form.Item name="operator">
                                    <Operator initial={modelData?.operator}/>
                                </Form.Item>
                            </div>

                            {/* Секция Lead Hunter */}
                            <div className="form-section model-name-section">
                                <Form.Item name="haunter" key={`leadhaunter-${i18n.language}`}>
                                    <LeadHaunter
                                        initial={modelData?.haunter}
                                    />
                                </Form.Item>
                            </div>

                            {/* Секция целей */}
                            <div className="form-section model-name-section" ref={targetRef}>
                                <Form.Item name="action">
                                    <Target initial={modelData?.mact}/>
                                </Form.Item>
                            </div>

                            {/* Секция триггеров */}
                            <div className="form-section model-name-section" ref={triggersRef}>
                                <Form.Item name="triggers">
                                    <Triggers initial={modelData?.trig}/>
                                </Form.Item>
                            </div>

                            {/* Секция файлов для дообучения */}
                            {selectedProvider === 'openai' || selectedProvider === 'google' ? (
                                <div className="form-section model-name-section" ref={filesRef}>
                                    <Form.Item name="embedding_docs">
                                        <Embedding
                                            toForm={form}
                                            initialDocuments={modelData?.embedding_docs}
                                            modelData={modelData}
                                            provider={selectedProvider || ''}
                                            onEmbeddingChange={() => {
                                                // Автоматически обновляем модель после изменения эмбеддингов
                                                if (updateModelRef.current) {
                                                    void updateModelRef.current.triggerUpdate();
                                                }
                                            }}
                                        />
                                    </Form.Item>
                                </div>
                            ) : (
                                <div className="form-section model-name-section" ref={filesRef}>
                                    <Form.Item name="fileids">
                                        <UploadFiles
                                            toForm={form}
                                            initialFiles={modelData?.fileIds}
                                            modelData={modelData}
                                            setButtonDisabled={setButtonDisabled}
                                            provider={selectedProvider || ''}
                                        />
                                    </Form.Item>
                                </div>
                            )}

                            {/* Секция S3 файлов */}
                            <div className="form-section model-name-section" ref={s3FilesRef}>
                                <Form.Item
                                    name="s3files"
                                >
                                    {/*<S3Files*/}
                                    {/*    initialS3Enabled={modelData?.s3_enabled || false}*/}
                                    {/*/>*/}
                                    <S3storage
                                        initialS3Enabled={modelData?.s3_enabled || false}
                                    />
                                </Form.Item>
                            </div>

                            {/* Секция Google OAuth Integration */}
                            {(selectedProvider === 'openai' || selectedProvider === 'mistral' || selectedProvider === 'anthropic' || selectedProvider === 'google') && (
                                <div className="form-section model-name-section" ref={googleOAuthRef}>
                                    <Form.Item
                                        name="google_oauth"
                                        valuePropName="value"
                                        trigger="onChange"
                                    >
                                        <GoogleOAuth
                                            provider={selectedProvider || ''}
                                            disabled={!selectedProvider}
                                            hasModel={!!modelData}
                                        />
                                    </Form.Item>
                                </div>
                            )}

                            {/* Секция интерпретатора */}
                            <div className="form-section model-name-section" ref={interpreterRef}>
                                <Form.Item name="interp">
                                    {selectedProvider === 'mistral' ? (
                                        <MistralInterpreter
                                            toForm={form}
                                            initialFiles={modelData?.interpreter || modelData?.interp}
                                            initialImage={modelData?.image}
                                            initialWebSearch={modelData?.web_search}
                                            s3FilesEnabled={s3FilesEnabled}
                                        />
                                    ) : selectedProvider === 'google' ? (
                                        <GoogleInterpreter
                                            toForm={form}
                                            initialFiles={modelData?.interpreter || modelData?.interp}
                                            initialImage={modelData?.image}
                                            initialVideo={modelData?.video}
                                            initialWebSearch={modelData?.web_search}
                                            s3FilesEnabled={s3FilesEnabled}
                                            googleOAuthEnabled={googleOAuthEnabled}
                                        />
                                    ) : (
                                        <OpenaiInterpreter
                                            toForm={form}
                                            initialFiles={modelData?.interpreter || modelData?.interp}
                                            initialWebSearch={modelData?.web_search}
                                        />
                                    )}
                                </Form.Item>
                                {/* Скрытые поля для OpenAI провайдера */}
                                {selectedProvider === 'openai' && (
                                    <>
                                        <Form.Item name="interpreter" hidden>
                                            <input type="hidden"/>
                                        </Form.Item>
                                        <Form.Item name="web_search" hidden>
                                            <input type="hidden"/>
                                        </Form.Item>
                                    </>
                                )}
                                {/* Скрытые поля для Mistral провайдера */}
                                {selectedProvider === 'mistral' && (
                                    <>
                                        <Form.Item name="interpreter" hidden>
                                            <input type="hidden"/>
                                        </Form.Item>
                                        <Form.Item name="image" hidden>
                                            <input type="hidden"/>
                                        </Form.Item>
                                        <Form.Item name="web_search" hidden>
                                            <input type="hidden"/>
                                        </Form.Item>
                                    </>
                                )}
                                {/* Скрытые поля для Google провайдера */}
                                {selectedProvider === 'google' && (
                                    <>
                                        <Form.Item name="interpreter" hidden>
                                            <input type="hidden"/>
                                        </Form.Item>
                                        <Form.Item name="image" hidden>
                                            <input type="hidden"/>
                                        </Form.Item>
                                        <Form.Item name="video" hidden>
                                            <input type="hidden"/>
                                        </Form.Item>
                                        <Form.Item name="web_search" hidden>
                                            <input type="hidden"/>
                                        </Form.Item>
                                    </>
                                )}
                            </div>

                            {/* Секция Espero */}
                            <div className="form-section model-name-section" ref={esperoRef}>
                                <Form.Item name="espero">
                                    <Espero/>
                                </Form.Item>
                            </div>

                            {/* Секция OpenAI Realtime — только для провайдера openai */}
                            {selectedProvider === 'openai' && (
                                <div className="form-section model-name-section">
                                    <Form.Item name="realtime_vad">
                                        <OpenaiRealtime
                                            provider={selectedProvider}
                                            toForm={form}
                                            modelData={modelData}
                                            initialRealtime={modelData?.realtime || false}
                                            initialRealtimeVAD={modelData?.realtime_vad || null}
                                        />
                                    </Form.Item>
                                    <Form.Item name="realtime" hidden>
                                        <input type="hidden"/>
                                    </Form.Item>
                                </div>
                            )}

                            {/* Секция Google Realtime — только для провайдера google */}
                            {selectedProvider === 'google' && (
                                <div className="form-section model-name-section">
                                    <Form.Item name="google_realtime_vad">
                                        <GoogleRealtime
                                            provider={selectedProvider}
                                            toForm={form}
                                            initialRealtime={!!(modelData?.realtime_vad?.google)}
                                            initialRealtimeVAD={modelData?.realtime_vad?.google ? {
                                                ...modelData.realtime_vad.google,
                                                initial_greeting: modelData.realtime_vad.initial_greeting ?? true,
                                                greeting: modelData.realtime_vad.greeting ?? null,
                                            } : null}
                                        />
                                    </Form.Item>
                                </div>
                            )}

                            {selectedProvider === 'mistral' && (
                                <div className="form-section model-name-section">
                                    <Form.Item name="realtime_vad">
                                        <MistralRealtime
                                            provider={selectedProvider}
                                            toForm={form}
                                            modelData={modelData}
                                            initialRealtime={modelData?.realtime || false}
                                            initialRealtimeVAD={modelData?.realtime_vad ? {
                                                ...modelData.realtime_vad.mistral,
                                                initial_greeting: modelData.realtime_vad.initial_greeting ?? true,
                                                greeting: modelData.realtime_vad.greeting ?? null,
                                            } : null}
                                        />
                                    </Form.Item>
                                    <Form.Item name="realtime" hidden>
                                        <input type="hidden" />
                                    </Form.Item>
                                </div>
                            )}

                            {/*Секция типов GPT */}
                            <div className="form-section model-name-section" ref={gptTypeRef}>
                                <Form.Item name="gpttype">
                                    <TypesGPT
                                        provider={selectedProvider}
                                        modelType="general"
                                    />
                                </Form.Item>
                            </div>

                            {/* Кнопки действий */}
                            <div className="create-model-buttons" ref={buttonsRef}>
                                {modelData ? (
                                    <UpdateModel
                                        ref={updateModelRef}
                                        setButtonDisabled={setButtonDisabled}
                                        modelData={modelData}
                                        form={form}
                                        onModelUpdated={refreshModelsData}
                                        isButtonDisabled={isButtonDisabled}
                                        selectedProvider={selectedProvider}
                                    />
                                ) : (
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        disabled={isButtonDisabled || !selectedProvider}
                                        size="large"
                                    >
                                        <RobotOutlined/>
                                        {t("createModelCreateButton") || "Создать модель"}
                                    </Button>
                                )}

                                {modelData && (
                                    <Button
                                        type="primary"
                                        size="large"
                                        icon={<ExperimentOutlined/>}
                                        onClick={() => setIsTestModalOpen(true)}
                                        style={{
                                            color: 'black',
                                        }}
                                    >
                                        {t("createModelTestButton") || "Тестировать модель"}
                                    </Button>
                                )}

                                {modelData &&
                                    <DeleteModel onModelDeleted={onModelDeleted} selectedProvider={selectedProvider}/>}
                            </div>
                        </Form>
                    </Spin>
                </div>

                {/* Панель управления Tour справа */}
                {tourPanelVisible && (
                    <div className="tour-controls tour-primary">
                        <div className="tour-controls-header">
                            <RobotOutlined className="tour-controls-icon"/>
                            <h3 className="tour-controls-title">
                                {t("createModelTourTitle") || "Интерактивный обзор"}
                            </h3>
                            <p className="tour-controls-subtitle">
                                {t("createModelTourSubtitle") || "Изучите создание ИИ-агента пошагово"}
                            </p>
                        </div>

                        <div className="tour-start-button">
                            <Button
                                type="primary"
                                block
                                size="large"
                                onClick={startTour}
                            >
                                {t("createModelTourStartButton") || "🤖 Начать тур"}
                            </Button>
                        </div>

                        {tourVisible && (
                            <div className="tour-progress">
                                <div className="tour-progress-step">
                                    <span className="tour-progress-step-text">
                                        {t("createModelTourStep") || "Шаг"} {current + 1} {t("createModelTourOf") || "из"} {steps.length}
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
                            <div
                                className="tour-info-title">{t("createModelTourWhatLearn") || "🎯 Что вы изучите:"}</div>
                            <ul className="tour-info-list">
                                <li>{t("createModelTourLearn1") || "Настройка имени и промпта"}</li>
                                <li>{t("createModelTourLearn2") || "Загрузка базового шаблона"}</li>
                                <li>{t("createModelTourLearn3") || "Настройка операторского режима"}</li>
                                <li>{t("createModelTourLearn4") || "Определение целей агента"}</li>
                                <li>{t("createModelTourLearn5") || "Создание триггеров активации"}</li>
                                <li>{t("createModelTourLearn6") || "Загрузка файлов знаний"}</li>
                                <li>{t("createModelTourLearn7") || "Настройка интерпретатора"}</li>
                                <li>{t("createModelTourLearn8") || "Параметры производительности"}</li>
                                {showSimpleAuth && <li>{t("createModelTourLearn9") || "Выбор языковой модели"}</li>}
                                <li>{t("createModelTourLearn10") || "Сохранение и управление"}</li>
                            </ul>
                        </div>
                    </div>
                )}
                </div>
            )}

            <Tour
                open={tourVisible}
                onClose={() => {
                    setTourVisible(false);
                    setCurrent(0);
                    hideTourPanel()
                }}
                steps={steps}
                current={current}
                onChange={setCurrent}
                indicatorsRender={(current, total) => (
                    <span className="tour-indicator">
                        {current + 1} / {total}
                    </span>
                )}
                type="primary"
                arrow={false}
            />

            <FloatButton
                icon={<QuestionCircleOutlined/>}
                tooltip={t("createModelTourFloatButton") || "Начать обзор конструктора моделей"}
                onClick={showTourPanel}
                className="tour-float-button"
            />

            {/* Модальное окно подтверждения переключения провайдера */}
            <Modal
                title={t("createModelConfirmTitle") || "Есть не сохранённые изменения модели!"}
                open={isConfirmModalOpen}
                onOk={handleConfirmSwitch}
                onCancel={handleCancelSwitch}
                okText={t("createModelConfirmOk") || "Переключить модель"}
                cancelText={t("channelsCancelButton") || "Отмена"}
                okButtonProps={{danger: true}}
                mask={{ closable: false }}
                centered
                zIndex={10000}
            >
                <p>{t("createModelConfirmText") || "При переключении на другую модель все несохранённые изменения будут потеряны. Вы уверены?"}</p>
            </Modal>

            {/* Модальное окно перезапуска сервисов */}
            <Modal
                title={restartProgressVisible ? (t("createModelRestartTitleProgress") || "Перезапуск сервисов в процессе...") : (t("createModelRestartTitle") || "Перезапуск сервисов")}
                open={isRestartServicesModalOpen}

                onOk={async () => {
                    if (!restartProgressVisible) {
                        // Начинаем процесс перезапуска
                        try {
                            setRestartLoading(true);
                            setRestartProgressVisible(true);
                            setRestartMessages([]);
                            setRestartComplete(false);

                            // Функция для перевода сообщений от сервера
                            const translateMessage = (msg) => {
                                const translations = {
                                    '🔌 Соединение с сервером установлено': t("chUtilsConnectionEstablished") || '🔌 Соединение с сервером установлено',
                                    '✅ Перезапуск сервисов завершен успешно': t("chUtilsRestartCompleted") || '✅ Перезапуск сервисов завершен успешно',
                                    '❌ Произошла ошибка при перезапуске сервисов': t("chUtilsRestartError") || '❌ Произошла ошибка при перезапуске сервисов',
                                    '❌ Ошибка соединения с сервером': t("chUtilsConnectionError") || '❌ Ошибка соединения с сервером'
                                };
                                return translations[msg] || msg;
                            };

                            // Передаём callback для получения сообщений
                            await restartActiveChannels((message) => {
                                setRestartMessages(prev => [...prev, translateMessage(message)]);
                            });

                            setRestartComplete(true);
                            setRestartLoading(false);

                            setTimeout(() => {
                                showNotification(t("createModelRestartSuccess") || 'Успешно', t("createModelRestartSuccessMsg") || 'Активные сервисы перезапущены');
                                setRestartProgressVisible(false);
                                setIsRestartServicesModalOpen(false);
                            }, 2000);
                        } catch (error) {
                            setRestartMessages(prev => [...prev, `❌ ${error.message || (t("createModelRestartErrorMsg") || 'Ошибка при перезапуске активных сервисов')}`]);
                            showErrorNotification(t("createModelRestartError") || 'Ошибка', error.message || (t("createModelRestartErrorMsg") || 'Ошибка при перезапуске активных сервисов'));
                            setRestartLoading(false);
                        }
                    } else {
                        // Закрываем окно после завершения
                        setRestartProgressVisible(false);
                        setIsRestartServicesModalOpen(false);
                    }
                }}
                onCancel={() => {
                    setRestartProgressVisible(false);
                    setIsRestartServicesModalOpen(false);
                }}
                okText={restartProgressVisible ? (t("createModelRestartOkComplete") || "Закрыть") : (t("createModelRestartOk") || "Перезапустить")}
                okButtonProps={{
                    style: {color: 'black'},
                    disabled: restartLoading
                }}
                cancelText={t("channelsCancelButton") || "Отмена"}
                cancelButtonProps={{
                    style: {display: restartProgressVisible ? 'none' : 'inline-block'}
                }}
                closable={!restartLoading}
                mask={{ closable: false }}
                centered
                zIndex={10000}
            >
                {!restartProgressVisible ? (
                    <p>{t("createModelRestartText") || "Есть активные сервисы работающие со старой моделью Агента, перезапустить сервисы?"}</p>
                ) : (
                    <>
                        {restartLoading && <Spin size="large"/>}
                        <div style={{marginTop: '20px', maxHeight: '300px', overflowY: 'auto'}}>
                            {restartMessages.map((msg, index) => (
                                <div key={index} style={{
                                    marginBottom: '8px',
                                    padding: '8px',
                                    backgroundColor: 'var(--dialog-bg-color)',
                                    borderRadius: '4px'
                                }}>
                                    {msg}
                                </div>
                            ))}
                        </div>
                        {restartComplete && (
                            <div style={{marginTop: '16px', textAlign: 'center'}}>
                                <CheckCircleOutlined style={{fontSize: '24px', color: '#52c41a', marginRight: '8px'}}/>
                                <span>{t("createModelRestartComplete") || "Перезапуск завершен!"}</span>
                            </div>
                        )}
                    </>
                )}
            </Modal>

            {/* Модальное окно тестирования модели */}
            <Modal
                // title={
                //     <span>
                //         <ExperimentOutlined /> {t("modelTest") || "Тестирование модели"}
                //     </span>
                // }
                open={isTestModalOpen}
                onCancel={() => setIsTestModalOpen(false)}
                footer={null}
                width={900}
                centered={false}
                style={{top: '50px'}}
                styles={{
                    body: {
                        padding: '0',
                        height: 'calc(100vh - 200px)',
                        display: 'flex',
                        flexDirection: 'column'
                    }
                }}
            >
                <ModelTest disabled={false} provider={selectedProvider || undefined}/>
            </Modal>
        </div>
    );
};
