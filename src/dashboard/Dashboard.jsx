import React, {useState, useEffect, useCallback} from "react";
import {Layout, Menu, Progress, Card, Typography, Space, Tag, Divider} from "antd";
import {
    AndroidOutlined,
    NotificationOutlined,
    SubnodeOutlined,
    DollarOutlined,
    UserOutlined,
    WalletOutlined,
    CalendarOutlined,
    MessageOutlined,
    CrownOutlined
} from "@ant-design/icons";
import "./dash.css";
import {useNavigate} from "react-router-dom";
import {getUserDetails} from "./getUserDetails";
import {dashboardContent} from "./dashboardContent";
import {validateAndRefreshToken} from "../utils/easyUtils";
import {useTranslation} from "react-i18next";
import {FaDev, FaHouseUser} from "react-icons/fa";
import {GoLog} from "react-icons/go";
import {GiConversation} from "react-icons/gi";
import {DashboardHeader} from "./DashboardHeader";
import {PiUserCircleDashedThin} from "react-icons/pi";
import {trackVisitor} from "../utils/tracking";
import {getOrSetUserId} from "../utils/getOrSetUserId";
import {GrServices} from "react-icons/gr";
import {useInstantNotifications} from "../hooks/useInstantNotifications";
import {SiCivicrm} from "react-icons/si";

const { Sider, Content} = Layout;
const { Text } = Typography;

export function Dashboard({handleError}) {
    const [userId] = useState(getOrSetUserId()); // Получаем userId должен быть сохранён в localStorage
    const [siderCollapsed, setSiderCollapsed] = useState(false);

    // Подключаем WebSocket для получения мгновенных уведомлений
    useInstantNotifications(localStorage.getItem("authToken"));

    // Обработчик изменения размера экрана
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 768;
            if (mobile) {
                setSiderCollapsed(true); // Скрываем меню по умолчанию на мобильных
            } else {
                setSiderCollapsed(false); // Показываем меню на десктопе
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Вызываем сразу при монтировании

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        // При заходе на dashboard
        trackVisitor(userId, { minIntervalMs: 60000, event: 'main' });
    }, [userId]);

    const {t} = useTranslation();
    const [userData, setUserData] = useState(null);
    const [selectedMenu, setSelectedMenu] = useState("start");
    const showSimpleAuth = process.env.REACT_APP_SHOW_SIMPLE_AUTH === "true";

    // Формируем menuItems с учётом роли пользователя
    const userServiceItem = {key: "services", icon: <GrServices />, label: "Сервисы"};

    // const baseMenuItems = [
    //     {key: "models", icon: <AndroidOutlined/>, label: "Ассистент"},
    //     {key: "modules", icon: <SubnodeOutlined/>, label: "Каналы"},
    //     // Добавлю пункт "Сервисы" только для определённых ролей
    //     ...(!showSimpleAuth && userData && (userData.RoleName === "Developer" || userData.RoleName === "Service")
    //         ? [userServiceItem]
    //         : []),
    //     {key: "notifications", icon: <NotificationOutlined/>, label: "Уведомления"},
    //     {key: "stat", icon: <GiConversation/>, label: "Диалоги"},
    //     {key: "logs", icon: <GoLog/>, label: "Логи"},
    //     // Добавляем пункт "Платежи" только если showSimpleAuth === false
    //     ...(!showSimpleAuth ? [{key: "bill", icon: <DollarOutlined/>, label: "Платежи"}] : []),
    // ];
    const baseMenuItems = [
        // Скрываем "Ассистент" для роли Service
        ...(userData?.RoleName !== "Service"
            ? [{key: "models", icon: <AndroidOutlined/>, label: "Ассистент"}]
            : []),
        // Скрываем "Каналы" для роли Service
        ...(userData?.RoleName !== "Service"
            ? [{key: "modules", icon: <SubnodeOutlined/>, label: "Каналы"}]
            : []),
        // // Скрываем "CRM" для роли Service
        // ...(userData?.RoleName !== "Service"
        //     ? [{key: "crm", icon: <SiCivicrm />, label: "CRM"}]
        //     : []),
        {key: "crm", icon: <SiCivicrm />, label: "CRM"},
        // Добавляем "Сервисы" только для Developer и Service
        ...(!showSimpleAuth && userData && (userData.RoleName === "Developer" || userData.RoleName === "Service")
            ? [userServiceItem]
            : []),
        {key: "notifications", icon: <NotificationOutlined/>, label: "Уведомления"},
        // Скрываем "Диалоги" для роли Service
        ...(userData?.RoleName !== "Service"
            ? [{key: "stat", icon: <GiConversation/>, label: "Диалоги"}]
            : []),
        {key: "logs", icon: <GoLog/>, label: "Логи"},
        ...(!showSimpleAuth ? [{key: "bill", icon: <DollarOutlined/>, label: "Платежи"}] : []),
    ];


    const devMenuItem = {key: "dev", icon: <FaDev/>, label: "Dev Tools"};
    const userMenuItem = {key: "user", icon: <FaHouseUser />, label: "О пользователе"};

    const menuItems = userData && !showSimpleAuth &&(userData.RoleName === "Demo" || userData.RoleName === "User" || userData.RoleName === "Service")
        ? [userMenuItem, ...baseMenuItems]
        : userData && userData.RoleName === "Developer"
            ? [devMenuItem, ...baseMenuItems]
            : baseMenuItems;

    const onMenuClick = (item) => {
        setSelectedMenu(item.key);
    };

    const navigate = useNavigate();

    // Функция для обновления данных пользователя
    const refreshUserData = useCallback(async () => {
        try {
            const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
            const data = await getUserDetails(token);

            if (data.status === "error") {
                handleError();
                navigate("/");
            } else {
                setUserData(data);
            }
        } catch (error) {
            console.error("Ошибка при обновлении данных пользователя:", error);
            handleError();
        }
    }, [handleError, navigate]);

    useEffect(() => {
        const fetchData = async () => {
            await refreshUserData();
        };

        fetchData();
    }, [refreshUserData]);

    // Передаем функцию refreshUserData в dashboardContent
    const renderDashboardContent = () => {
        return dashboardContent(selectedMenu, refreshUserData, userData?.RoleName, setSelectedMenu);
    };

    // Функция для получения цвета роли
    const getRoleColor = (role) => {
        switch (role) {
            case 'Developer': return 'purple';
            case 'Demo': return 'red';
            case 'Service': return 'gold';
            case 'User': return 'blue';
            default: return 'white';
        }
    };

    // Функция для получения иконки роли
    const getRoleIcon = (role) => {
        switch (role) {
            case 'Developer': return <FaDev />;
            case 'Demo': return <PiUserCircleDashedThin />;
            case 'Service': return <CrownOutlined />;
            default: return <UserOutlined />;
        }
    };

    return (
        <>
            <DashboardHeader setSiderCollapsed={setSiderCollapsed} siderCollapsed={siderCollapsed} />


            <Layout style={{minHeight: "100vh"}}>
                <Sider collapsed={siderCollapsed}>
                    {!showSimpleAuth && userData && userData.status === "ok" && (
                        <div className="user-data-modern">
                            {/* Карточка профиля пользователя */}
                            <Card
                                className="user-profile-card"
                                size="small"
                            >
                                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                    <div className="user-header">
                                        <UserOutlined className="user-avatar-icon" />
                                        <div className="user-info">
                                            <Text strong className="user-name">{userData.Name}</Text>
                                            <Tag
                                                className="role-tag"
                                                color={getRoleColor(userData.RoleName)}
                                                icon={React.cloneElement(
                                                    getRoleIcon(userData.RoleName),
                                                    { style: { position: 'relative', top: 1, display: 'inline-block' } }
                                                )}
                                            >
                                                {t(userData.RoleName.toLowerCase())}
                                            </Tag>
                                        </div>
                                    </div>
                                </Space>
                            </Card>

                            {/* Карточка баланса */}
                            {userData.Balance !== null && userData.Balance !== undefined && (
                                <Card
                                    className="balance-card"
                                    size="small"
                                >
                                    <Space align="center" size="small">
                                        <WalletOutlined className="balance-icon" />
                                        <div className="balance-info">
                                            <Text type="secondary" className="balance-label">
                                                Баланс
                                            </Text>
                                            <Text strong className="balance-amount">
                                                {userData.Balance} {userData.CurrencyName}
                                            </Text>
                                        </div>
                                    </Space>
                                </Card>
                            )}

                            {/* Карточка подписки */}
                            {userData.EndDate && (
                                <Card
                                    className="subscription-card"
                                    size="small"
                                >
                                    <Space align="center" size="small">
                                        <CalendarOutlined className="subscription-icon" />
                                        <div className="subscription-info">
                                            <Text type="secondary" className="subscription-label">
                                                Подписка до
                                            </Text>
                                            <Text strong className="subscription-date">
                                                {userData.EndDate}
                                            </Text>
                                        </div>
                                    </Space>
                                </Card>
                            )}

                            {/* Карточка сообщений */}
                            {userData.MessageLimit && (
                                <Card
                                    className="messages-card"
                                    size="small"
                                >
                                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                        <div className="messages-header">
                                            <MessageOutlined className="messages-icon" />
                                            <Text strong className="messages-title">Сообщения</Text>
                                        </div>

                                        <Progress
                                            percent={Math.round((userData.MessagesUsed / userData.MessageLimit) * 100)}
                                            size="small"
                                            format={() => `${userData.MessagesUsed}/${userData.MessageLimit}`}
                                            strokeColor={{
                                                '0%': '#87d068',
                                                '75%': '#faad14',
                                                '90%': '#ff4d4f'
                                            }}
                                        />

                                        <Divider style={{ margin: '8px 0' }} />

                                        <div className="message-cost-info">
                                            <Text type="secondary" className="cost-label">
                                                Цена сверх лимита
                                            </Text>
                                            <Text strong className="cost-amount">
                                                {userData.MessageCost} {userData.CurrencyName}
                                            </Text>
                                        </div>
                                    </Space>
                                </Card>
                            )}
                        </div>
                    )}


                    <Menu mode="inline" items={menuItems} onClick={onMenuClick} inlineCollapsed={siderCollapsed}/>

                </Sider>

                <Layout>
                    <Content>
                        <div className="title">
                            {renderDashboardContent()}
                        </div>
                    </Content>
                </Layout>
            </Layout>
        </>
    );
}

export default Dashboard;