import {Modal, Switch} from "antd";
import React, {useEffect, useState} from "react";
import Title from "antd/lib/typography/Title";
import Paragraph from "antd/lib/typography/Paragraph";
import {CodeOutlined, GlobalOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";

export const Openai_Interpreter = ({onChange, toForm, initialFiles, initialWebSearch}) => {
    const {t} = useTranslation();
    const [isModalOpen, setModalOpen] = useState(false);
    const [switchChecked, setSwitchChecked] = useState(false);
    const [webSearchChecked, setWebSearchChecked] = useState(false);

    // Инициализация при загрузке компонента
    useEffect(() => {
        // Инициализация interpreter
        if (typeof initialFiles === 'boolean') {
            setSwitchChecked(initialFiles);
            if (toForm) {
                toForm.setFieldsValue({ interpreter: initialFiles });
            }
        } else if (initialFiles) {
            setSwitchChecked(true);
            if (toForm) {
                toForm.setFieldsValue({ interpreter: true });
            }
        }

        // Инициализация web_search
        if (typeof initialWebSearch === 'boolean') {
            setWebSearchChecked(initialWebSearch);
            if (toForm) {
                toForm.setFieldsValue({ web_search: initialWebSearch });
            }
        }
    }, [initialFiles, initialWebSearch, toForm]);

    const handleSwitchChange = (checked) => {
        setSwitchChecked(checked);

        // Сохраняем значение в форму
        if (toForm) {
            toForm.setFieldsValue({ interpreter: checked });
        }

        // Если функция onChange существует, вызываем её
        if (typeof onChange === "function") {
            onChange(checked);
        }
    };

    const handleWebSearchChange = (checked) => {
        setWebSearchChecked(checked);

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
                {t("codeInterpreterTitle") || "Интерпретатор кода"}
            </div>
            <div className="section-description">
                {t("codeInterpreterDesc") || "Позволяет агенту писать и запускать Python скрипты для решения различных задач"}
            </div>

            <div className="step">
                <span>
                    {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                    {t("fileGenerationEnable") || "Включение режима"} <a onClick={showModal}>{t("fileGenerationCreateFiles") || "интерпретатор кода"}</a>&nbsp;
                </span>
                <Switch
                    checked={switchChecked}
                    checkedChildren={<span style={{color: "black"}}>{t("Yes") || "Да"}</span>}
                    unCheckedChildren={<span style={{color: "black"}}>{t("No") || "Нет"}</span>}
                    onChange={handleSwitchChange}
                />
            </div>

            <div className="section-title" style={{marginTop: '24px'}}>
                <GlobalOutlined />
                {t("webSearchTitle") || "Веб-поиск"}
            </div>
            <div className="section-description">
                {t("webSearchDesc") || "Позволяет агенту искать актуальную информацию в интернете для более точных и свежих ответов"}
            </div>

            <div className="step">
                <span>
                    {t("webSearchEnable") || "Включение веб-поиска"}&nbsp;
                </span>
                <Switch
                    checked={webSearchChecked}
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
                    {t("interpreterModalTitle") || "Что такое Code Interpreter?"}
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
