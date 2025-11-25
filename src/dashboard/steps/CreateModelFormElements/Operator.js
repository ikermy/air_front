import {Modal, Switch, Typography, Button, Input, List, Popconfirm, message, InputNumber} from "antd";
import React, {useCallback, useEffect, useState} from "react";
import {MdOutlineSupportAgent} from "react-icons/md";
import {funcOperators, saveOperators} from "./funcOperators";
import {validateAndRefreshToken} from "../../../utils/easyUtils";
import {showErrorNotification, showNotification} from "../../hotification/showNotification";

export const Operator = ({initial, value, onChange, token}) => {
    const {Title, Paragraph} = Typography;
    const [isTargetOpen, setIsTargetOpen] = useState(false);
    const [isOperatorsModalOpen, setIsOperatorsModalOpen] = useState(false);
    const [operators, setOperators] = useState([]);
    const [editableOperators, setEditableOperators] = useState([]);
    const [saving, setSaving] = useState(false);
    const [newOperatorId, setNewOperatorId] = useState('');

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
            message.warning('Этот оператор уже добавлен');
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
                    showNotification("Операторы успешно сохранены");
                    setIsOperatorsModalOpen(false);
                    setNewOperatorId('');
                } else {
                    setIsOperatorsModalOpen(false);
                    showErrorNotification("Ошибка при сохранении операторов");
                }
            } catch (error) {
                setIsOperatorsModalOpen(false);
                showErrorNotification("Ошибка при сохранении операторов");
            } finally {
                setSaving(false);
            }
        } else {
            message.error('Ошибка аутентификации. Пожалуйста, войдите снова.');
        }
    };

    const getOperatorsCountText = (count) => {
        if (count === 0) return 'Операторы не зарегистрированы';
        if (count === 1) return 'Зарегистрирован 1 оператор';
        if (count < 5) return `Зарегистрировано ${count} оператора`;
        return `Зарегистрировано ${count} операторов`;
    };

    // Определяем текущее значение: приоритет у value из формы, затем у initial
    const currentValue = value !== undefined ? value : (initial || false);

    const handleSwitchChange = (checked) => {
        // Уведомляем форму об изменении
        if (onChange) {
            onChange(checked);
        }
    };

    // Единая функция загрузки операторов
    const loadOperators = useCallback(async () => {
        if (!token) {
            console.error('Ошибка аутентификации. Пожалуйста, войдите снова.');
            setOperators([]);
            return [];
        }
        try {
            const data = await funcOperators(token);
            setOperators(data || []);
            return data || [];
        } catch (e) {
            console.error('Ошибка загрузки операторов:', e);
            setOperators([]);
            return [];
        }
    }, [token]);

    // Загрузка операторов с задержкой 500 мс
    useEffect(() => {
        const timer = setTimeout(() => {
            loadOperators();
        }, 500);
        return () => clearTimeout(timer);
    }, [loadOperators]);

    return (
        <>
            <div className="section-title">
                <MdOutlineSupportAgent/>
                Вызов оператора
            </div>
            <div className="section-description">
                Если в настройках модели выбран оператор, то модель будет переключаться на него при срабатывании условия
            </div>

            <div className="step">
                    <span>
                        {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                        Добавьте <a onClick={showTarget}>список операторов</a>&nbsp; на которых будут переводиться вопросы пользователей
                    </span>
                <Switch
                    checked={currentValue}
                    checkedChildren={<span style={{color: "black"}}>Да</span>}
                    unCheckedChildren={<span style={{color: "black"}}>Нет</span>}
                    onChange={handleSwitchChange}
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
                            Управление
                        </Button>
                    </div>
                </div>
            )}

            {/* Модальное окно для управления операторами */}
            <Modal
                title="Управление операторами"
                open={isOperatorsModalOpen}
                onCancel={handleOperatorsModalCancel}
                width={600}
                footer={[
                    <Button key="cancel" onClick={handleOperatorsModalCancel}>
                        Отмена
                    </Button>,
                    <Button
                        style={{color: 'black'}}
                        key="save"
                        type="primary"
                        loading={saving}
                        onClick={handleSaveOperators}
                    >
                        Сохранить изменения
                    </Button>
                ]}
            >
                <div style={{marginBottom: '16px'}}>
                    <Input.Group compact>
                        <InputNumber
                            style={{ width: 'calc(100% - 100px)' }}
                            placeholder="Введите Telegram ID оператора"
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
                            Добавить
                        </Button>
                    </Input.Group>
                </div>

                <List
                    dataSource={editableOperators}
                    locale={{emptyText: 'Нет добавленных операторов'}}
                    renderItem={(operatorId) => (
                        <List.Item
                            actions={[
                                <Popconfirm
                                    key="delete"
                                    title="Удалить оператора?"
                                    description={`Вы уверены, что хотите удалить оператора ${operatorId}?`}
                                    onConfirm={() => removeOperator(operatorId)}
                                    okText="Удалить"
                                    cancelText="Отмена"
                                    okButtonProps={{style: {color: 'black'}}}
                                    getPopupContainer={() => document.querySelector('.ant-modal-body') || document.body}
                                    zIndex={1050}
                                >
                                    <Button
                                        type="link"
                                        danger size="small"
                                    >
                                        Удалить
                                    </Button>
                                </Popconfirm>
                            ]}
                        >
                            <List.Item.Meta
                                title={`Оператор ${operatorId}`}
                                description={`Telegram ID: ${operatorId}`}
                            />
                        </List.Item>
                    )}
                />
            </Modal>

            <Modal
                title="Список операторов"
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
                    ID Telegram аккаунтов которые будут отвечать пользователям в случае переключения модели в
                    операторский режим.
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
                    Можно указать несколько <Typography.Text strong>TelegramID</Typography.Text>. В таком случае
                    операторы будут выбираться в
                    зависимости от загруженности, сначала те у кого меньше всего активных диалогов. Если у всех
                    операторов одинаковая загруженность,
                    то выбирается случайный.
                </Paragraph>

                <Paragraph style={{marginBottom: '16px'}}>
                    <Typography.Text strong>TelegramID</Typography.Text> можно узнать с помощью бота{' '}
                    <a href="https://t.me/MarusiaAiOperatorBot" target="_blank" rel="noopener noreferrer">
                        @MarusiaAiOperatorBot
                    </a>{' '}
                    отправив команду /start
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
                    При включении операторского режима, оператор получит историю сообщений Агента и пользователя.
                    Все сообщения пользователя к модели будет получать оператор включая <Typography.Text strong>голосовые
                    сообщения и файлы</Typography.Text>.
                    В ответ оператор так же может отправлять <Typography.Text
                    strong>файлы</Typography.Text> пользователю.
                    В любой момент оператор может завершить диалог и работа Агента продолжится в обычном режиме.
                </Paragraph>

                <Paragraph style={{marginBottom: '16px'}}>
                    <Typography.Text strong>Для корректной работы операторского режима</Typography.Text> нужно верно
                    указать это в настройках модели, например так:
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
                        ## Режим оператора
                        operator=true ТОЛЬКО если в вопросе пользователя была фраза "соедини меня с оператором"{"\n"}
                        В таком случае отвечай "Соединяю с оператором 👨‍💼"{"\n"}
                        Во ВСЕХ остальных случаях operator=false{"\n"}
                    </Typography.Text>
                </Paragraph>
            </Modal>
        </>
    )
}