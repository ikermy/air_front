import {Modal, Switch, Typography} from "antd";
import React, {useCallback, useEffect, useState} from "react";
import {MdOutlinePersonSearch} from "react-icons/md";
import {checkServiceAvailable} from "../Services/LeadHunter/leadUtils";
import {useTranslation} from "react-i18next";

export const LeadHaunter = ({initial, value, onChange}) => {
    const {Title, Paragraph} = Typography;
    const {t} = useTranslation();
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const [isServiceAvailable, setIsServiceAvailable] = useState(false);

    const showInfo = () => {
        setIsInfoOpen(true);
    };

    const handleCancel = () => {
        setIsInfoOpen(false);
    };

    // Определяем текущее значение: приоритет у value из формы, затем у initial
    const currentValue = value !== undefined ? value : (initial || false);

    const handleSwitchChange = (checked) => {
        // Уведомляем форму об изменении
        if (onChange) {
            onChange(checked);
        }
    };

    // Проверка доступности сервиса LeadHaunter
    const checkServiceAvailability = useCallback(async () => {
        try {
            const available = await checkServiceAvailable();
            setIsServiceAvailable(available);
        } catch (e) {
            console.error('Ошибка проверки доступности сервиса LeadHaunter:', e);
            setIsServiceAvailable(false);
        }
    }, []);

    // Проверка доступности сервиса с задержкой 250 мс
    useEffect(() => {
        const timer = setTimeout(() => {
            checkServiceAvailability();
        }, 250);
        return () => clearTimeout(timer);
    }, [checkServiceAvailability]);

    return (
        <>
            <div className="section-title">
                <MdOutlinePersonSearch/>
                {t("leadHunter") || "Lead Hunter"}
            </div>
            <div className="section-description">
                {t("leadHunterDescription") || "Если включен Lead Hunter, модель будет использоваться для автоматического поиска потенциальных лидов"}
            </div>

            <div className="step">
                <span>
                    {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                    {t("leadHunterReadMore") || "Подробнее о"} <a onClick={showInfo}>{t("leadHunterMoreInfo") || "работе Lead Hunter"}</a>
                </span>
                <Switch
                    checked={currentValue}
                    checkedChildren={<span style={{color: "black"}}>{t("Yes") || "Да"}</span>}
                    unCheckedChildren={<span style={{color: "black"}}>{t("No") || "Нет"}</span>}
                    onChange={handleSwitchChange}
                    disabled={!isServiceAvailable}
                />
            </div>

            {/* Модальное окно с информацией */}
            <Modal
                title={t("leadHunter") || "Lead Hunter"}
                open={isInfoOpen}
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
                    {t("leadHunterTitle") || "Автоматический поиск и обработка потенциальных клиентов"}
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
                    <Typography.Text strong>{t("leadHunter") || "Lead Hunter"}</Typography.Text> — {t("leadHunterIntro") || "это сервис для автоматического поиска и обработки потенциальных клиентов (лидов) в Telegram и WhatsApp."}
                </Paragraph>

                <Paragraph style={{marginBottom: '16px'}}>
                    <Typography.Text strong>{t("leadHunterCapabilities") || "Основные возможности"}:</Typography.Text>
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
                    {t("leadHunterCapability1") || "• Автоматический поиск потенциальных клиентов"}{"\n"}
                    {t("leadHunterCapability2") || "• Фильтрация по заданным критериям"}{"\n"}
                    {t("leadHunterCapability3") || "• Отправка целевых сообщений"}{"\n"}
                    {t("leadHunterCapability4") || "• Аналитика и отчетность"}{"\n"}
                </Paragraph>

                <Paragraph style={{marginBottom: '16px'}}>
                    <Typography.Text strong>{t("leadHunterSetup") || "Для корректной работы"}:</Typography.Text>
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
                    {t("leadHunterSetupStep1") || "1. Настроить параметры поиска в модели"}{"\n"}
                    {t("leadHunterSetupStep2") || "2. Указать критерии фильтрации лидов"}{"\n"}
                    {t("leadHunterSetupStep3") || "3. Настроить шаблоны сообщений"}{"\n"}
                    {t("leadHunterSetupStep4") || "4. Запустить сервис Lead Hunter"}{"\n"}
                </Paragraph>

                <Paragraph style={{marginBottom: '16px'}}>
                    <Typography.Text type="warning" strong>
                        {t("leadHunterWarning") || "Внимание!"}
                    </Typography.Text>
                    {' '}{t("leadHunterWarningText") || "Соблюдайте правила Telegram и WhatsApp и не злоупотребляйте рассылками."}
                </Paragraph>
            </Modal>
        </>
    );
};
