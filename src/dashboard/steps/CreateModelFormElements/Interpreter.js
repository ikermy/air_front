import {Modal, Switch} from "antd";
import React, {useEffect, useState} from "react";
import Title from "antd/lib/typography/Title";
import Paragraph from "antd/lib/typography/Paragraph";
import {CodeOutlined} from "@ant-design/icons";

export const Interpreter = ({onChange, toForm, initialFiles}) => {
    const [isModalOpen, setModalOpen] = useState(false);
    const [switchChecked, setSwitchChecked] = useState(false);

    // Инициализация при загрузке компонента
    useEffect(() => {
        if (typeof initialFiles === 'boolean') {
            setSwitchChecked(initialFiles);

            // Помещаем данные в форму, если они еще не там
            if (toForm) {
                toForm.setFieldsValue({ interp: initialFiles });
            }
        } else if (initialFiles) {
            // Если это не булево значение, но есть данные - включаем
            setSwitchChecked(!!initialFiles);

            if (toForm) {
                toForm.setFieldsValue({ interp: initialFiles });
            }
        }
    }, [initialFiles, toForm]);

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
                Генерация файлов
            </div>
            <div className="section-description">
                Позволяет ассистенту создавать файлы, графики и выполнять код для решения задач
            </div>

            <div className="step">
                <span>
                    {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                    Включение режима <a onClick={showModal}>создания файлов</a>&nbsp;
                </span>
                <Switch
                    checked={switchChecked}
                    checkedChildren={<span style={{color: "black"}}>Да</span>}
                    unCheckedChildren={<span style={{color: "black"}}>Нет</span>}
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
                    "Что такое генерация файлов (Code Interpreter)?"
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
                    Code Interpreter — это мощный инструмент, который позволяет ассистенту писать и выполнять код прямо в процессе общения. Это значительно расширяет возможности модели и открывает новые горизонты для решения сложных задач.{'\n'}
                    🚀 Основные возможности{'\n'}
                    - Написание и выполнение кода на Python{'\n'}
                    - Обработка загруженных файлов различных форматов{'\n'}
                    - Создание графиков, диаграмм и визуализаций{'\n'}
                    - Генерация новых файлов (изображения, таблицы, документы){'\n'}
                    - Выполнение математических вычислений{'\n'}
                    - Анализ данных и статистика{'\n'}
                    💻 Что может делать ассистент с включенным Code Interpreter{'\n'}
                    📊 Анализ данных:{'\n'}
                    - Обработка CSV, Excel файлов{'\n'}
                    - Статистический анализ{'\n'}
                    - Создание сводных таблиц{'\n'}
                    - Построение графиков и диаграмм{'\n'}
                    🎨 Генерация файлов:{'\n'}
                    - Создание графиков (matplotlib, plotly){'\n'}
                    - Генерация изображений{'\n'}
                    - Создание PDF документов{'\n'}
                    - Экспорт в различные форматы (JSON, CSV, XML){'\n'}
                    🔧 Программирование:{'\n'}
                    - Написание и отладка кода{'\n'}
                    - Создание утилит и скриптов{'\n'}
                    - Тестирование алгоритмов{'\n'}
                    - Обработка текста и данных{'\n'}
                </Paragraph>
                <Title
                    style={{
                        fontSize: '16px',
                        color: 'var(--text-color)',
                    }}>
                    "Примеры использования"
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
                    📈 Бизнес-аналитика:{'\n'}
                    "Проанализируй этот файл продаж и создай график по месяцам"{'\n'}
                    → Ассистент загрузит данные, проанализирует и создаст визуализацию{'\n'}
                    🧮 Математические задачи:{'\n'}
                    "Реши систему уравнений и построй график функции"{'\n'}
                    → Ассистент напишет код, выполнит вычисления и создаст график{'\n'}
                    📝 Обработка документов:{'\n'}
                    "Извлеки данные из этого PDF и создай сводную таблицу"{'\n'}
                    → Ассистент обработает файл и создаст структурированную таблицу{'\n'}
                    🎯 Автоматизация:{'\n'}
                    "Создай скрипт для обработки этих файлов и запусти его"{'\n'}
                    → Ассистент напишет код, выполнит его и предоставит результаты{'\n'}
                </Paragraph>
                <Title
                    style={{
                        fontSize: '16px',
                        color: 'var(--text-color)',
                    }}>
                    "Когда использовать Code Interpreter?"
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
                    ✅ Включайте, если вам нужно:{'\n'}
                    - Анализировать данные из файлов{'\n'}
                    - Создавать графики и визуализации{'\n'}
                    - Выполнять вычисления{'\n'}
                    - Генерировать файлы{'\n'}
                    - Писать и тестировать код{'\n'}
                    - Обрабатывать большие объемы данных{'\n'}
                    ❌ Можно не включать, если:{'\n'}
                    - Нужны только текстовые ответы{'\n'}
                    - Работаете с простыми вопросами{'\n'}
                    - Не требуется обработка файлов{'\n'}
                    - Хотите сэкономить ресурсы модели{'\n'}
                </Paragraph>
            </Modal>
        </>
    );
};
