import React, {useEffect, useRef, useState} from 'react';
import {PlusOutlined, BellOutlined} from '@ant-design/icons';
import {Input, Modal, Switch, Tag, theme, Tooltip, Typography} from 'antd';

export const Triggers = ({value = [], onChange, initial}) => {
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
                Триггеры модели
            </div>
            <div className="section-description">
                Настройте автоматические уведомления при появлении ключевых слов в сообщениях пользователей
            </div>

            <div className="step">
                    <span>
                        {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                        Создать действия при <a onClick={setShow}>срабатывании триггеров</a>&nbsp;
                    </span>
                <Switch
                    checked={switchChecked}
                    checkedChildren={<span style={{color: "black"}}>Да</span>}
                    unCheckedChildren={<span style={{color: "black"}}>Нет</span>}
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
                            Добавить триггер
                        </Tag>
                    )}

                </div>
            )}

            <Modal
                title="Срабатывание триггеров"
                open={isOpen}
                onCancel={handleCancel}
                footer={null}
                width={700}
            >
                <Title
                    style={{
                        fontSize: '16px',
                    }}>
                    "Триггеры" - это реакция модели на сообщения от пользователя содержащие указанный текст
                </Title>
                <Paragraph>
                    После получения сообщения от пользователя содержащем текст "триггера" модель уведомит вас о
                    срабатывании триггера.
                </Paragraph>
                <Paragraph
                    code={true}
                    style={{
                        whiteSpace: 'pre-wrap',
                        display: 'block',
                        fontSize: '16px',
                    }}
                >
                    Например если триггером является слово «скидка» то при появлении в сообщении пользователя этого
                    триггера:{'\n'}
                    {'\t'}Пользователь - "Есть ли скидка при оплате за 3 месяца?"{'\n'}
                </Paragraph>
                <Paragraph>
                    Ассистент уведомит вас об этом. Тип действия при срабатывании триггера, нужно указать в разделе -
                    "Уведомления"
                </Paragraph>
            </Modal>
        </>
    );
};