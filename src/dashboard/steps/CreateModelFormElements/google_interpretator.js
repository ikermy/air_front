import {Modal, Switch} from "antd";
import React, {useEffect, useState, useRef} from "react";
import Title from "antd/lib/typography/Title";
import Paragraph from "antd/lib/typography/Paragraph";
import {CodeOutlined, PictureOutlined, GlobalOutlined, VideoCameraOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import {checkDemo} from "./modUtils";
import {validateAndRefreshToken} from "../../../utils/easyUtils";
import {showErrorNotification} from "../../hotification/showNotification";

export const Google_Interpreter = ({onChange, toForm, initialFiles, initialImage, initialVideo, initialWebSearch, s3FilesEnabled = false}) => {
    const {t} = useTranslation();
    const [isModalOpen, setModalOpen] = useState(false);
    const [switchChecked, setSwitchChecked] = useState(false);
    const [imageChecked, setImageChecked] = useState(false);
    const [videoChecked, setVideoChecked] = useState(false);
    const [webSearchChecked, setWebSearchChecked] = useState(false);
    const [currentS3Status, setCurrentS3Status] = useState(s3FilesEnabled);
    const prevS3FilesEnabled = useRef(s3FilesEnabled);

    // Инициализация при загрузке компонента
    useEffect(() => {
        // Синхронизируем локальное состояние S3 с пропсом
        setCurrentS3Status(s3FilesEnabled);
        prevS3FilesEnabled.current = s3FilesEnabled;

        // Инициализация interp - только если S3 включен
        if (typeof initialFiles === 'boolean') {
            const shouldEnable = initialFiles && s3FilesEnabled;
            setSwitchChecked(shouldEnable);
            if (toForm) {
                toForm.setFieldsValue({ interp: shouldEnable });
            }
        } else if (initialFiles) {
            const shouldEnable = s3FilesEnabled;
            setSwitchChecked(shouldEnable);
            if (toForm) {
                toForm.setFieldsValue({ interp: shouldEnable });
            }
        }

        // Инициализация image - только если S3 включен
        if (typeof initialImage === 'boolean') {
            const shouldEnable = initialImage && s3FilesEnabled;
            setImageChecked(shouldEnable);
            if (toForm) {
                toForm.setFieldsValue({ image: shouldEnable });
            }
        }

        // Инициализация video - только если S3 включен
        if (typeof initialVideo === 'boolean') {
            const shouldEnable = initialVideo && s3FilesEnabled;
            setVideoChecked(shouldEnable);
            if (toForm) {
                toForm.setFieldsValue({ video: shouldEnable });
            }
        }

        // Инициализация web_search
        if (typeof initialWebSearch === 'boolean') {
            setWebSearchChecked(initialWebSearch);
            if (toForm) {
                toForm.setFieldsValue({ web_search: initialWebSearch });
            }
        }
    }, [initialFiles, initialImage, initialVideo, initialWebSearch, toForm, s3FilesEnabled]);

    // Автоматическое отключение переключателей при отключении S3
    useEffect(() => {
        // Проверяем, что S3 был включен и теперь выключен
        if (prevS3FilesEnabled.current && !s3FilesEnabled) {
            let needsUpdate = false;
            const updates = {};

            // Отключаем генерацию файлов
            if (switchChecked) {
                setSwitchChecked(false);
                updates.interp = false;
                needsUpdate = true;
            }

            // Отключаем генерацию изображений
            if (imageChecked) {
                setImageChecked(false);
                updates.image = false;
                needsUpdate = true;
            }

            // Отключаем генерацию видео
            if (videoChecked) {
                setVideoChecked(false);
                updates.video = false;
                needsUpdate = true;
            }

            // Обновляем форму одним вызовом, если были изменения
            if (needsUpdate && toForm) {
                toForm.setFieldsValue(updates);

                // Вызываем onChange для синхронизации с родительским компонентом
                if (typeof onChange === "function") {
                    const allValues = toForm.getFieldsValue();
                    onChange(allValues);
                }
            }
        }

        // Обновляем предыдущее значение
        prevS3FilesEnabled.current = s3FilesEnabled;
    }, [s3FilesEnabled, switchChecked, imageChecked, videoChecked, toForm, onChange]);

    // Автоматическое отключение веб-поиска при включении S3
    useEffect(() => {
        // Если S3 включился и веб-поиск активен
        if (s3FilesEnabled && webSearchChecked) {
            setWebSearchChecked(false);
            if (toForm) {
                toForm.setFieldsValue({ web_search: false });
            }

            // Вызываем onChange для синхронизации
            if (typeof onChange === "function") {
                const allValues = toForm.getFieldsValue();
                onChange(allValues);
            }
        }
    }, [s3FilesEnabled, webSearchChecked, toForm, onChange]);

    const handleSwitchChange = (checked) => {
        setSwitchChecked(checked);

        // Если включаем генерацию файлов, автоматически отключаем веб-поиск
        if (checked && webSearchChecked) {
            setWebSearchChecked(false);
            if (toForm) {
                toForm.setFieldsValue({ web_search: false });
            }
        }

        // Сохраняем значение в форму
        if (toForm) {
            toForm.setFieldsValue({ interp: checked });
        }

        // Если функция onChange существует, вызываем её
        if (typeof onChange === "function") {
            onChange(checked);
        }
    };

    const handleImageChange = async (checked) => {
        // Проверка демо-режима при попытке включить
        if (checked) {
            try {
                const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
                const demoResult = await checkDemo(token);

                if (demoResult.success && demoResult.status === true) {
                    showErrorNotification(t("demoModeNotAvailable") || "Этот режим не доступен в демонстрационном режиме");
                    return;
                }
            } catch (error) {
                console.error("Ошибка проверки демо-режима:", error);
            }
        }

        setImageChecked(checked);

        // Сохраняем значение в форму и триггерим onValuesChange
        if (toForm) {
            toForm.setFieldsValue({ image: checked });
            // Получаем все значения формы и вручную вызываем onChange если он есть
            const allValues = toForm.getFieldsValue();
            if (typeof onChange === "function") {
                onChange(allValues);
            }
        }
    };

    const handleVideoChange = async (checked) => {
        // Проверка демо-режима при попытке включить
        if (checked) {
            try {
                const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
                const demoResult = await checkDemo(token);

                if (demoResult.success && demoResult.status === true) {
                    showErrorNotification(t("demoModeNotAvailable") || "Этот режим не доступен в демонстрационном режиме");
                    return;
                }
            } catch (error) {
                console.error("Ошибка проверки демо-режима:", error);
            }
        }

        setVideoChecked(checked);

        // Сохраняем значение в форму и триггерим onValuesChange
        if (toForm) {
            toForm.setFieldsValue({ video: checked });
            // Получаем все значения формы и вручную вызываем onChange если он есть
            const allValues = toForm.getFieldsValue();
            if (typeof onChange === "function") {
                onChange(allValues);
            }
        }
    };

    const handleWebSearchChange = (checked) => {
        // Если включаем веб-поиск и S3 активен - не даем включить
        if (checked && s3FilesEnabled) {
            return; // Не меняем состояние
        }

        setWebSearchChecked(checked);

        // Если включаем веб-поиск, автоматически отключаем генерацию файлов
        if (checked && switchChecked) {
            setSwitchChecked(false);
            if (toForm) {
                toForm.setFieldsValue({ interp: false });
            }
        }

        // Сохраняем значение в форму и триггерим onValuesChange
        if (toForm) {
            toForm.setFieldsValue({ web_search: checked });
            // Получаем все значения формы и вручную вызываем onChange если он есть
            const allValues = toForm.getFieldsValue();
            if (typeof onChange === "function") {
                onChange(allValues);
            }
        }
    };

    const handleCancel = () => {
        setModalOpen(false);
    };

    const showModal = () => {
        setModalOpen(true);
    };

    return (
        <>
            <div className="section-title">
                <CodeOutlined />
                {t("fileGenerationTitle") || "Генерация файлов"}
            </div>
            <div className="section-description">
                {t("fileGenerationDesc") || "Позволяет агенту создавать файлы, графики и выполнять код для решения задач"}
                {!currentS3Status && (
                    <div style={{color: 'var(--warning-color)', marginTop: '8px', fontSize: '13px'}}>
                        ⚠️ {t("fileGenerationS3Warning") || "Для использования этой функции необходимо включить S3 хранилище файлов"}
                    </div>
                )}
                {webSearchChecked && (
                    <div style={{color: 'var(--info-color, #1890ff)', marginTop: '8px', fontSize: '13px'}}>
                        ℹ️ {t("fileGenerationWebSearchConflict") || "Ограничение Gemini: Генерация файлов и Веб-поиск не могут быть активны одновременно"}
                    </div>
                )}
            </div>

            <div className="step">
                <span>
                    {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                    {t("fileGenerationEnable") || "Включение режима"} <a onClick={showModal}>{t("fileGenerationCreateFiles") || "создания файлов"}</a>&nbsp;
                </span>
                <Switch
                    checked={switchChecked && currentS3Status && !webSearchChecked}
                    disabled={!currentS3Status || webSearchChecked}
                    checkedChildren={<span style={{color: "black"}}>{t("Yes") || "Да"}</span>}
                    unCheckedChildren={<span style={{color: "black"}}>{t("No") || "Нет"}</span>}
                    onChange={handleSwitchChange}
                />
            </div>

            <div className="section-title" style={{marginTop: '24px'}}>
                <PictureOutlined />
                {t("imageGenerationTitle") || "Генерация изображений"}
            </div>
            <div className="section-description">
                {t("imageGenerationDesc") || "Позволяет агенту генерировать изображения на основе текстовых описаний и визуализировать идеи"}
                {!currentS3Status && (
                    <div style={{color: 'var(--warning-color)', marginTop: '8px', fontSize: '13px'}}>
                        ⚠️ {t("fileGenerationS3Warning") || "Для использования этой функции необходимо включить S3 хранилище файлов"}
                    </div>
                )}
            </div>

            <div className="step">
                <span>
                    {t("imageGenerationEnable") || "Включение генерации изображений"}&nbsp;
                </span>
                <Switch
                    checked={imageChecked && currentS3Status}
                    disabled={!currentS3Status}
                    checkedChildren={<span style={{color: "black"}}>{t("Yes") || "Да"}</span>}
                    unCheckedChildren={<span style={{color: "black"}}>{t("No") || "Нет"}</span>}
                    onChange={handleImageChange}
                />
            </div>

            <div className="section-title" style={{marginTop: '24px'}}>
                <VideoCameraOutlined />
                {t("videoGenerationTitle") || "Генерация видео"}
            </div>
            <div className="section-description">
                {t("videoGenerationDesc") || "Позволяет агенту генерировать видео на основе текстовых описаний и создавать видеоконтент"}
                {!currentS3Status && (
                    <div style={{color: 'var(--warning-color)', marginTop: '8px', fontSize: '13px'}}>
                        ⚠️ {t("fileGenerationS3Warning") || "Для использования этой функции необходимо включить S3 хранилище файлов"}
                    </div>
                )}
            </div>

            <div className="step">
                <span>
                    {t("videoGenerationEnable") || "Включение генерации видео"}&nbsp;
                </span>
                <Switch
                    checked={videoChecked && currentS3Status}
                    disabled={!currentS3Status}
                    checkedChildren={<span style={{color: "black"}}>{t("Yes") || "Да"}</span>}
                    unCheckedChildren={<span style={{color: "black"}}>{t("No") || "Нет"}</span>}
                    onChange={handleVideoChange}
                />
            </div>

            <div className="section-title" style={{marginTop: '24px'}}>
                <GlobalOutlined />
                {t("webSearchTitle") || "Веб-поиск"}
            </div>
            <div className="section-description">
                {t("webSearchDesc") || "Позволяет агенту искать актуальную информацию в интернете для более точных и свежих ответов"}
                {(switchChecked || s3FilesEnabled) && (
                    <div style={{color: 'var(--info-color, #1890ff)', marginTop: '8px', fontSize: '13px'}}>
                        ℹ️ {t("webSearchFileGenConflict") || "Ограничение Gemini: Веб-поиск не может быть активен одновременно с function_declarations (генерация файлов или S3 функции)"}
                    </div>
                )}
            </div>

            <div className="step">
                <span>
                    {t("webSearchEnable") || "Включение веб-поиска"}&nbsp;
                </span>
                <Switch
                    checked={webSearchChecked}
                    disabled={switchChecked || s3FilesEnabled}
                    checkedChildren={<span style={{color: "black"}}>{t("Yes") || "Да"}</span>}
                    unCheckedChildren={<span style={{color: "black"}}>{t("No") || "Нет"}</span>}
                    onChange={handleWebSearchChange}
                />
            </div>

            <Modal
                open={isModalOpen}
                onCancel={handleCancel}
                footer={null}
                width={700}
            >
                <Title
                    style={{
                        fontSize: '16px',
                        color: 'var(--text-color)',
                    }}>
                    {t("interpreterModalTitle") || "Что такое генерация файлов (Code Interpreter)?"}
                </Title>
                <Paragraph
                    code={true}
                    style={{
                        whiteSpace: 'pre-wrap',
                        display: 'block',
                        fontSize: '16px',
                        color: 'var(--text-color)',
                    }}
                >
                    {t("interpreterModalIntro") || "Code Interpreter — это мощный инструмент, который позволяет агенту писать и выполнять код прямо в процессе общения. Это значительно расширяет возможности модели и открывает новые горизонты для решения сложных задач."}{'\n'}
                    {t("interpreterModalCapabilities") || "🚀 Основные возможности\n- Написание и выполнение кода на Python\n- Обработка загруженных файлов различных форматов\n- Создание графиков, диаграмм и визуализаций\n- Генерация новых файлов (изображения, таблицы, документы)\n- Выполнение математических вычислений\n- Анализ данных и статистика"}{'\n'}
                    {t("interpreterModalFeatures") || "💻 Что может делать агент с включенным Code Interpreter\n📊 Анализ данных:\n- Обработка CSV, Excel файлов\n- Статистический анализ\n- Создание сводных таблиц\n- Построение графиков и диаграмм\n🎨 Генерация файлов:\n- Создание графиков (matplotlib, plotly)\n- Генерация изображений\n- Создание PDF документов\n- Экспорт в различные форматы (JSON, CSV, XML)\n🔧 Программирование:\n- Написание и отладка кода\n- Создание утилит и скриптов\n- Тестирование алгоритмов\n- Обработка текста и данных"}
                </Paragraph>
                <Title
                    style={{
                        fontSize: '16px',
                        color: 'var(--text-color)',
                    }}>
                    {t("interpreterModalExamplesTitle") || "Примеры использования"}
                </Title>
                <Paragraph
                    code={true}
                    style={{
                        whiteSpace: 'pre-wrap',
                        display: 'block',
                        fontSize: '16px',
                        color: 'var(--text-color)',
                    }}
                >
                    {t("interpreterModalExamples") || "📈 Бизнес-аналитика:\n\"Проанализируй этот файл продаж и создай график по месяцам\"\n→ Агент загрузит данные, проанализирует и создаст визуализацию\n🧮 Математические задачи:\n\"Реши систему уравнений и построй график функции\"\n→ Агент напишет код, выполнит вычисления и создаст график\n📝 Обработка документов:\n\"Извлеки данные из этого PDF и создай сводную таблицу\"\n→ Агент обработает файл и создаст структурированную таблицу\n🎯 Автоматизация:\n\"Создай скрипт для обработки этих файлов и запусти его\"\n→ Агент напишет код, выполнит его и предоставит результаты"}
                </Paragraph>
                <Title
                    style={{
                        fontSize: '16px',
                        color: 'var(--text-color)',
                    }}>
                    {t("interpreterModalWhenTitle") || "Когда использовать Code Interpreter?"}
                </Title>
                <Paragraph
                    code={true}
                    style={{
                        whiteSpace: 'pre-wrap',
                        display: 'block',
                        fontSize: '16px',
                        color: 'var(--text-color)',
                    }}
                >
                    {t("interpreterModalWhen") || "✅ Включайте, если вам нужно:\n- Анализировать данные из файлов\n- Создавать графики и визуализации\n- Выполнять вычисления\n- Генерировать файлы\n- Писать и тестировать код\n- Обрабатывать большие объемы данных\n❌ Можно не включать, если:\n- Нужны только текстовые ответы\n- Работаете с простыми вопросами\n- Не требуется обработка файлов\n- Хотите сэкономить ресурсы модели"}
                </Paragraph>
            </Modal>
        </>
    );
};

