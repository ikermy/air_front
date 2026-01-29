import React, {useEffect, useRef, useState} from 'react';
import {PlusOutlined, BellOutlined} from '@ant-design/icons';
import {Input, Modal, Switch, Tag, theme, Tooltip, Typography} from 'antd';
import {useTranslation} from "react-i18next";

export const Triggers = ({value = [], onChange, initial}) => {
    const {t} = useTranslation();
    const {Title, Paragraph} = Typography;

    const {token} = theme.useToken();
    const [tags, setTags] = useState(value); // Синхронизируем с props.value
    const [editInputIndex, setEditInputIndex] = useState(-1);
    const [editInputValue, setEditInputValue] = useState('');
    const inputRef = useRef(null);
    const editInputRef = useRef(null);
    const [inputVisible, setInputVisible] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [switchChecked, setSwitchChecked] = useState(false);


    useEffect(() => {
        if (initial && initial.length > 0) {
            setSwitchChecked(true)
        } else {
            setSwitchChecked(false)
        }
    }, [initial]);

    const handleSwitchChange = (checked) => {
        setSwitchChecked(checked);
    };

    const setShow = () => {
        setIsOpen(true);
    };

    const handleCancel = () => {
        setIsOpen(false)
    };

    // Синхронизируем tags с внешним value, если оно изменяется
    useEffect(() => {
        if (Array.isArray(value) && JSON.stringify(value) !== JSON.stringify(tags)) {
            setTags(value); // Синхронизация только при изменении value
        }
    }, [tags, value]);

    const handleClose = (removedTag) => {
        const newTags = tags.filter((tag) => tag !== removedTag);
        setTags(newTags);
        onChange?.(newTags); // Уведомляем форму об изменении
    };

    const showInput = () => {
        setInputVisible(true);
    };

    const handleInputChange = (e) => {
        setInputValue(e.target.value);
    };

    const handleInputConfirm = () => {
        if (inputValue && !tags.includes(inputValue)) {
            const newTags = [...tags, inputValue];
            setTags(newTags);
            onChange?.(newTags); // Уведомляем форму об изменении
        }
        setInputVisible(false);
        setInputValue('');
    };

    const handleEditInputChange = (e) => {
        setEditInputValue(e.target.value);
    };

    const handleEditInputConfirm = () => {
        const newTags = [...tags];
        newTags[editInputIndex] = editInputValue;
        setTags(newTags);
        setEditInputIndex(-1);
        setEditInputValue('');
        onChange?.(newTags); // Уведомляем форму об изменении
    };

    return (
        <>
            <div className="section-title">
                <BellOutlined />
                {t("triggersTitle") || "Триггеры"}
            </div>
            <div className="section-description">
                {t("triggersDescription") || "Настройте ключевые слова и фразы для активации специальных реакций агента"}
            </div>

            <div className="step">
                    <span>
                        {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                        {t("triggersCreate") || "Создать"} <a onClick={setShow}>{t("triggersLink") || "триггеры активации"}</a>&nbsp;
                    </span>
                <Switch
                    checked={switchChecked}
                    checkedChildren={<span style={{color: "black"}}>{t("Yes") || "Да"}</span>}
                    unCheckedChildren={<span style={{color: "black"}}>{t("No") || "Нет"}</span>}
                    onChange={handleSwitchChange}
                />
            </div>

            {switchChecked && (

                <div style={{display: 'flex', flexWrap: 'wrap', gap: '5px 0'}}>
                    {tags.map((tag, index) => {
                        if (editInputIndex === index) {
                            return (
                                <Input
                                    ref={editInputRef}
                                    key={tag}
                                    size="small"
                                    style={{width: 64, height: 22, marginInlineEnd: 8, verticalAlign: 'top'}}
                                    value={editInputValue}
                                    onChange={handleEditInputChange}
                                    onBlur={handleEditInputConfirm}
                                    onPressEnter={handleEditInputConfirm}
                                />
                            );
                        }
                        const isLongTag = tag.length > 20;
                        const tagElem = (
                            <Tag
                                key={tag}
                                closable={true}
                                style={{userSelect: 'none'}}
                                onClose={() => handleClose(tag)}
                            >
                        <span
                            onDoubleClick={(e) => {
                                setEditInputIndex(index);
                                setEditInputValue(tag);
                                e.preventDefault();
                            }}
                        >
                            {isLongTag ? `${tag.slice(0, 20)}...` : tag}
                        </span>
                            </Tag>
                        );
                        return isLongTag ? (
                            <Tooltip title={tag} key={tag}>
                                {tagElem}
                            </Tooltip>
                        ) : (
                            tagElem
                        );
                    })}
                    {inputVisible ? (
                        <Input
                            ref={inputRef}
                            type="text"
                            size="small"
                            style={{width: 128, height: 22, marginInlineEnd: 8, verticalAlign: 'top'}}
                            value={inputValue}
                            onChange={handleInputChange}
                            onBlur={handleInputConfirm}
                            onPressEnter={handleInputConfirm}
                        />
                    ) : (
                        <Tag
                            style={{
                                height: 22,
                                background: token.colorBgContainer,
                                borderStyle: 'dashed',
                            }}
                            icon={<PlusOutlined/>}
                            onClick={showInput}
                        >
                            {t("triggersAddNew") || "Добавить триггер"}
                        </Tag>
                    )}

                </div>
            )}

            <Modal
                title={t("triggersModalTitle") || "Триггеры активации"}
                open={isOpen}
                onCancel={handleCancel}
                footer={null}
                width={700}
            >
                <Title
                    style={{
                        fontSize: '16px',
                    }}>
                    {t("triggersModalDescription") || "Триггеры — это ключевые слова или фразы, при обнаружении которых агент может выполнять специальные действия или менять поведение."}
                </Title>

                <Title
                    level={4}
                    style={{
                        fontSize: '16px',
                        marginTop: '24px',
                        marginBottom: '16px'
                    }}>
                    {t("triggersModalWhatAre") || "Что такое триггеры?"}
                </Title>
                <Paragraph
                    code={true}
                    style={{
                        whiteSpace: 'pre-wrap',
                        display: 'block',
                        fontSize: '14px',
                        padding: '12px',
                        borderRadius: '6px',
                        marginBottom: '16px'
                    }}
                >
                    {t("triggersModalWhatAreContent") || "Триггеры позволяют настроить реакцию агента на определенные слова или фразы пользователя. Когда пользователь упоминает триггерное слово, агент может:\n• Изменить стиль общения\n• Предоставить специальную информацию\n• Активировать определенные функции\n• Переключиться на другой сценарий диалога"}
                </Paragraph>

                <Title
                    level={4}
                    style={{
                        fontSize: '16px',
                        marginBottom: '16px'
                    }}>
                    {t("triggersModalExamples") || "Примеры использования"}
                </Title>
                <Paragraph
                    code={true}
                    style={{
                        whiteSpace: 'pre-wrap',
                        display: 'block',
                        fontSize: '14px',
                        padding: '12px',
                        borderRadius: '6px',
                        marginBottom: '16px'
                    }}
                >
                    {t("triggersModalExamplesContent") || "📞 Триггер \"цена\" или \"стоимость\":\n→ Агент предоставляет подробную информацию о ценах\n\n🎁 Триггер \"скидка\" или \"акция\":\n→ Агент рассказывает о текущих специальных предложениях\n\n📋 Триггер \"инструкция\" или \"как использовать\":\n→ Агент переходит в режим обучения и детально объясняет функционал\n\n🆘 Триггер \"помощь\" или \"не понимаю\":\n→ Агент упрощает объяснения и предлагает дополнительную поддержку"}
                </Paragraph>

                <Title
                    level={4}
                    style={{
                        fontSize: '16px',
                        marginBottom: '16px'
                    }}>
                    {t("triggersModalSetup") || "Настройка триггеров"}
                </Title>
                <Paragraph
                    code={true}
                    style={{
                        whiteSpace: 'pre-wrap',
                        display: 'block',
                        fontSize: '14px',
                        padding: '12px',
                        borderRadius: '6px',
                        marginBottom: '16px'
                    }}
                >
                    {t("triggersModalSetupContent") || "1. Добавьте триггерные слова или фразы в список\n2. В промпте модели опишите, как агент должен реагировать на каждый триггер\n3. Используйте условия в промпте: \"Если пользователь упоминает [триггер], то...\"\n4. Протестируйте работу триггеров в диалоге"}
                </Paragraph>

                <Title
                    level={4}
                    style={{
                        fontSize: '16px',
                        marginBottom: '16px'
                    }}>
                    {t("triggersModalPromptExample") || "Пример настройки в промпте:"}
                </Title>
                <Paragraph
                    code={true}
                    style={{
                        whiteSpace: 'pre-wrap',
                        display: 'block',
                        fontSize: '14px',
                        padding: '12px',
                        borderRadius: '6px',
                        marginBottom: '16px'
                    }}
                >
                    <Typography.Text code>
                        {t("triggersModalPromptExampleContent") || "\"#Триггеры активации\nЕсли пользователь упоминает слова 'цена', 'стоимость' или 'сколько стоит' - предоставь полную информацию о ценах на все тарифы.\nЕсли пользователь говорит 'скидка' или 'акция' - расскажи о текущих специальных предложениях и промокодах.\nЕсли пользователь пишет 'помощь' или 'не понимаю' - упрости объяснения и предложи связаться с оператором.\""}
                    </Typography.Text>
                </Paragraph>

                <Title
                    level={4}
                    style={{
                        fontSize: '16px',
                        marginBottom: '16px'
                    }}>
                    {t("triggersModalBenefits") || "Преимущества использования триггеров"}
                </Title>
                <Paragraph
                    code={true}
                    style={{
                        whiteSpace: 'pre-wrap',
                        display: 'block',
                        fontSize: '14px',
                        padding: '12px',
                        borderRadius: '6px'
                    }}
                >
                    {t("triggersModalBenefitsContent") || "✓ Персонализированный опыт пользователя\n✓ Быстрый доступ к важной информации\n✓ Автоматическая адаптация поведения агента\n✓ Улучшение конверсии и вовлеченности\n✓ Гибкое управление сценариями диалога"}
                </Paragraph>
            </Modal>
        </>
    );
};