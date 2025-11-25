import {Form, Modal, Typography, Badge, message, Button, Popconfirm} from "antd";
import React, {useState} from "react";
import TextArea from "antd/es/input/TextArea";
import {RobotOutlined} from "@ant-design/icons";
import { useTranslation } from 'react-i18next';
import sampleData from './sample.json';

export const Prompt = ({ modelData, userId, loadTemplateButtonRef }) => {
    const {Title, Paragraph} = Typography;
    const { i18n } = useTranslation();
    const [messageApi, contextHolder] = message.useMessage();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [promptValue, setPromptValue] = useState(modelData?.prompt || '');

    const showModal = () => {
        setIsModalOpen(true);
    };

    const handleCancel = () => {
        setIsModalOpen(false)
    };

    const handleUserIdCopy = async () => {
        if (userId) {
            try {
                await navigator.clipboard.writeText(userId.toString());
                messageApi.success('user_id скопирован в буфер обмена');
            } catch (err) {
                // Fallback для старых браузеров
                const textArea = document.createElement('textarea');
                textArea.value = userId.toString();
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                messageApi.success('user_id скопирован в буфер обмена');
            }
        } else {
            messageApi.warning('user_id еще загружается...');
        }
    };

    const handleConfirmLoadTemplate = () => {
        const currentLanguage = i18n.language || 'ru';
        let template = sampleData[currentLanguage] || sampleData.ru;

        // Заменяем <USER_ID> на реальный userId
        if (userId) {
            template = template.replace(/<USER_ID>/g, userId);
        }

        setPromptValue(template);
        messageApi.success('Шаблон промпта загружен');
    };

    return (
        <>
            {contextHolder}
            <div className="section-title">
                <RobotOutlined />
                Промпт модели
            </div>
            <div className="section-description">
                Детальное описание поведения вашего ассистента в процессе диалога с пользователем
            </div>

            <div className="step">
                    <span>
                        {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                        Что такое <a onClick={showModal}>промпт модели</a>&nbsp;
                    </span>
                    <div ref={loadTemplateButtonRef} style={{ display: 'inline-block' }}>
                        {promptValue.trim() ? (
                            <Popconfirm
                                title={
                                    <div>
                                        Загрузка базового шаблона промпта<br />
                                        заменит существующий промпт модели
                                    </div>
                                }
                                onConfirm={handleConfirmLoadTemplate}
                                okText="Продолжить"
                                cancelText="Отмена"
                                okButtonProps={{ style: { color: 'black' } }}
                            >
                                <Button
                                    size="small"
                                    style={{ marginLeft: '10px' }}
                                >
                                    Загрузить шаблон промпта
                                </Button>
                            </Popconfirm>
                        ) : (
                            <Button
                                onClick={handleConfirmLoadTemplate}
                                size="small"
                                style={{ marginLeft: '10px' }}
                            >
                                Загрузить шаблон промпта
                            </Button>
                        )}
                    </div>
            </div>

            <Form.Item
                name="prompt"
                rules={[
                    {
                        type: "string",
                        message: "Введите промпт модели!",
                    },
                    {
                        required: true,
                        message: "Пожалуйста, введите верный промпт модели!",
                    },
                ]}
            >
                <div style={{ position: 'relative' }}>
                    <Badge.Ribbon
                        text={`user_id=${userId || 'загружается...'}`}
                        color="var(--main-color)"
                    >
                        <TextArea
                            placeholder="Введите промпт модели"
                            autoSize={{minRows: 20, maxRows: 30}}
                            value={promptValue}
                            onChange={(e) => setPromptValue(e.target.value)}
                        />
                    </Badge.Ribbon>
                    <div
                        onClick={handleUserIdCopy}
                        style={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            width: '100px',
                            height: '22px',
                            cursor: 'pointer',
                            zIndex: 10,
                        }}
                        title="Нажмите, чтобы скопировать user_id"
                    />
                </div>
            </Form.Item>

            <Modal
                title="Промпт модели"
                open={isModalOpen}
                onCancel={handleCancel}
                footer={null}
                width={700}
            >
                <Title
                    style={{
                        fontSize: '16px',
                    }}>
                    "Промпт модели" это главные настройки поведения вашего Ассистента.
                </Title>
                <Paragraph>
                    <strong>Модели используют строгую структура вопросов и ответов и следуют заранее определённой json-shema
                        для обеспечения точности и согласованности ответов и их последующей интерпретации каналами взаимодействия
                        с ассистентом. Поэтому при настройке промпта модели необходимо придерживаться определённой структуры!</strong>
                </Paragraph>
                <Paragraph>
                    Подробно опишите что ваш ваш Ассистент будет делать в процессе диалога с пользователем.
                    Используйте простые, понятные фразы, так же как вы формулируете рабочие инструкции для реального
                    сотрудника.
                </Paragraph>
                <Paragraph>
                    Пример создания промпта Ассистента:
                </Paragraph>
                <Paragraph
                    code={true}
                    style={{
                        whiteSpace: 'pre-wrap',
                        display: 'block',
                        fontSize: '16px',
                    }}
                >
                    #Приветствие{'\n'}
                    "Приветствую! Я Маруся, ассистент компании Marusia AI. Чем могу помочь?"{'\n'}
                </Paragraph>
                <Paragraph>
                    <strong>Приветствие не является обязательным, но желательно.{'\n'}</strong>
                </Paragraph>
                <Paragraph
                    code={true}
                    style={{
                        whiteSpace: 'pre-wrap',
                        display: 'block',
                        fontSize: '16px',
                    }}
                >
                    #Поведение{'\n'}
                    "Всегда общайся только на русском языке. Во время диалога
                    с пользователем иногда используй его имя (как минимум каждые 5 сообщений). Не говори, что ты бот.
                    Если тебя спрашивают: «Кто ты?», или «Ты живой человек» - отвечай - «Я Маруся, ассистент компании
                    Marusia AI»"{'\n'}
                    #Детали{'\n'}
                    "Твоя задача - помогать пользователям в решении их вопросов, используя только официальную информацию
                    с сайта компании Marusia AI., векторного поиска по базе знаний компании и хранилища S3.
                    Если не знаешь ответа - признай это, не придумывай. Отвечай кратко, по делу, не более 2-3 предложений.
                    Если вопрос не относится к компании Marusia AI - вежливо откажись отвечать."{'\n'}
                </Paragraph>
                <Paragraph>
                    Полный функциональный шаблон для промпта модели доступен по кнопке - <strong>"Загрузить шаблон промпта"</strong>
                </Paragraph>
            </Modal>

        </>
    )
}
