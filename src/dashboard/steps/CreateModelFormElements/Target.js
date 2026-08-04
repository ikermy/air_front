import {Form, Input, Modal, Switch, Typography} from "antd";
import React, {useEffect, useState} from "react";
import {FlagOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";

export const Target = ({initial}) => {
    const {t} = useTranslation();
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
                {t("targetTitle") || "Цели модели"}
            </div>
            <div className="section-description">
                {t("targetDescription") || "Настройте действия агента при достижении определенных целей в диалоге"}
            </div>

            <div className="step">
                    <span>
                        {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                        {t("targetCreateAction") || "Создать действие при"} <a onClick={showTarget}>{t("targetAchievingGoal") || "достижении цели"}</a>&nbsp;
                    </span>
                <Switch
                    checked={switchChecked}
                    checkedChildren={<span style={{color: "black"}}>{t("Yes") || "Да"}</span>}
                    unCheckedChildren={<span style={{color: "black"}}>{t("No") || "Нет"}</span>}
                    onChange={handleSwitchChange}
                />
            </div>

            {switchChecked && (
                <Form.Item
                    name="action"
                    rules={[
                        {
                            required: true,
                            message: t("targetPleaseSpecify") || "Пожалуйста, укажите цель!",
                        },
                    ]}
                >
                    <Input prefix={<FlagOutlined/>} placeholder={t("targetPlaceholder") || "Укажите целевую фразу"}/>
                </Form.Item>
            )}

            <Modal
                title={t("targetModalTitle") || "Достижение цели"}
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
                    {t("targetModalDescription") || "\"Достижение цели\" - действие Агента при достижении цели."}
                </Title>

                <Paragraph style={{ marginBottom: '16px' }}>
                    {t("targetModalAction") || "Действие при отправке моделью сообщения указанного в разделе"} <Typography.Text strong>«{t("targetModalGoalsSection") || "цели модели"}»</Typography.Text>. {t("targetModalRequirement") || "Для выполнения цели необходимо точно указание сообщения указанного в разделе -"} <Typography.Text strong>"{t("targetModalGoalsSectionStrong") || "Цели модели"}"</Typography.Text>
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
                        {t("targetModalExample") || "#Цель - Убедить пользователя зарегистрироваться и попробовать тестовый период использования Marusia AI. Как только пользователь согласится попробовать тестовый период, заверши диалог фразой - «Я уверена, что вам понравится наш сервис!»\" и установи target=true"}
                    </Typography.Text>
                </Paragraph>

                <Paragraph style={{ marginBottom: '16px' }}>
                    <Typography.Text strong code>{t("targetModalImportant") || "target=true"}</Typography.Text> {t("targetModalImportantNote") || "- является важным!"}
                </Paragraph>

                <Paragraph style={{ marginBottom: '16px' }}>
                    {t("targetModalStructure") || "Агент использует"} <Typography.Text italic>{t("targetModalStrictStructure") || "строгую структуру ответов"}</Typography.Text>{t("targetModalMustMark") || ", и он обязательно должен пометить ответ, если он считает что он достиг цели."}
                </Paragraph>

                <Paragraph style={{ marginBottom: '16px' }}>
                    {t("targetModalActionExample") || "В таком случае действие при достижении цели будет таким:"}
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
                        {t("targetModalActionPhrase") || "#действие при достижении цели - «Согласие пользователя на тестовый период»"}
                    </Typography.Text>
                </Paragraph>

                <Paragraph style={{ marginBottom: '16px' }}>
                    {t("targetModalMessageNote") || "Само сообщение является просто"} <Typography.Text underline>{t("targetModalUnderstandablePhrase") || "понятной фразой"}</Typography.Text> {t("targetModalForYou") || "для вас, чтобы вы понимали, что именно произошло. Эта фраза будет оправлена вам в виде уведомления от Агента, когда цель будет достигнута."}
                </Paragraph>

                <Paragraph style={{ marginBottom: '16px' }}>
                    {t("targetModalNotificationsNote") || "Тип действия при достижении цели, нужно указать в разделе -"} <Typography.Text strong>"{t("targetModalNotifications") || "Уведомления"}"</Typography.Text>
                </Paragraph>

                <Paragraph>
                    {t("targetModalOptional") || "При этом само достижение цели"} <strong>{t("targetModalNotMandatory") || "не является обязательным"}</strong>{t("targetModalCanSkip") || ", и вы можете не использовать его!"}
                </Paragraph>
            </Modal>
        </>
    )
}
