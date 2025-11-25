import {InputNumber, Modal, Slider, Switch, Typography} from "antd";
import React, {useEffect, useState} from "react";
import {SettingOutlined} from "@ant-design/icons";
import "./Espero.css";


export const Espero = ({ value = {}, onChange }) => {
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
                Настройки каналов
            </div>
            <div className="section-description">
                Конфигурация параметров взаимодействия модели с различными каналами связи
            </div>

            <div className="espero-step">
                <span>
                    {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                    Взаимодействие модели с <a onClick={showMeta}>каналами</a>&nbsp;
                </span>
            </div>

            <div className="espero-channel-item">
                <div className="espero-form-item">
                    <div className="espero-form-label">
                        Ожидание вопроса секунд
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
                        Лимит символов в вопросе
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
                            Игнорировать вопросы до отправки ответа ассистентом
                        </div>
                        <Switch
                            checked={esperoValues.ignore}
                            checkedChildren={<span style={{color: "black"}}>Да</span>}
                            unCheckedChildren={<span style={{color: "black"}}>Нет</span>}
                            onChange={onChangeSwitch}
                        />
                    </div>
                </div>
            </div>

            {/*</Form.Item>*/}

            <Modal
                title="Взаимодействие модели с каналами"
                open={isModalOpen}
                onCancel={handleCancel}
                footer={null}
                width={700}
            >
                <Title
                    style={{
                        fontSize: '16px',
                    }}>
                    "Ожидание вопроса секунд" - модель будет ждать следующего вопроса пользователя перед тем как
                    ответить.
                </Title>
                <Paragraph
                    code={true}
                    style={{
                        whiteSpace: 'pre-wrap',
                        display: 'block',
                        fontSize: '16px',
                    }}
                >
                    Например при ожидании 4 секунды:{'\n'}
                    {'\t'}Пользователь - "Привет"{'\n'}
                    {'\t'}Пользователь - "Меня зовут Вова!"{'\n'}
                    {'\t'}Пользователь - "Как твои дела?"{'\n'}
                    Ответ Ассистента будет таким:{'\n'}
                    {'\t'}Ассистент - "Приятно познакомиться Вова, меня зовут Маруся. У меня всё хорошо!"{'\n'}
                    При этом если бы ожидания не было, то Ассистент ответил бы сразу:{'\n'}
                    {'\t'}Пользователь - "Привет"{'\n'}
                    {'\t'}Ассистент - "Привет я Маруся!"
                </Paragraph>
                <Title
                    style={{
                        fontSize: '16px',
                    }}>
                    "Лимит символов в вопросе" - ограничение количества символов в вопросе пользователя.
                </Title>
                <Paragraph
                    code={true}
                    style={{
                        whiteSpace: 'pre-wrap',
                        display: 'block',
                        fontSize: '16px',
                    }}
                >
                    Лимит по умолчанию 1024 символа{'\n'}
                    Если в сообщении будет большее 1024 символов, то ассистент его проигнорирует{'\n'}
                </Paragraph>
                Помните что для большинства каналов взаимодействия, есть лимит на количество
                символов в сообщении. В случае превышении лимита сообщение не будет доставлено!
                <Paragraph
                    code={true}
                    style={{
                        whiteSpace: 'pre-wrap',
                        display: 'block',
                        fontSize: '16px',
                    }}
                >
                    Лимиты для разных каналов:{'\n'}
                    {'\t'}Instagram - 2200{'\n'}
                    {'\t'}Facebook - 3000 ('при превышении часть сообщения будет скрыта'){'\n'}
                    {'\t'}Telegram - 4096"{'\n'}
                    {'\t'}WhatsApp - 4096"{'\n'}
                </Paragraph>
                <Title
                    style={{
                        fontSize: '16px',
                    }}>
                    "Игнорировать вопросы до отправки ответа ассистентом" - пропускать дополнительные вопросы
                    пользователя
                    до ответа Ассистента.
                </Title>
                <Paragraph
                    code={true}
                    style={{
                        whiteSpace: 'pre-wrap',
                        display: 'block',
                        fontSize: '16px',
                    }}
                >
                    - параметр "да" - Ассистент игнорирует дополнительные вопросы пользователя"{'\n'}
                    Пример:{'\n'}
                    {'\t'}Пользователь - "Привет"{'\n'}
                    {'\t'}Ассистент готовит ответ на вопрос пользователя...{'\n'}
                    {'\t'}Пользователь до получения ответа задает ещё вопрос - "Меня зовут Вова!"{'\n'}
                    Ответ Ассистента будет таким:{'\n'}
                    {'\t'}Ассистент - "Привет! Меня зовут Маруся"{'\n'}
                    {'\n'}
                    - параметр "нет" - Ассистент слушает дополнительные вопросы пользователя"{'\n'}
                    Пример:{'\n'}
                    {'\t'}Пользователь - "Привет"{'\n'}
                    {'\t'}Ассистент готовит ответ на вопрос пользователя...{'\n'}
                    {'\t'}Пользователь до получения ответа задает ещё вопрос - "Меня зовут Вова!"{'\n'}
                    Ответ Ассистента будет таким:{'\n'}
                    {'\t'}Ассистент - "Привет!"{'\n'}
                    {'\t'}Ассистент - "Приятно познакомиться Вова!"{'\n'}
                </Paragraph>
                Рекомендуем не выключать этот параметр без всестороннего тестирования вашей модели - иначе Ассистент
                может терять контекст разговора!
            </Modal>

        </div>
    )
}