import {InputNumber, Modal, Slider, Switch, Typography} from "antd";
import React, {useEffect, useState} from "react";
import {SettingOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import "./Espero.css";


export const Espero = ({ value = {}, onChange }) => {
    const {t} = useTranslation();
    const {Title, Paragraph} = Typography;

    const [isModalOpen, setModalOpen] = useState(false);
    // const [switchChecked, setSwitchChecked] = useState(true);
    const [inputMode, setInputMode] = useState(false);
    const [maxLimit, setMaxLimit] = useState(4096);

    const esperoValues = {
        wait: value.wait ?? 2,
        limit: value.limit ?? 1024,
        ignore: value.ignore ?? true
    };

    const showMeta = () => {
        setModalOpen(true);
    };

    const handleCancel = () => {
        setModalOpen(false)
    };

    // const [esperoValue, setEsperoValue] = useState(2);
    const onChangeEspero = newValue => {
        const newValues = {...esperoValues, wait: newValue};
        onChange(newValues);
    };

    // const [limitValue, setLimitValue] = useState(1024);

    // Разделяем обработчики
    const onChangeLimitSlider = (newValue) => {
        const newValues = {...esperoValues, limit: newValue};
        setInputMode(false);
        onChange(newValues);
    };

    const onChangeLimitInput = (newValue) => {
        if (newValue > 4096) {
            setMaxLimit(newValue);
        } else {
            setMaxLimit(4096);
        }

        const newValues = {...esperoValues, limit: newValue};
        onChange(newValues);
        setInputMode(true);
    };

    const onChangeSwitch = (checked) => {
        const newValues = {...esperoValues, ignore: checked};
        onChange(newValues);
    };

    const marks = {
        128: {label: '128'},
        500: {
            style: {
                top: -35,
                left: 23,
            },
            label: 500,
        },
        1024: {
            style: {
                color: '#71b600',
            },
            label: <strong>1024</strong>,
        },
        2200: {
            style: {
                color: '#3f729b',
            },
            label: <strong>2200</strong>,
        },
        3000: {
            style: {
                color: '#3b5998',
            },
            label: <strong>3000</strong>,
        },
        4096: {
            style: {
                // top: -35,
                // left: 23,
                color: '#0088cc',
            },
            label: <strong>4096</strong>,
        },
    };

    // В начале компонента добавьте проверку начальных значений
    useEffect(() => {
        // Инициализация с полной структурой при первом рендере
        if (!value.wait && !value.limit && value.ignore === undefined) {
            onChange({
                wait: 2,
                limit: 1024,
                ignore: true
            });
        }
    }, [onChange, value.wait, value.limit, value.ignore]);

    return (
        <div className="espero-container">
            <div className="espero-section-title">
                <SettingOutlined />
                {t("esperoChannelSettings") || "Настройки каналов"}
            </div>
            <div className="section-description">
                {t("esperoChannelSettingsDesc") || "Конфигурация параметров взаимодействия модели с различными каналами связи"}
            </div>

            <div className="espero-step">
                <span>
                    {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                    {t("esperoModelInteraction") || "Взаимодействие модели с"} <a onClick={showMeta}>{t("esperoChannelsLink") || "каналами"}</a>&nbsp;
                </span>
            </div>

            <div className="espero-channel-item">
                <div className="espero-form-item">
                    <div className="espero-form-label">
                        {t("esperoWaitLabel") || "Ожидание вопроса секунд"}
                    </div>
                    <div className="espero-slider-container">
                        <div className="espero-slider-row">
                            <Slider
                                className="espero-slider"
                                min={0}
                                max={60}
                                onChange={onChangeEspero}
                                value={esperoValues.wait}
                            />
                            <InputNumber
                                className="espero-input-number"
                                min={0}
                                max={60}
                                value={esperoValues.wait}
                                onChange={onChangeEspero}
                            />
                        </div>
                    </div>
                </div>

                <div className="espero-form-item">
                    <div className="espero-form-label">
                        {t("esperoLimitLabel") || "Лимит символов в вопросе"}
                    </div>
                    <div className="espero-slider-container">
                        <div className="espero-slider-row">
                            <Slider
                                className="espero-slider"
                                min={128}
                                max={maxLimit}
                                marks={marks}
                                step={inputMode ? 1 : null}
                                onChange={onChangeLimitSlider}
                                value={esperoValues.limit}
                            />
                            <InputNumber
                                className="espero-input-number"
                                min={128}
                                value={esperoValues.limit}
                                onChange={onChangeLimitInput}
                            />
                        </div>
                    </div>
                </div>

                <div className="espero-form-item">
                    <div className="espero-switch-container">
                        <div className="espero-switch-label">
                            {t("esperoIgnoreLabel") || "Игнорировать вопросы до отправки ответа агентом"}
                        </div>
                        <Switch
                            checked={esperoValues.ignore}
                            checkedChildren={<span style={{color: "black"}}>{t("Yes") || "Да"}</span>}
                            unCheckedChildren={<span style={{color: "black"}}>{t("No") || "Нет"}</span>}
                            onChange={onChangeSwitch}
                        />
                    </div>
                </div>
            </div>

            {/*</Form.Item>*/}

            <Modal
                title={t("esperoModalTitle") || "Взаимодействие модели с каналами"}
                open={isModalOpen}
                onCancel={handleCancel}
                footer={null}
                width={700}
            >
                <Title
                    style={{
                        fontSize: '16px',
                    }}>
                    {t("esperoWaitTitle") || "\"Ожидание вопроса секунд\" - модель будет ждать следующего вопроса пользователя перед тем как ответить."}
                </Title>
                <Paragraph
                    code={true}
                    style={{
                        whiteSpace: 'pre-wrap',
                        display: 'block',
                        fontSize: '16px',
                    }}
                >
                    {t("esperoWaitExample") || "Например при ожидании 4 секунды:\n\tПользователь - \"Привет\"\n\tПользователь - \"Меня зовут Вова!\"\n\tПользователь - \"Как твои дела?\"\nОтвет Агента будет таким:\n\tАгент - \"Приятно познакомиться Вова, меня зовут Маруся. У меня всё хорошо!\"\nПри этом если бы ожидания не было, то Агент ответил бы сразу:\n\tПользователь - \"Привет\"\n\tАгент - \"Привет я Маруся!\""}
                </Paragraph>
                <Title
                    style={{
                        fontSize: '16px',
                    }}>
                    {t("esperoLimitTitle") || "\"Лимит символов в вопросе\" - ограничение количества символов в вопросе пользователя."}
                </Title>
                <Paragraph
                    code={true}
                    style={{
                        whiteSpace: 'pre-wrap',
                        display: 'block',
                        fontSize: '16px',
                    }}
                >
                    {t("esperoLimitExample") || "Лимит по умолчанию 1024 символа\nЕсли в сообщении будет большее 1024 символов, то агент его проигнорирует"}
                </Paragraph>
                {t("esperoLimitWarning") || "Помните что для большинства каналов взаимодействия, есть лимит на количество символов в сообщении. В случае превышении лимита сообщение не будет доставлено!"}
                <Paragraph
                    code={true}
                    style={{
                        whiteSpace: 'pre-wrap',
                        display: 'block',
                        fontSize: '16px',
                    }}
                >
                    {t("esperoLimitChannels") || "Лимиты для разных каналов:\n\tInstagram - 2200\n\tFacebook - 3000 ('при превышении часть сообщения будет скрыта')\n\tTelegram - 4096\"\n\tWhatsApp - 4096\""}
                </Paragraph>
                <Title
                    style={{
                        fontSize: '16px',
                    }}>
                    {t("esperoIgnoreTitle") || "\"Игнорировать вопросы до отправки ответа агентом\" - пропускать дополнительные вопросы пользователя до ответа Агента."}
                </Title>
                <Paragraph
                    code={true}
                    style={{
                        whiteSpace: 'pre-wrap',
                        display: 'block',
                        fontSize: '16px',
                    }}
                >
                    {t("esperoIgnoreExample") || "- параметр \"да\" - Агент игнорирует дополнительные вопросы пользователя\"\nПример:\n\tПользователь - \"Привет\"\n\tАгент готовит ответ на вопрос пользователя...\n\tПользователь до получения ответа задает ещё вопрос - \"Меня зовут Вова!\"\nОтвет Агента будет таким:\n\tАгент - \"Привет! Меня зовут Маруся\"\n\n- параметр \"нет\" - Агент слушает дополнительные вопросы пользователя\"\nПример:\n\tПользователь - \"Привет\"\n\tАгент готовит ответ на вопрос пользователя...\n\tПользователь до получения ответа задает ещё вопрос - \"Меня зовут Вова!\"\nОтвет Агента будет таким:\n\tАгент - \"Привет!\"\n\tАгент - \"Приятно познакомиться Вова!\""}
                </Paragraph>
                {t("esperoIgnoreWarning") || "Рекомендуем не выключать этот параметр без всестороннего тестирования вашей модели - иначе Агент может терять контекст разговора!"}
            </Modal>

        </div>
    )
}