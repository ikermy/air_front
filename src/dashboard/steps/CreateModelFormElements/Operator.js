import {Modal, Switch, Typography, Button, Input, List, Popconfirm, message, InputNumber} from "antd";
import React, {useCallback, useEffect, useState} from "react";
import {MdOutlineSupportAgent} from "react-icons/md";
import {funcOperators, saveOperators} from "./funcOperators";
import {validateAndRefreshToken} from "../../../utils/easyUtils";
import {showErrorNotification, showNotification} from "../../hotification/showNotification";
import {chAvailable} from "../Channals/chUtils";
import {useTranslation} from "react-i18next";

export const Operator = ({initial, value, onChange, token}) => {
    const {t} = useTranslation();
    const {Title, Paragraph} = Typography;
    const [isTargetOpen, setIsTargetOpen] = useState(false);
    const [isOperatorsModalOpen, setIsOperatorsModalOpen] = useState(false);
    const [operators, setOperators] = useState([]);
    const [editableOperators, setEditableOperators] = useState([]);
    const [saving, setSaving] = useState(false);
    const [newOperatorId, setNewOperatorId] = useState('');
    const [isServiceAvailable, setIsServiceAvailable] = useState(false);

    const showTarget = () => {
        setIsTargetOpen(true);
    };

    const handleCancel = () => {
        setIsTargetOpen(false)
    };

    const showOperatorsModal = () => {
        setEditableOperators([...operators]);
        setIsOperatorsModalOpen(true);
    };

    const handleOperatorsModalCancel = () => {
        setIsOperatorsModalOpen(false);
        setNewOperatorId('');
        setEditableOperators([]);
    };

    const handleAddOperatorEnter = (e) => {
        if (e.key === 'Enter') addOperator();
    };

    const addOperator = () => {
        if (newOperatorId.trim() && !editableOperators.includes(newOperatorId.trim())) {
            setEditableOperators([...editableOperators, newOperatorId.trim()]);
            setNewOperatorId('');
        } else if (editableOperators.includes(newOperatorId.trim())) {
            message.warning(t("operatorAlreadyAdded") || 'Этот оператор уже добавлен');
        }
    };

    const removeOperator = (operatorId) => {
        setEditableOperators(editableOperators.filter(id => id !== operatorId));
    };

    const handleSaveOperators = async () => {
        setSaving(true);
        const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
        if (token != null) {
            try {
                const result = await saveOperators(token, editableOperators);
                if (result) {
                    setOperators([...editableOperators]);
                    showNotification(t("operatorsSaved") || "Операторы успешно сохранены");
                    setIsOperatorsModalOpen(false);
                    setNewOperatorId('');
                } else {
                    setIsOperatorsModalOpen(false);
                    showErrorNotification(t("operatorsSaveError") || "Ошибка при сохранении операторов");
                }
            } catch (error) {
                setIsOperatorsModalOpen(false);
                showErrorNotification(t("operatorsSaveError") || "Ошибка при сохранении операторов");
            } finally {
                setSaving(false);
            }
        } else {
            message.error(t("authError") || 'Ошибка аутентификации. Пожалуйста, войдите снова.');
        }
    };

    const getOperatorsCountText = (count) => {
        if (count === 0) return t("operatorNoRegistered") || 'Операторы не зарегистрированы';
        if (count === 1) return t("operatorRegisteredOne") || 'Зарегистрирован 1 оператор';
        if (count < 5) return t("operatorRegisteredFew", {count}) || `Зарегистрировано ${count} оператора`;
        return t("operatorRegisteredMany", {count}) || `Зарегистрировано ${count} операторов`;
    };

    // Определяем текущее значение: приоритет у value из формы, затем у initial
    const currentValue = value !== undefined ? value : (initial || false);

    const handleSwitchChange = (checked) => {
        // Уведомляем форму об изменении
        if (onChange) {
            onChange(checked);
        }
    };

    // Проверка доступности сервиса операторов
    const checkServiceAvailability = useCallback(async () => {
        if (!token) {
            setIsServiceAvailable(false);
            return;
        }
        try {
            const available= await chAvailable('oper');
            setIsServiceAvailable(available);
        } catch (e) {
            console.error(t("operatorServiceCheckError") || 'Ошибка проверки доступности сервиса операторов:', e);
            setIsServiceAvailable(false);
        }
    }, [token, t]);

    // Единая функция загрузки операторов
    const loadOperators = useCallback(async () => {
        if (!token) {
            console.error(t("authError") || 'Ошибка аутентификации. Пожалуйста, войдите снова.');
            setOperators([]);
            return [];
        }
        try {
            const data = await funcOperators(token);
            setOperators(data || []);
            return data || [];
        } catch (e) {
            console.error(t("operatorLoadError") || 'Ошибка загрузки операторов:', e);
            setOperators([]);
            return [];
        }
    }, [token, t]);

    // Проверка доступности сервиса и загрузка операторов с задержкой 500 мс
    useEffect(() => {
        const timer = setTimeout(() => {
            checkServiceAvailability();
            loadOperators();
        }, 500);
        return () => clearTimeout(timer);
    }, [checkServiceAvailability, loadOperators]);

    return (
        <>
            <div className="section-title">
                <MdOutlineSupportAgent/>
                {t("operatorTitle") || "Операторский режим"}
            </div>
            <div className="section-description">
                {t("operatorDescription") || "Настройка переключения диалога на живых операторов при определенных условиях"}
            </div>

            <div className="step">
                    <span>
                        {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                        {t("operatorUseMode") || "Использовать операторский"} <a onClick={showTarget}>{t("operatorModeLink") || "режим"}</a>&nbsp;
                    </span>
                <Switch
                    checked={currentValue}
                    checkedChildren={<span style={{color: "black"}}>{t("Yes") || "Да"}</span>}
                    unCheckedChildren={<span style={{color: "black"}}>{t("No") || "Нет"}</span>}
                    onChange={handleSwitchChange}
                    disabled={!isServiceAvailable}
                />
            </div>

            {value && (
                <div style={{marginTop: '16px'}}>
                    <div
                        onClick={showOperatorsModal}
                        style={{
                            padding: '12px 16px',
                            border: '1px solid #d9d9d9',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.3s',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}
                        onMouseEnter={(e) => {
                            // e.target.style.backgroundColor = '#f0f0f0';
                            e.target.style.borderColor = 'var(--link-hover-color)';
                        }}
                        onMouseLeave={(e) => {
                            // e.target.style.backgroundColor = '#fafafa';
                            e.target.style.borderColor = '#d9d9d9';
                        }}
                    >
                        <span>{getOperatorsCountText(operators.length)}</span>
                        <Button type="link" size="small">
                            {t("management") || "Управление"}
                        </Button>
                    </div>
                </div>
            )}

            {/* Модальное окно для управления операторами */}
            <Modal
                title={t("operatorManagement") || "Управление операторами"}
                open={isOperatorsModalOpen}
                onCancel={handleOperatorsModalCancel}
                width={600}
                footer={[
                    <Button key="cancel" onClick={handleOperatorsModalCancel}>
                        {t("cancel") || "Отмена"}
                    </Button>,
                    <Button
                        style={{color: 'black'}}
                        key="save"
                        type="primary"
                        loading={saving}
                        onClick={handleSaveOperators}
                    >
                        {t("saveChanges") || "Сохранить изменения"}
                    </Button>
                ]}
            >
                <div style={{marginBottom: '16px'}}>
                    <Input.Group compact>
                        <InputNumber
                            style={{ width: 'calc(100% - 100px)' }}
                            placeholder={t("operatorEnterTelegramId") || "Введите Telegram ID оператора"}
                            value={newOperatorId}
                            onChange={(val) => setNewOperatorId(val ?? '')}
                            stringMode
                            controls={false}
                            precision={0}
                            min={0}
                            inputMode="numeric"
                            onKeyDown={handleAddOperatorEnter}
                        />
                        <Button
                            style={{color: 'black'}}
                            type="primary"
                            onClick={addOperator}
                            disabled={!newOperatorId.trim()}
                        >
                            {t("add") || "Добавить"}
                        </Button>
                    </Input.Group>
                </div>

                <List
                    dataSource={editableOperators}
                    locale={{emptyText: t("operatorNoOperators") || 'Нет добавленных операторов'}}
                    renderItem={(operatorId) => (
                        <List.Item
                            actions={[
                                <Popconfirm
                                    key="delete"
                                    title={t("operatorDeleteConfirm") || "Удалить оператора?"}
                                    description={t("operatorDeleteDescription", {id: operatorId}) || `Вы уверены, что хотите удалить оператора ${operatorId}?`}
                                    onConfirm={() => removeOperator(operatorId)}
                                    okText={t("delete") || "Удалить"}
                                    cancelText={t("cancel") || "Отмена"}
                                    okButtonProps={{style: {color: 'black'}}}
                                    getPopupContainer={() => document.querySelector('.ant-modal-body') || document.body}
                                    zIndex={1050}
                                >
                                    <Button
                                        type="link"
                                        danger size="small"
                                    >
                                        {t("delete") || "Удалить"}
                                    </Button>
                                </Popconfirm>
                            ]}
                        >
                            <List.Item.Meta
                                title={t("operatorLabel", {id: operatorId}) || `Оператор ${operatorId}`}
                                description={t("operatorTelegramId", {id: operatorId}) || `Telegram ID: ${operatorId}`}
                            />
                        </List.Item>
                    )}
                />
            </Modal>

            <Modal
                title={t("operatorsList") || "Список операторов"}
                open={isTargetOpen}
                onCancel={handleCancel}
                footer={null}
                width={700}
            >
                <Title
                    level={4}
                    style={{
                        fontSize: '16px',
                        marginBottom: '16px'
                    }}>
                    {t("operatorListDescription") || "ID Telegram аккаунтов которые будут отвечать пользователям в случае переключения модели в операторский режим."}
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
                    {t("operatorMultipleIds") || "Можно указать несколько TelegramID. В таком случае операторы будут выбираться в зависимости от загруженности, сначала те у кого меньше всего активных диалогов. Если у всех операторов одинаковая загруженность, то выбирается случайный."}
                </Paragraph>

                <Paragraph style={{marginBottom: '16px'}}>
                    <Typography.Text strong>TelegramID</Typography.Text> {t("operatorGetIdBot") || "можно узнать с помощью бота"}{' '}
                    <a href="https://t.me/MarusiaAiOperatorBot" target="_blank" rel="noopener noreferrer">
                        @MarusiaAiOperatorBot
                    </a>{' '}
                    {t("operatorSendStart") || "отправив команду /start"}
                </Paragraph>
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
                    {t("operatorHistoryNote") || "При включении операторского режима, оператор получит историю сообщений Агента и пользователя. Все сообщения пользователя к модели будет получать оператор включая голосовые сообщения и файлы. В ответ оператор так же может отправлять файлы пользователю. В любой момент оператор может завершить диалог и работа Агента продолжится в обычном режиме."}
                </Paragraph>

                <Paragraph style={{marginBottom: '16px'}}>
                    <Typography.Text strong>{t("operatorSetupNote") || "Для корректной работы операторского режима"}</Typography.Text> {t("operatorSetupExample") || "нужно верно указать это в настройках модели, например так:"}
                </Paragraph>

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
                        {t("operatorPromptExample") || "## Режим оператора\noperator=true ТОЛЬКО если в вопросе пользователя была фраза \"соедини меня с оператором\"\nВ таком случае отвечай \"Соединяю с оператором 👨‍💼\"\nВо ВСЕХ остальных случаях operator=false"}
                    </Typography.Text>
                </Paragraph>
            </Modal>
        </>
    )
}