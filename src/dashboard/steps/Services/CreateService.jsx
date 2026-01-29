import {GrServices} from "react-icons/gr";
import React, {useState} from "react";
import {Button, Dropdown, Typography, Empty} from 'antd';
import {PlusOutlined, DownOutlined} from '@ant-design/icons';
import {useTranslation} from 'react-i18next';
import {validateAndRefreshToken} from "../../../utils/easyUtils";
import {showNotification, showErrorNotification} from "../../hotification/showNotification";
import {AvailableServicesList, AddService as AddServiceAPI} from "./serviceUtils";
import {checkServiceAvailable} from "./LeadHunter/leadUtils.js";
import {LeadHunterService} from "./addLeadHunter";
import {useEffect} from "react";
import {FaPersonCirclePlus } from "react-icons/fa6";

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
    // Доступные сервисы для добавления
    const [availableServices, setAvailableServices] = useState([
        {
            key: "leadhunter",
            label: t("leadHunterService") || "Лидогенератор",
            // icon: <GrServices/>,
            icon: <FaPersonCirclePlus  />,
        }
        // ,
        // {
        //     key: "test",
        //     label: "Test Service",
        //     icon: <GrServices/>,
        // }
    ]);

    // Проверка доступных сервисов при монтировании компонента
    useEffect(() => {
        const checkAvailableServices = async () => {
            try {
                const token = localStorage.getItem("authToken");
                const response = await AvailableServicesList(token);

                // Получаем массив сервисов из ответа
                const services = response.services || response;

                // Если lead-haunter доступен, автоматически добавляем его
                if (Array.isArray(services) && services.includes('lead-haunter')) {
                    // Проверяем доступность сервиса перед добавлением
                    const isAvailable = await checkServiceAvailable(token);
                    if (isAvailable) {
                        await AddServiceAPI(token, "lead-haunter");
                        setIsServiceAdded(true);
                        // Удаляем только leadhunter из списка доступных
                        setAvailableServices(prev => prev.filter(s => s.key !== 'leadhunter'));
                    }
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
    const handleServiceDeleted = () => {
        setIsServiceAdded(false);
        // Возвращаем leadhunter в список доступных сервисов
        setAvailableServices([
            {
                key: "leadhunter",
                label: t("leadHunterService") || "Лидогенератор",
                icon: <FaPersonCirclePlus />,
            }
            // ,
            // {
            //     key: "test",
            //     label: t("leadHunterService") || "test",
            //     icon: <GrServices />,
            // }
        ]);
    };

    // Обработчик выбора сервиса из списка
    const handleServiceSelect = async (key) => {
        if (key === "leadhunter") {
            try {
                const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
                if (!token) {
                    showErrorNotification(
                        t("notifVerificationError") || 'Ошибка',
                        t("authError") || 'Ошибка аутентификации'
                    );
                    return;
                }
                const isAvailable = await checkServiceAvailable(token);
                if (!isAvailable) {
                    showErrorNotification(
                        t("notifVerificationError") || 'Ошибка',
                        t("leadHunterUnavailable") || 'Сервис Lead Hunter недоступен'
                    );
                    return;
                }
                await AddServiceAPI(token, "lead-haunter");
                setIsServiceAdded(true);
                setAvailableServices(prev => prev.filter(s => s.key !== 'leadhunter')); // Удаляем только leadhunter из доступных
                showNotification(
                    t("success") || 'Успешно',
                    t("serviceAdded") || 'Сервис успешно добавлен'
                );
            } catch (error) {
                showErrorNotification(
                    t("error") || 'Ошибка',
                    t("serviceCheckError") || 'Ошибка при проверке сервиса'
                );
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
            </div>
        </>
    );
}