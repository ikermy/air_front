import {Form, Modal, Typography, message, Button, Popconfirm} from "antd";
import React, {useState, useEffect} from "react";
import TextArea from "antd/es/input/TextArea";
import {RobotOutlined} from "@ant-design/icons";
import { useTranslation } from 'react-i18next';
import sampleData from './sample.json';

// Функция для удаления тегов <MARUSIA>...</MARUSIA> из текста
const removeExampleTags = (text) => {
    if (!text) return '';
    return text.replace(/<MARUSIA>[\s\S]*?<\/MARUSIA>/g, '');
};

// Функция для подсветки тегов <MARUSIA>...</MARUSIA>
const highlightExampleTags = (text) => {
    if (!text) return '';

    const lines = text.split('\n');

    return lines.map((line) => {
        let processedLine = escapeHtml(line);

        // Подсветка <MARUSIA>текст</MARUSIA> красным жирным
        processedLine = processedLine.replace(/&lt;MARUSIA&gt;([\s\S]*?)&lt;\/MARUSIA&gt;/g, (match, content) => {
            return `<span style="color: #ff4d4f; font-weight: bold;">&lt;MARUSIA&gt;${content}&lt;/MARUSIA&gt;</span>`;
        });

        return processedLine;
    }).join('\n');
};

// Функция для экранирования HTML
const escapeHtml = (text) => {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/ /g, '&nbsp;');
};

export const Prompt = ({ modelData, loadTemplateButtonRef }) => {
    const {Title, Paragraph} = Typography;
    const { t, i18n } = useTranslation();
    const [messageApi, contextHolder] = message.useMessage();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [promptValue, setPromptValue] = useState(modelData?.prompt || '');
    const [hasExampleTags, setHasExampleTags] = useState(false);

    // Проверяем наличие тегов <MARUSIA> при загрузке
    useEffect(() => {
        if (modelData?.prompt) {
            setPromptValue(modelData.prompt);
            setHasExampleTags(modelData.prompt.includes('<MARUSIA>'));
        }
    }, [modelData]);

    const showModal = () => {
        setIsModalOpen(true);
    };

    const handleCancel = () => {
        setIsModalOpen(false)
    };

    const handleConfirmLoadTemplate = () => {
        const currentLanguage = i18n.language || 'ru';
        let template = sampleData[currentLanguage] || sampleData.ru;

        setPromptValue(template);
        setHasExampleTags(template.includes('<MARUSIA>'));
        messageApi.success(t("promptTemplateLoaded") || 'Шаблон промпта загружен');
    };

    const handlePromptChange = (e) => {
        const newValue = e.target.value;
        setPromptValue(newValue);
        setHasExampleTags(newValue.includes('<MARUSIA>'));
    };

    return (
        <>
            {contextHolder}
            <div className="section-title">
                <RobotOutlined />
                {t("promptTitle") || "Промпт модели"}
            </div>
            <div className="section-description">
                {t("promptDescription") || "Детальное описание поведения вашего агента в процессе диалога с пользователем"}
            </div>

            <div className="step">
                    <span>
                        {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                        {t("promptWhatIs") || "Что такое"} <a onClick={showModal}>{t("promptModelLink") || "промпт модели"}</a>&nbsp;
                    </span>
                    <div ref={loadTemplateButtonRef} style={{ display: 'inline-block' }}>
                        {promptValue.trim() ? (
                            <Popconfirm
                                title={
                                    <div>
                                        {t("promptLoadTemplateConfirmTitle") || "Загрузка базового шаблона промпта"}<br />
                                        {t("promptLoadTemplateConfirmDesc") || "заменит существующий промпт модели"}
                                    </div>
                                }
                                onConfirm={handleConfirmLoadTemplate}
                                okText={t("promptContinue") || "Продолжить"}
                                cancelText={t("cancel") || "Отмена"}
                                okButtonProps={{ style: { color: 'black' } }}
                            >
                                <Button
                                    size="small"
                                    style={{ marginLeft: '10px' }}
                                >
                                    {t("promptLoadTemplate") || "Загрузить шаблон промпта"}
                                </Button>
                            </Popconfirm>
                        ) : (
                            <Button
                                onClick={handleConfirmLoadTemplate}
                                size="small"
                                style={{ marginLeft: '10px' }}
                            >
                                {t("promptLoadTemplate") || "Загрузить шаблон промпта"}
                            </Button>
                        )}
                    </div>
            </div>

            <Form.Item
                name="prompt"
                rules={[
                    {
                        type: "string",
                        message: t("promptEnterPrompt") || "Введите промпт модели!",
                    },
                    {
                        required: true,
                        message: t("promptRequired") || "Пожалуйста, введите верный промпт модели!",
                    },
                ]}
                getValueFromEvent={(e) => {
                    // При получении значения удаляем теги <MARUSIA>
                    const value = e.target.value;
                    return removeExampleTags(value);
                }}
            >
                <div style={{ position: 'relative' }}>
                    {hasExampleTags && (
                        <div
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                pointerEvents: 'none',
                                padding: '4px 11px',
                                whiteSpace: 'pre-wrap',
                                wordWrap: 'break-word',
                                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial',
                                fontSize: '14px',
                                lineHeight: '1.5715',
                                overflow: 'auto',
                                zIndex: 1,
                            }}
                            dangerouslySetInnerHTML={{
                                __html: highlightExampleTags(promptValue)
                            }}
                        />
                    )}
                    <TextArea
                        placeholder={t("promptPlaceholder") || "Введите промпт модели"}
                        autoSize={{minRows: 7, maxRows: 30}}
                        value={promptValue}
                        onChange={handlePromptChange}
                        style={{
                            position: 'relative',
                            zIndex: 2,
                            background: hasExampleTags ? 'transparent' : undefined,
                            color: hasExampleTags ? 'transparent' : undefined,
                            caretColor: hasExampleTags ? 'black' : undefined,
                        }}
                    />
                </div>
            </Form.Item>

            <Modal
                title={t("promptModalTitle") || "Промпт модели"}
                open={isModalOpen}
                onCancel={handleCancel}
                footer={null}
                width={700}
            >
                <Title
                    style={{
                        fontSize: '16px',
                    }}>
                    {t("promptModalMainSettings") || "\"Промпт модели\" это главные настройки поведения вашего Агента."}
                </Title>
                <Paragraph>
                    <strong>{t("promptModalStructure") || "Модели используют строгую структура вопросов и ответов и следуют заранее определённой json-shema для обеспечения точности и согласованности ответов и их последующей интерпретации каналами взаимодействия с агентом. Поэтому при настройке промпта модели необходимо придерживаться определённой структуры!"}</strong>
                </Paragraph>
                <Paragraph>
                    {t("promptModalDescribeAgent") || "Подробно опишите что ваш ваш Агент будет делать в процессе диалога с пользователем. Используйте простые, понятные фразы, так же как вы формулируете рабочие инструкции для реального сотрудника."}
                </Paragraph>
                <Paragraph>
                    {t("promptModalExample") || "MARUSIA создания промпта Агента:"}
                </Paragraph>
                <Paragraph
                    code={true}
                    style={{
                        whiteSpace: 'pre-wrap',
                        display: 'block',
                        fontSize: '16px',
                    }}
                >
                    {t("promptModalGreeting") || "#Приветствие\n\"Приветствую! Я Маруся, агент компании Marusia AI. Чем могу помочь?\""}
                </Paragraph>
                <Paragraph>
                    <strong>{t("promptModalGreetingNote") || "Приветствие не является обязательным, но желательно."}</strong>
                </Paragraph>
                <Paragraph
                    code={true}
                    style={{
                        whiteSpace: 'pre-wrap',
                        display: 'block',
                        fontSize: '16px',
                    }}
                >
                    {t("promptModalBehavior") || "#Поведение\n\"Всегда общайся только на русском языке. Во время диалога с пользователем иногда используй его имя (как минимум каждые 5 сообщений). Не говори, что ты бот. Если тебя спрашивают: «Кто ты?», или «Ты живой человек» - отвечай - «Я Маруся, агент компании Marusia AI»\"\n#Детали\n\"Твоя задача - помогать пользователям в решении их вопросов, используя только официальную информацию с сайта компании Marusia AI., векторного поиска по базе знаний компании и хранилища S3. Если не знаешь ответа - признай это, не придумывай. Отвечай кратко, по делу, не более 2-3 предложений. Если вопрос не относится к компании Marusia AI - вежливо откажись отвечать.\""}
                </Paragraph>
                <Paragraph>
                    {t("promptModalFullTemplate") || "Полный функциональный шаблон для промпта модели доступен по кнопке -"} <strong>"{t("promptLoadTemplate") || "Загрузить шаблон промпта"}"</strong>
                </Paragraph>
            </Modal>

        </>
    )
}
