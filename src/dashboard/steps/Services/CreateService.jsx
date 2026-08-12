import {GrServices} from "react-icons/gr";
import React, {useState} from "react";
import {Button, Dropdown, Typography, Empty, Popconfirm} from 'antd';
import {PlusOutlined, DownOutlined, PhoneOutlined, DeleteOutlined} from '@ant-design/icons';
import {useTranslation} from 'react-i18next';
import {showNotification, showErrorNotification} from "../../hotification/showNotification";
import {AvailableServicesList, AddService as AddServiceAPI, DelService} from "./serviceUtils";
import {checkServiceAvailable} from "./LeadHunter/leadUtils.js";
import {LeadHunterService} from "./addLeadHunter";
import {useEffect} from "react";
import {FaPersonCirclePlus } from "react-icons/fa6";
import {VoiceCallService} from "./VoiceCallService";

// Компонент кнопки добавления сервиса
const AddServiceButton = ({availableServices, onServiceSelect}) => {
    const {t} = useTranslation();
    const items = availableServices.map((service) => ({
        key: service.key,
        icon: service.icon,
        label: service.label,
    }));
    const handleMenuClick = ({key}) => {
        onServiceSelect(key);
    };
    return (
        <Dropdown
            menu={{
                items,
                onClick: handleMenuClick,
            }}
            trigger={["click"]}
        >
            <Button
                style={{
                    color: "black",
                }}
                type="primary"
                icon={<PlusOutlined/>}
            >
                {t("serviceAddButton") || "Добавить сервис"} <DownOutlined/>
            </Button>
        </Dropdown>
    );
};

export function CreateService() {
    const {t} = useTranslation();
    const [isServiceAdded, setIsServiceAdded] = useState(false);
    const [isVoiceCallAdded, setIsVoiceCallAdded] = useState(false);
    // Доступные сервисы для добавления
    const [availableServices, setAvailableServices] = useState([
        {
            key: "leadhunter",
            label: t("leadHunterService") || "Лидогенератор",
            // icon: <GrServices/>,
            icon: <FaPersonCirclePlus  />,
        },
        {
            key: "voice-call",
            label: t("voiceCallService") || "Voice calls",
            icon: <PhoneOutlined />,
        },
    ]);

    // Проверка доступных сервисов при монтировании компонента
    useEffect(() => {
        const checkAvailableServices = async () => {
            try {
                const response = await AvailableServicesList();
                if (!response.ok) return;

                const data = await response.json();
                if (Array.isArray(data.services) && data.services.includes('lead-haunter')) {
                    // Проверяем доступность сервиса перед добавлением
                    const isAvailable = await checkServiceAvailable();
                    if (isAvailable) {
                        const addResp = await AddServiceAPI( "lead-haunter");
                        if (addResp.ok) {
                            setIsServiceAdded(true);
                            setAvailableServices(prev => prev.filter(s => s.key !== 'leadhunter'));
                            showNotification(
                                t("success") || 'Успешно',
                                t("serviceAdded") || 'Сервис успешно добавлен'
                            );
                        }
                    }
                }
                if (Array.isArray(data.services) && data.services.includes('voice-call')) {
                    setIsVoiceCallAdded(true);
                    setAvailableServices(prev => prev.filter(s => s.key !== 'voice-call'));
                }
                // Если lead-haunter НЕ найден на сервере, НЕ удаляем его из списка
                // Оставляем возможность добавить вручную через кнопку
            } catch (error) {
                // В случае ошибки оставляем список сервисов как есть
            }
        };

        checkAvailableServices();
    }, [t]);

    // Обработчик удаления сервиса
    const handleServiceDeleted = (service = "lead-haunter") => {
        if (service === "lead-haunter") setIsServiceAdded(false);
        if (service === "voice-call") setIsVoiceCallAdded(false);
        const restored = service === "lead-haunter"
            ? { key: "leadhunter", label: t("leadHunterService") || "Лидогенератор", icon: <FaPersonCirclePlus /> }
            : { key: "voice-call", label: t("voiceCallService") || "Voice calls", icon: <PhoneOutlined /> };
        setAvailableServices(prev => prev.some(item => item.key === restored.key) ? prev : [...prev, restored]);
    };

    const deleteService = async (service) => {
        try {
            const response = await DelService(service);
            if (!response.ok) throw new Error("delete failed");
            handleServiceDeleted(service);
            showNotification(t("success") || "Успешно", t("serviceDeleted") || "Сервис успешно удалён");
        } catch {
            showErrorNotification(t("error") || "Ошибка", t("serviceDeleteError") || "Не удалось удалить сервис");
        }
    };

    // Обработчик выбора сервиса из списка
    const handleServiceSelect = async (key) => {
        if (key === "leadhunter") {
            try {
                const isAvailable = await checkServiceAvailable();
                if (!isAvailable) {
                    showErrorNotification(
                        t("notifVerificationError") || 'Ошибка',
                        t("leadHunterUnavailable") || 'Сервис Lead Hunter недоступен'
                    );
                    return;
                }
                const addResp = await AddServiceAPI("lead-haunter");
                if (addResp.ok) {
                    setIsServiceAdded(true);
                    setAvailableServices(prev => prev.filter(s => s.key !== 'leadhunter'));
                    showNotification(
                        t("success") || 'Успешно',
                        t("serviceAdded") || 'Сервис успешно добавлен'
                    );
                }
            } catch (error) {
                showErrorNotification(
                    t("error") || 'Ошибка',
                    t("serviceCheckError") || 'Ошибка при проверке сервиса'
                );
            }
        } else if (key === "voice-call") {
            try {
                const addResp = await AddServiceAPI("voice-call");
                if (addResp.ok) {
                    setIsVoiceCallAdded(true);
                    setAvailableServices(prev => prev.filter(s => s.key !== "voice-call"));
                    showNotification(t("success") || "Успешно", t("serviceAdded") || "Сервис успешно добавлен");
                }
            } catch (error) {
                showErrorNotification(t("error") || "Ошибка", t("serviceCheckError") || "Ошибка при проверке сервиса");
            }
        }
    };

    return (
        <>
            <div className="create-model-container">
                {availableServices.length > 0 && (
                    <>
                        <div className="section-title">
                            <GrServices />
                            {t("devServices") || "Сервисы"}
                        </div>
                        <div className="section-description">
                            {t("servicesDescription") || "Активируйте и управляйте различными сервисами для расширения функционала вашего агента."}
                        </div>
                        <div style={{marginBottom: 16}}>
                            <AddServiceButton
                                availableServices={availableServices}
                                onServiceSelect={handleServiceSelect}
                            />
                        </div>
                        <Typography.Title level={3} style={{ marginTop: 24 }}>
                            {t("servicesConfigured") || "Настроенные сервисы"}
                        </Typography.Title>
                        <Typography.Text type="secondary">
                            {t("servicesTotalSystems") || "Всего сервисов:"} 0
                        </Typography.Text>
                        <Empty
                            description={t("servicesNoSystems") || "Нет настроенных сервисов"}
                            style={{marginTop: '24px'}}
                        />
                    </>
                )}

                {isServiceAdded && (
                    <div>
                        <div className="section-title logs-header">
                            <FaPersonCirclePlus  />
                            {t("serviceTitle") || "Лидогенератор"}
                        </div>
                        <div className="section-description">
                            {t("serviceDescription") || "Сервис поиска лидов через мессенджеры с помощью AI агента."}
                        </div>

                        <LeadHunterService onServiceDeleted={handleServiceDeleted}/>
                    </div>
                )}

                {isVoiceCallAdded && (
                    <div style={{ marginTop: 24, position: "relative" }}>
                        <Popconfirm
                            title={t("serviceDelete") || "Удалить сервис?"}
                            description={t("serviceDeleteConfirmText") || "Вы уверены, что хотите удалить сервис?"}
                            okText={t("yes") || "Да"}
                            cancelText={t("cancel") || "Отмена"}
                            onConfirm={() => deleteService("voice-call")}
                        >
                            <div
                                title={t("serviceDelete") || "Удалить сервис"}
                                style={{ position: "absolute", top: 0, right: 0, cursor: "pointer", fontSize: 20, color: "#ff4d4f", zIndex: 10, padding: 8, borderRadius: 4, transition: "all 0.3s" }}
                                onMouseEnter={(event) => { event.currentTarget.style.backgroundColor = "#fff1f0"; event.currentTarget.style.transform = "scale(1.1)"; }}
                                onMouseLeave={(event) => { event.currentTarget.style.backgroundColor = "transparent"; event.currentTarget.style.transform = "scale(1)"; }}
                            >
                                <DeleteOutlined />
                            </div>
                        </Popconfirm>
                        <VoiceCallService />
                    </div>
                )}
            </div>
        </>
    );
}
