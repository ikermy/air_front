import {Form, Input, Modal, Switch, Typography} from "antd";
import React, {useEffect, useState} from "react";
import {FlagOutlined} from "@ant-design/icons";

export const Target = ({initial}) => {
    const {Title, Paragraph} = Typography;
    const [isTargetOpen, setIsTargetOpen] = useState(false);
    const [switchChecked, setSwitchChecked] = useState(false);

    const showTarget = () => {
        setIsTargetOpen(true);
    };

    const handleCancel = () => {
        setIsTargetOpen(false)
    };

    const handleSwitchChange = (checked) => {
        setSwitchChecked(checked);
    };

    useEffect(() => {
        if (initial && initial.length > 0) {
            setSwitchChecked(true)
        } else {
            setSwitchChecked(false)
        }
    }, [initial]);

    return (
        <>
            <div className="section-title">
                <FlagOutlined />
                Цели модели
            </div>
            <div className="section-description">
                Настройте действия ассистента при достижении определенных целей в диалоге
            </div>

            <div className="step">
                    <span>
                        {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                        Создать действие при <a onClick={showTarget}>достижении цели</a>&nbsp;
                    </span>
                <Switch
                    checked={switchChecked}
                    checkedChildren={<span style={{color: "black"}}>Да</span>}
                    unCheckedChildren={<span style={{color: "black"}}>Нет</span>}
                    onChange={handleSwitchChange}
                />
            </div>

            {switchChecked && (
                <Form.Item
                    name="action"
                    rules={[
                        {
                            required: true,
                            message: "Пожалуйста, укажите цель!",
                        },
                    ]}
                >
                    <Input prefix={<FlagOutlined/>} placeholder="Укажите целевую фразу"/>
                </Form.Item>
            )}

            <Modal
                title="Достижение цели"
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
                    "Достижение цели" - действие Ассистента при достижении цели.
                </Title>

                <Paragraph style={{ marginBottom: '16px' }}>
                    Действие при отправке моделью сообщения указанного в разделе <Typography.Text strong>«цели модели»</Typography.Text>. Для выполнения цели
                    необходимо точно указание сообщения указанного в разделе - <Typography.Text strong>"Цели модели"</Typography.Text>
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
                        "#Цель - Убедить пользователя зарегистрироваться и попробовать тестовый период использования Marusia AI. Как
                        только пользователь согласится попробовать тестовый период, заверши диалог фразой - «Я уверена, что вам
                        понравится наш сервис!»" и установи target=true
                    </Typography.Text>
                </Paragraph>

                <Paragraph style={{ marginBottom: '16px' }}>
                    <Typography.Text strong code>target=true</Typography.Text> - является важным!
                </Paragraph>

                <Paragraph style={{ marginBottom: '16px' }}>
                    Ассистент использует <Typography.Text italic>строгую структуру ответов</Typography.Text>, и он обязательно должен пометить ответ,
                    если он считает что он достиг цели.
                </Paragraph>

                <Paragraph style={{ marginBottom: '16px' }}>
                    В таком случае действие при достижении цели будет таким:
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
                        "#действие при достижении цели - «Согласие пользователя на тестовый период»"
                    </Typography.Text>
                </Paragraph>

                <Paragraph style={{ marginBottom: '16px' }}>
                    Само сообщение является просто <Typography.Text underline>понятной фразой</Typography.Text> для вас, чтобы вы понимали, что именно произошло.
                    Эта фраза будет оправлена вам в виде уведомления от Ассистента, когда цель будет достигнута.
                </Paragraph>

                <Paragraph style={{ marginBottom: '16px' }}>
                    Тип действия при достижении цели, нужно указать в разделе - <Typography.Text strong>"Уведомления"</Typography.Text>
                </Paragraph>

                <Paragraph>
                    При этом само достижение цели <strong>не является обязательным</strong>, и вы можете не использовать его!
                </Paragraph>
            </Modal>
        </>
    )
}