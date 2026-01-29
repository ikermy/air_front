import {Modal, Switch} from "antd";
import React, {useEffect, useState, useRef} from "react";
import Title from "antd/lib/typography/Title";
import Paragraph from "antd/lib/typography/Paragraph";
import {CodeOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";

export const Openai_Interpreter = ({onChange, toForm, initialFiles, s3FilesEnabled = false}) => {
    const {t} = useTranslation();
    const [isModalOpen, setModalOpen] = useState(false);
    const [switchChecked, setSwitchChecked] = useState(false);
    const [currentS3Status, setCurrentS3Status] = useState(s3FilesEnabled);
    const prevS3FilesEnabled = useRef(s3FilesEnabled);

    // Инициализация при загрузке компонента
    useEffect(() => {
        // Синхронизируем локальное состояние S3 с пропсом
        setCurrentS3Status(s3FilesEnabled);
        prevS3FilesEnabled.current = s3FilesEnabled;

        if (typeof initialFiles === 'boolean') {
            const shouldEnable = initialFiles && s3FilesEnabled;
            setSwitchChecked(shouldEnable);

            // Помещаем данные в форму, если они еще не там
            if (toForm) {
                toForm.setFieldsValue({ interp: shouldEnable });
            }
        } else if (initialFiles) {
            // Если это не булево значение, но есть данные - включаем только если S3 активен
            const shouldEnable = s3FilesEnabled;
            setSwitchChecked(shouldEnable);

            if (toForm) {
                toForm.setFieldsValue({ interp: shouldEnable });
            }
        }
    }, [initialFiles, toForm, s3FilesEnabled]);

    // Автоматическое отключение переключателя при отключении S3
    useEffect(() => {
        // Проверяем, что S3 был включен и теперь выключен
        if (prevS3FilesEnabled.current && !s3FilesEnabled) {
            // Отключаем генерацию файлов
            if (switchChecked) {
                setSwitchChecked(false);
                if (toForm) {
                    toForm.setFieldsValue({ interp: false });

                    // Вызываем onChange для синхронизации с родительским компонентом
                    if (typeof onChange === "function") {
                        const allValues = toForm.getFieldsValue();
                        onChange(allValues);
                    }
                }
            }
        }

        // Обновляем предыдущее значение
        prevS3FilesEnabled.current = s3FilesEnabled;
    }, [s3FilesEnabled, switchChecked, toForm, onChange]);

    const handleSwitchChange = (checked) => {
        setSwitchChecked(checked);

        // Сохраняем значение в форму
        if (toForm) {
            toForm.setFieldsValue({ interp: checked });
        }

        // Если функция onChange существует, вызываем её
        if (typeof onChange === "function") {
            onChange(checked);
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
            </div>

            <div className="step">
                <span>
                    {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                    {t("fileGenerationEnable") || "Включение режима"} <a onClick={showModal}>{t("fileGenerationCreateFiles") || "создания файлов"}</a>&nbsp;
                </span>
                <Switch
                    checked={switchChecked && currentS3Status}
                    disabled={!currentS3Status}
                    checkedChildren={<span style={{color: "black"}}>{t("Yes") || "Да"}</span>}
                    unCheckedChildren={<span style={{color: "black"}}>{t("No") || "Нет"}</span>}
                    onChange={handleSwitchChange}
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
