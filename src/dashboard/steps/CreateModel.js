import React, {useEffect, useState, useRef} from "react";
import {Button, Form, Input, Spin, Tour, FloatButton} from "antd";
import {UserOutlined, RobotOutlined, QuestionCircleOutlined} from "@ant-design/icons";
import "../steps.css"
import "./CreateModel.css"
import './Tour.css';
import {Target} from "./CreateModelFormElements/Target";
import {Triggers} from "./CreateModelFormElements/Triggers";
import {getModelData} from "./getModelData";
import {DeleteModel} from "./deleteModel";
import {showErrorNotification, showNotification, showWarningNotification} from "../hotification/showNotification";
import {validateAndRefreshToken} from "../../utils/easyUtils";
import {getTourPanelState, setTourPanelState} from "../../utils/cookieUtils";
import {UpdateModel} from "./updateModel";
import {Espero} from "./CreateModelFormElements/Espero";
import {TypesGPT} from "./CreateModelFormElements/TypesGPT";
import {UploadFiles} from "./CreateModelFormElements/UploadFiles";
import {S3Files} from "./CreateModelFormElements/S3Files";
import {saveModelData} from "./saveModelData";
import {Prompt} from "./CreateModelFormElements/Prompt";
import {Interpreter} from "./CreateModelFormElements/Interpreter";
import {getRealUserId} from "./getRealUserId";
import {Operator} from "./CreateModelFormElements/Operator";


export const CreateModel = () => {
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const [form] = Form.useForm(); // Создаём экземпляр формы
    const [isButtonDisabled, setButtonDisabled] = useState(true)
    const [modelData, setModelData] = useState(null);
    const [userId, setUserId] = useState(null);
    const [tourVisible, setTourVisible] = useState(false);
    const [current, setCurrent] = useState(0);
    const [tourPanelVisible, setTourPanelVisible] = useState(getTourPanelState('createmodel')); // Состояние для видимости панели
    const showSimpleAuth = process.env.REACT_APP_SHOW_SIMPLE_AUTH === "true";

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
    const interpreterRef = useRef(null);
    const esperoRef = useRef(null);
    const gptTypeRef = useRef(null);
    const buttonsRef = useRef(null);

    const steps = [
        {
            title: '🤖 Добро пожаловать в конструктор моделей',
            description: 'Здесь вы можете создать и настроить свою собственную модель ИИ-ассистента с персонализированными параметрами.',
            target: () => headerRef.current,
        },
        {
            title: '📝 Основная информация',
            description: 'Введите название вашей модели. Это имя будет отображаться в интерфейсах и поможет идентифицировать вашего ассистента.',
            target: () => basicInfoRef.current,
        },
        {
            title: '💬 Системный промпт',
            description: 'Настройте промпт - это основные инструкции, которые определяют характер, стиль общения и поведение вашего ассистента.',
            target: () => promptRef.current,
        },
        {
            title: '📋 Базовый шаблон промпта',
            description: 'Для быстрого старта вы можете использовать базовый шаблон промпта. Нажмите кнопку "Загрузить шаблон промпта" чтобы загрузить готовый шаблон, который можно редактировать под свои нужды.',
            target: () => loadTemplateButtonRef.current,
        },
        {
            title: '👨‍💼 Операторский режим',
            description: 'Включите возможность переключения на живых операторов. Настройте список Telegram ID операторов, которые будут отвечать пользователям при срабатывании определенных условий в промпте.',
            target: () => operatorRef.current,
        },
        {
            title: '🎯 Цели и задачи',
            description: 'Определите конкретные цели и задачи, которые должен выполнять ваш ассистент. Это поможет ему быть более целенаправленным.',
            target: () => targetRef.current,
        },
        {
            title: '⚡ Триггеры активации',
            description: 'Настройте ключевые слова и фразы, которые будут активировать определенные функции или реакции вашего ассистента.',
            target: () => triggersRef.current,
        },
        {
            title: '📁 Загрузка файлов',
            description: 'Загрузите документы, которые ассистент сможет использовать для ответов. Поддерживаются текстовые файлы, PDF и другие форматы.',
            target: () => filesRef.current,
        },
        {
            title: '☁️ Файлы S3',
            description: 'Подключите внешние файлы из облачного хранилища S3 для расширения базы знаний вашего ассистента.',
            target: () => s3FilesRef.current,
        },
        {
            title: '⚙️ Интерпретатор кода',
            description: 'Включите возможность выполнения и интерпретации кода. Ассистент сможет выполнять вычисления и программные задачи.',
            target: () => interpreterRef.current,
        },
        {
            title: '⏱️ Настройки параметров вопроса',
            description: 'Настройте параметры ожидания и лимиты для оптимальной производительности вашего ассистента.',
            target: () => esperoRef.current,
        },
        ...(showSimpleAuth ? [{
            title: '🧠 Языковая модель',
            description: 'Выберите тип языковой модели GPT, которая будет использоваться вашим ассистентом для обработки запросов.',
            target: () => gptTypeRef.current,
        }] : []),
        {
            title: '🚀 Сохранение и управление',
            description: 'Создайте новую модель или обновите существующую. Здесь также доступны функции удаления модели при необходимости.',
            target: () => buttonsRef.current,
        },
        {
            title: '✅ Готово к работе!',
            description: 'Поздравляем! Ваш ИИ-ассистент настроен и готов к использованию. Теперь вы можете интегрировать его в свои проекты.',
            target: () => buttonsRef.current,
        },
    ];

    // Вызов асинхронной функции для получения данных модели
    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = await validateAndRefreshToken(localStorage.getItem("authToken"))
                if (token != null) {
                    setToken(token)
                    // Получаем реальный user_id с сервера
                    const currentUserId = await getRealUserId(token);
                    if (currentUserId) {
                        setUserId(currentUserId);
                    } else {
                        showErrorNotification("Ошибка", "Не удалось получить ID пользователя");
                        return;
                    }

                    const data = await getModelData(token);
                    if (!data || Object.keys(data).length === 0 || !data.name) {
                        showWarningNotification("Модель Ассистента не создана", "Создайте новую модель");
                        setModelData(null);
                        // При отсутствии модели S3 должен быть выключен
                    } else {
                        setModelData(data);

                        // Проверяем, есть ли данные S3 в модели и устанавливаем состояние
                        const hasS3Data = data.s3 || data.s3_enabled || data.s3files || false;

                        form.setFieldsValue({
                            name: data.name || "",
                            prompt: data.prompt || "",
                            action: data.mact || "",
                            triggers: data.trig || [],
                            fileids: data.fileids || data.fileIds || [],
                            search: data.search || false,
                            operator: data.operator || false,
                            interp: data.interpreter || data.interp || false,
                            s3files: hasS3Data,
                            espero: data.espero || {
                                wait: 2,
                                limit: 1024,
                            }
                        });

                        localStorage.setItem("userModel", true);
                    }
                } else {
                    showWarningNotification("Ошибка загрузки модели", "Токен не обновлен!")
                }
            } catch (error) {
                console.error("Ошибка получения данных модели:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [form]);

    if (loading) {
        return (
            <div className="create-model-container">
                <div className="loading-container">
                    <Spin size="large" />
                    <div className="loading-text">Загрузка данных...</div>
                </div>
            </div>
        );
    }

    // Обработчик удаления модели
    const onModelDeleted = () => {
        form.resetFields();
        setModelData(null);
        setButtonDisabled(true);
    };

    // Обработчик изменений формы
    const handleValuesChange = (changedValues, allValues) => {
        if (modelData) {
            // Для существующей модели - проверяем, были ли изменения по сравнению с modelData
            const hasChanges = Object.keys(changedValues).some((key) => modelData?.[key] !== allValues[key]);
            setButtonDisabled(!hasChanges);
        } else {
            // Для новой модели - проверяем наличие обязательных полей
            const hasName = allValues.name && allValues.name.trim().length > 0;
            const hasPrompt = allValues.prompt && allValues.prompt.trim().length > 0;
            setButtonDisabled(!(hasName && hasPrompt));
        }
    };

    const onFinish = async (values) => {
        // Делаем кнопку неактивной перед отправкой данных
        setButtonDisabled(true);

        // Отправка данных модели
        const token = await validateAndRefreshToken(localStorage.getItem("authToken"))
        if (token != null) {
            // Вызываем универсальную функцию saveModelData с разными параметрами в зависимости от типа операции
            const response = await saveModelData({
                token,
                // modelData,
                values,
                isUpdate: !!modelData // true если модель уже существует, false для создания новой
            });

            if (response.status === "ok") {
                showNotification(
                    modelData ? "Модель обновлена" : "Новая модель",
                    modelData ? "Изменения успешно сохранены!" : "Успешно сохранена!"
                );
            } else {
                showErrorNotification(
                    modelData ? "Ошибка обновления" : "Ошибка сохранения",
                    modelData ? "Модель не обновлена" : "Новой модели"
                );
                setButtonDisabled(false); // Делаем кнопку активной в случае ошибки
            }
        } else {
            showWarningNotification("Ошибка сохранения модели", "Токен не обновлен!");
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
                {modelData ? 'Редактирование модели ассистента' : 'Создание модели ассистента'}
                {modelData && (
                    <div className="status-indicator success">
                        <span>✓ Модель активна</span>
                    </div>
                )}
            </div>
            <div className="section-description">
                {modelData
                    ? 'Внесите изменения в настройки вашей модели ассистента'
                    : 'Настройте параметры для создания персонализированного ИИ-ассистента'
                }
            </div>

            <div className="tour-layout">
                <div className="tour-content">
                    <Form
                        form={form}
                        name="createModel"
                        onFinish={onFinish}
                        onValuesChange={handleValuesChange}
                        layout="vertical"
                    >
                        {/* Секция имени модели */}
                        <div className="form-section model-name-section" ref={basicInfoRef}>
                            <div className="section-title">
                                <UserOutlined />
                                Основная информация
                            </div>
                            <div className="section-description">
                                Имя модели не влияет на промпт, но помогает идентифицировать ассистента в получаемых уведомлениях.
                            </div>

                            <Form.Item
                                name="name"
                                label="Название модели"
                                rules={[
                                    {
                                        required: true,
                                        message: "Пожалуйста, введите имя модели!",
                                    },
                                    {
                                        pattern: /^[a-zA-Zа-яё0-9\s\-_]+$/,
                                        message: "Имя модели может содержать только буквы, цифры, дефис и пробелы!",
                                    },
                                ]}
                            >
                                <Input
                                    prefix={<UserOutlined />}
                                    placeholder="Например: Мой ассистент"
                                    size="large"
                                />
                            </Form.Item>

                        </div>

                        {/* Секция промпта */}
                        <div className="form-section model-name-section" ref={promptRef}>
                            <Form.Item name="prompt">
                                <Prompt modelData={modelData} userId={userId} loadTemplateButtonRef={loadTemplateButtonRef}/>
                            </Form.Item>
                        </div>

                        {/* Секция операторов */}
                        <div className="form-section model-name-section" ref={operatorRef}>
                            <Form.Item name="operator">
                                <Operator token={token} initial={modelData?.operator}/>
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

                        {/* Секция файлов */}
                        <div className="form-section model-name-section" ref={filesRef}>
                            <Form.Item name="fileids">
                                <UploadFiles
                                    toForm={form}
                                    initialFiles={modelData?.fileIds}
                                    modelData={modelData}
                                    setButtonDisabled={setButtonDisabled}
                                />
                            </Form.Item>
                        </div>

                        {/* Секция S3 файлов */}
                        <div className="form-section model-name-section" ref={s3FilesRef}>
                            <Form.Item
                                name="s3files"
                                valuePropName="initialS3Enabled"
                                trigger="onChange"
                            >
                                <S3Files
                                    initialS3Enabled={modelData?.s3_enabled || false}
                                />
                            </Form.Item>
                        </div>

                        {/* Секция интерпретатора */}
                        <div className="form-section model-name-section" ref={interpreterRef}>
                            <Form.Item name="interp">
                                <Interpreter toForm={form} initialFiles={modelData?.interpreter || modelData?.interp}/>
                            </Form.Item>
                        </div>

                        {/* Секция Espero */}
                        <div className="form-section model-name-section" ref={esperoRef}>
                            <Form.Item name="espero">
                                <Espero/>
                            </Form.Item>
                        </div>

                        {/* Секция типов GPT */}
                        {showSimpleAuth && (
                            <div className="form-section" ref={gptTypeRef}>
                                <Form.Item name="gptType" label="Языковая модель">
                                    <TypesGPT/>
                                </Form.Item>
                            </div>
                        )}

                        {/* Кнопки действий */}
                        <div className="create-model-buttons" ref={buttonsRef}>
                            {modelData ? (
                                <UpdateModel
                                    setButtonDisabled={setButtonDisabled}
                                    modelData={modelData}
                                    form={form}
                                />
                            ) : (
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    disabled={isButtonDisabled}
                                    size="large"
                                >
                                    <RobotOutlined />
                                    Создать модель
                                </Button>
                            )}

                            {modelData && <DeleteModel onModelDeleted={onModelDeleted}/>}
                        </div>
                    </Form>
                </div>

                {/* Панель управления Tour справа */}
                {tourPanelVisible && (
                    <div className="tour-controls tour-primary">
                        <div className="tour-controls-header">
                            <RobotOutlined className="tour-controls-icon" />
                            <h3 className="tour-controls-title">
                                Интерактивный обзор
                            </h3>
                            <p className="tour-controls-subtitle">
                                Изучите создание ИИ-ассистента пошагово
                            </p>
                        </div>

                        <div className="tour-start-button">
                            <Button
                                type="primary"
                                block
                                size="large"
                                onClick={startTour}
                            >
                                🤖 Начать тур
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
                            <div className="tour-info-title">🎯 Что вы изучите:</div>
                            <ul className="tour-info-list">
                                <li>Настройка имени и промпта</li>
                                <li>Загрузка базового шаблона</li>
                                <li>Настройка операторского режима</li>
                                <li>Определение целей ассистента</li>
                                <li>Создание триггеров активации</li>
                                <li>Загрузка файлов знаний</li>
                                <li>Настройка интерпретатора</li>
                                <li>Параметры производительности</li>
                                {showSimpleAuth && <li>Выбор языковой модели</li>}
                                <li>Сохранение и управление</li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>

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
                icon={<QuestionCircleOutlined />}
                tooltip="Начать обзор конструктора моделей"
                onClick={showTourPanel}
                className="tour-float-button"
            />
        </div>
    );
}
