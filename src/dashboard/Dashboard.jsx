import React, {useState, useEffect, useCallback} from "react";
import {Layout, Menu, Progress, Card, Typography, Avatar, Flex, Divider, Tooltip} from "antd";
import {
    AndroidOutlined,
    NotificationOutlined,
    SubnodeOutlined,
    DollarOutlined,
    UserOutlined,
    WalletOutlined,
    CommentOutlined, DatabaseOutlined
} from "@ant-design/icons";
import {useNavigate, useLocation} from "react-router-dom";
import {goToLanding} from "../utils/goToLanding";
import {getUserDetails} from "./getUserDetails";
import {dashboardContent} from "./dashboardContent";
import {useTranslation} from "react-i18next";
import {showWarningNotification} from "./hotification/showNotification";
import {FaDev, FaHouseUser, FaTelegramPlane, FaWhatsapp, FaInstagram} from "react-icons/fa";
import {GoLog} from "react-icons/go";
import {GiConversation} from "react-icons/gi";
import {DashboardHeader} from "./DashboardHeader";
import {getOrSetUserId} from "../utils/getOrSetUserId";
import {GrServices} from "react-icons/gr";
import {useInstantNotifications} from "../hooks/useInstantNotifications";
import {SiCivicrm} from "react-icons/si";
import AvitoIcon from "./steps/Channals/AvitoIcon";
import showSimpleAuth from "../utils/showSimpleAuth";

const {Sider, Content} = Layout;
const {Text} = Typography;

export function Dashboard({handleError}) {
    const [userId] = useState(getOrSetUserId()); // Получаем userId должен быть сохранён в localStorage
    const [siderCollapsed, setSiderCollapsed] = useState(false);

    // Подключаем WebSocket для получения мгновенных уведомлений
    useInstantNotifications();

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

    const {t} = useTranslation();
    const location = useLocation();
    const queryWarnings = new URLSearchParams(location.search);
    const [userData, setUserData] = useState(null);
    const [selectedMenu, setSelectedMenu] = useState("start");

    // Показываем предупреждение о 2FA и MasterKey если пришли с соответствующими флагами
    useEffect(() => {
        if (location.state?.warn2FA || queryWarnings.get('warn2FA') === '1') {
            showWarningNotification(
                t('AuthForm-TotpWarningTitle') || '⚠️ Защитите аккаунт',
                <span>
                    {t('AuthForm-TotpWarningDesc') || 'Двухфакторная аутентификация не включена. '}
                    {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                    <a onClick={() => setSelectedMenu('user')} style={{cursor: 'pointer'}}>
                        {t('AuthForm-TotpWarningLink') || 'Включить 2FA'}
                    </a>
                </span>
            );
        }
        if (location.state?.warnMasterKey || queryWarnings.get('warnMasterKey') === '1') {
            showWarningNotification(
                t('AuthForm-MasterKeyWarningTitle') || '🔑 Ключ шифрования не создан',
                <span>
                    {t('AuthForm-MasterKeyWarningDesc') || 'Ключ шифрования данных не настроен. '}
                    {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                    <a onClick={() => setSelectedMenu('user')} style={{cursor: 'pointer'}}>
                        {t('AuthForm-MasterKeyWarningLink') || 'Создать ключ'}
                    </a>
                </span>
            );
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Формируем menuItems с учётом роли пользователя
    // const userServiceItem = {key: "services", icon: <GrServices />, label: t('menuServices') || "Сервисы"};

    const baseMenuItems = [
        {key: "models", icon: <AndroidOutlined/>, label: t('menuAgent') || "Модель"},
        {key: "modules", icon: <SubnodeOutlined/>, label: t('menuChannels') || "Каналы"},
        {key: "notifications", icon: <NotificationOutlined/>, label: t('menuNotifications') || "Уведомления"},
        {key: "crm", icon: <SiCivicrm/>, label: t('menuCRM') || "CRM"},
        {key: "services", icon: <GrServices/>, label: t('menuServices') || "Сервисы"},
        {key: "stat", icon: <GiConversation/>, label: t('menuDialogs') || "Диалоги"},
        {key: "logs", icon: <GoLog/>, label: t('menuLogs') || "Логи"},
        // Добавляем пункт "Платежи" только если showSimpleAuth === false
        ...(!showSimpleAuth ? [{key: "bill", icon: <DollarOutlined/>, label: t('menuBilling') || "Платежи"}] : []),
    ];
    // const baseMenuItems = [
    //     // Скрываем "Агент" для роли Service
    //     ...(userData?.RoleName !== "Service"
    //         ? [{key: "models", icon: <AndroidOutlined/>, label: t('menuAgent') || "Модель"}]
    //         : []),
    //     // Скрываем "Каналы" для роли Service
    //     ...(userData?.RoleName !== "Service"
    //         ? [{key: "modules", icon: <SubnodeOutlined/>, label: t('menuChannels') || "Каналы"}]
    //         : []),
    //     // // Скрываем "CRM" для роли Service
    //     // ...(userData?.RoleName !== "Service"
    //     //     ? [{key: "crm", icon: <SiCivicrm />, label: "CRM"}]
    //     //     : []),
    //     {key: "crm", icon: <SiCivicrm />, label: t('menuCRM') || "CRM"},
    //     // Добавляем "Сервисы" только для Developer и Service
    //     ...(!showSimpleAuth && userData && (userData.RoleName === "Developer" || userData.RoleName === "Service")
    //         ? [userServiceItem]
    //         : []),
    //     {key: "notifications", icon: <NotificationOutlined/>, label: t('menuNotifications') || "Уведомления"},
    //     // Скрываем "Диалоги" для роли Service
    //     ...(userData?.RoleName !== "Service"
    //         ? [{key: "stat", icon: <GiConversation/>, label: t('menuDialogs') || "Диалоги"}]
    //         : []),
    //     {key: "logs", icon: <GoLog/>, label: t('menuLogs') || "Логи"},
    //     ...([{key: "bill", icon: <DollarOutlined/>, label: t('menuBilling') || "Платежи"}]),
    // ];


    // const devMenuItem = {key: "dev", icon: <FaDev/>, label: t('menuDevTools') || "Dev Tools"};
    const devMenuItem = {key: "dev", icon: <FaDev/>, label: "Dev Tools"};
    const userMenuItem = {key: "user", icon: <FaHouseUser/>, label: t('menuUserProfile') || "О пользователе"};

    const menuItems = userData && !showSimpleAuth && (userData.RoleName === "Demo" || userData.RoleName === "User" || userData.RoleName === "Service")
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
            const data = await getUserDetails();

            if (data.status === "error") {
                handleError();
                // Сессия невалидна — выбрасываем на лендинг. Он в App Router,
                // поэтому нужна полная загрузка, а не navigate() из react-router.
                goToLanding();
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

        // TODO возмоно сделаю через SSE
        // Автоматическое обновление данных пользователя каждую минуту
        // const intervalId = setInterval(() => {
        //     fetchData();
        // }, 30000); // 60000 мс = 1 минута

        // Очистка интервала при размонтировании компонента
        // return () => clearInterval(intervalId);
    }, [refreshUserData]);

    // Передаем функцию refreshUserData в dashboardContent
    const renderDashboardContent = () => {
        return dashboardContent(selectedMenu, refreshUserData, userData?.RoleName, setSelectedMenu);
    };

    // Функция для получения цвета роли
    const getRoleColor = (role) => {
        switch (role) {
            case 'Developer':
                return '#B57BFF';
            case 'Demo':
                return '#FF7A7A';
            case 'Service':
                return '#FBBF24';
            case 'User':
                return '#60A5FA';
            default:
                return '#FFFFFF';
        }
    };

    const channelItems = [
        {key: 'Telegram_bot', label: 'Telegram Bot', icon: <FaTelegramPlane style={{fontSize: 13, color: '#fff'}}/>, background: 'linear-gradient(135deg, #3B82F6, #2563EB)', borderColor: 'rgba(37, 99, 235, 0.5)', boxShadow: '0 3px 8px rgba(37, 99, 235, 0.3)'},
        {key: 'Telegram_user', label: 'Telegram', icon: <FaTelegramPlane style={{fontSize: 13, color: '#fff'}}/>, background: 'linear-gradient(135deg, #0EA5E9, #0284C7)', borderColor: 'rgba(2, 132, 199, 0.5)', boxShadow: '0 3px 8px rgba(2, 132, 199, 0.3)'},
        {key: 'WhatsApp', label: 'WhatsApp', icon: <FaWhatsapp style={{fontSize: 13, color: '#fff'}}/>, background: 'linear-gradient(135deg, #10B981, #059669)', borderColor: 'rgba(5, 150, 105, 0.5)', boxShadow: '0 3px 8px rgba(5, 150, 105, 0.3)'},
        {key: 'Widget', label: 'Виджет', icon: <CommentOutlined style={{fontSize: 13, color: '#fff'}}/>, background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', borderColor: 'rgba(124, 58, 237, 0.5)', boxShadow: '0 3px 8px rgba(124, 58, 237, 0.3)'},
        {key: 'Instagram', label: 'Instagram', icon: <FaInstagram style={{fontSize: 13, color: '#fff'}}/>, background: 'linear-gradient(135deg, #EC4899, #DB2777)', borderColor: 'rgba(219, 39, 119, 0.5)', boxShadow: '0 3px 8px rgba(219, 39, 119, 0.3)'},
        {key: 'Avito', label: 'Avito', icon: <AvitoIcon size={15} style={{color: '#fff'}}/>, background: 'linear-gradient(135deg, #3B82F6, #2563EB)', borderColor: 'rgba(37, 99, 235, 0.5)', boxShadow: '0 3px 8px rgba(37, 99, 235, 0.3)'}
    ];

    const activeChannels = userData ? channelItems.filter((ch) => userData[ch.key] === 1) : [];

    const hasSubscription = !!userData?.EndDate;
    const subscriptionTitle = hasSubscription
        ? `${t('dashboardSubscription')}: ${userData.EndDate}`
        : `${t('dashboardSubscription')}: ${t('dashboardAbsent')}`;

    const subscriptionColor = (() => {
        if (!hasSubscription) return '#9CA3AF';
        const end = new Date(`${userData.EndDate}T00:00:00`);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const daysLeft = Math.ceil((end.getTime() - today.getTime()) / 86400000);
        if (daysLeft < 0) return '#EF4444';
        if (daysLeft < 7) return '#FBBF24';
        return '#34D399';
    })();

    return (
        <>
            <DashboardHeader setSiderCollapsed={setSiderCollapsed} siderCollapsed={siderCollapsed}/>

            <Layout style={{minHeight: "100vh"}}>
                <Sider collapsed={siderCollapsed}>
                    {userData && userData.status === "ok" && (
                        <div className="user-data-modern">
                            {/* Единая компактная карточка пользователя */}
                            <Card
                                className="unified-user-card"
                                size="small"
                                styles={{body: {padding: '12px'}}}
                            >
                                <Flex vertical gap={12}>
                                    {/* Профиль + статус подписки */}
                                    <Flex align="center" gap={10}>
                                        {!showSimpleAuth ? (
                                            <Tooltip placement="right" title={subscriptionTitle}>
                                                <span className="avatar-wrap">
                                                    <Avatar
                                                        size={40}
                                                        icon={<UserOutlined style={{fontSize: 20, color: '#fff'}}/>}
                                                        style={{
                                                            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.15))',
                                                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
                                                        }}
                                                    />
                                                    <span className="avatar-status-dot" style={{
                                                        background: subscriptionColor
                                                    }}/>
                                                </span>
                                            </Tooltip>
                                        ) : (
                                            <Avatar
                                                size={40}
                                                icon={<UserOutlined style={{fontSize: 20, color: '#fff'}}/>}
                                                style={{
                                                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.15))',
                                                    flexShrink: 0,
                                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
                                                }}
                                            />
                                        )}
                                        <Flex vertical gap={3} style={{flex: 1, minWidth: 0, overflow: 'hidden'}}>
                                            <Text strong ellipsis style={{fontSize: 13, lineHeight: 1.3, color: '#fff'}}>
                                                {userData.Name}
                                            </Text>
                                            <Flex align="center" gap={5} style={{minWidth: 0, overflow: 'hidden'}}>
                                                <span style={{
                                                    width: 6,
                                                    height: 6,
                                                    borderRadius: '50%',
                                                    background: getRoleColor(userData.RoleName),
                                                    boxShadow: `0 0 6px ${getRoleColor(userData.RoleName)}`,
                                                    flexShrink: 0
                                                }}/>
                                                <Text ellipsis style={{fontSize: 11, lineHeight: 1.2, color: 'rgba(255, 255, 255, 0.82)'}}>
                                                    {t(userData.RoleName.toLowerCase())}
                                                </Text>
                                            </Flex>
                                        </Flex>
                                    </Flex>

                                    {/* Баланс */}
                                    {/*{!showSimpleAuth && userData.Balance !== null && userData.Balance !== undefined && (*/}
                                    {/*    <div style={{*/}
                                    {/*        display: 'flex',*/}
                                    {/*        alignItems: 'center',*/}
                                    {/*        gap: 4,*/}
                                    {/*        padding: '6px 10px',*/}
                                    {/*        background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.5))',*/}
                                    {/*        borderRadius: '8px',*/}
                                    {/*        border: '1px solid rgba(16, 185, 129, 0.7)'*/}
                                    {/*    }}>*/}
                                    {/*        <WalletOutlined style={{fontSize: 16, color: '#34D399'}}/>*/}
                                    {/*        <Text style={{*/}
                                    {/*            fontSize: 11,*/}
                                    {/*            color: 'rgba(255, 255, 255, 0.9)',*/}
                                    {/*            fontWeight: 500*/}
                                    {/*        }}>{t('dashboardBalance') || "Баланс"}:</Text>*/}
                                    {/*        <Text strong style={{*/}
                                    {/*            fontSize: 13,*/}
                                    {/*            marginLeft: 'auto',*/}
                                    {/*            color: '#fff',*/}
                                    {/*            fontWeight: 700*/}
                                    {/*        }}>*/}
                                    {/*            {userData.Balance} {userData.CurrencyName}*/}
                                    {/*        </Text>*/}
                                    {/*    </div>*/}
                                    {/*)}*/}

                                    {/* Хранилище */}
                                    {!showSimpleAuth && (() => {
                                        const toMB = (bytes) => (bytes || 0) / (1024 * 1024);
                                        const fmtMB = (mb) => mb >= 1024 ? `${(mb / 1024).toFixed(1)} Gb` : `${Math.round(mb)} Mb`;
                                        const usedMB = toMB(userData.StorageUsed);
                                        const limitMB = toMB(userData.StorageLimit);
                                        const percent = limitMB ? Math.min(100, Math.round((usedMB / limitMB) * 100)) : 0;
                                        const isCritical = percent >= 90;

                                        return (
                                            <>
                                                <Divider style={{margin: 0, borderColor: 'rgba(255, 255, 255, 0.14)'}}/>
                                                <Flex vertical gap={6} style={{width: '100%'}}>
                                                    <Flex align="center" justify="space-between" style={{width: '100%'}}>
                                                        <Flex align="center" gap={6}>
                                                            <span className="user-hint-icon" style={{background: 'rgba(245, 158, 11, 0.22)'}}>
                                                                <DatabaseOutlined style={{fontSize: 13, color: '#FCD34D'}}/>
                                                            </span>
                                                            <Text style={{fontSize: 11, color: 'rgba(255, 255, 255, 0.75)'}}>
                                                                {t('userStorage')}
                                                            </Text>
                                                        </Flex>
                                                        <Text strong style={{fontSize: 11, color: isCritical ? '#FCA5A5' : '#FDE68A'}}>
                                                            {percent}%
                                                        </Text>
                                                    </Flex>

                                                    <Progress
                                                        percent={percent}
                                                        size="small"
                                                        showInfo={false}
                                                        strokeColor={isCritical ? '#F87171' : '#FBBF24'}
                                                        railColor="rgba(255, 255, 255, 0.2)"
                                                        style={{width: '100%'}}
                                                    />
                                                    <Flex align="center" justify="space-between" style={{width: '100%'}}>
                                                        <Text style={{fontSize: 10, color: 'rgba(255, 255, 255, 0.55)'}}>
                                                            {fmtMB(usedMB)}
                                                        </Text>
                                                        <Text style={{fontSize: 10, color: 'rgba(255, 255, 255, 0.55)'}}>
                                                            {fmtMB(limitMB)}
                                                        </Text>
                                                    </Flex>
                                                </Flex>
                                            </>
                                        );
                                    })()}

                                    {/* Каналы */}
                                    {activeChannels.length > 0 && (
                                        <>
                                            <Divider style={{margin: 0, borderColor: 'rgba(255, 255, 255, 0.14)'}}/>
                                            <Flex align="center" justify="center" gap={4} wrap>
                                                {activeChannels.map((ch) => (
                                                    <Tooltip key={ch.key} title={ch.label} placement="bottom">
                                                        <span className="dashboard-channel-icon" style={{
                                                            background: ch.background,
                                                            borderColor: ch.borderColor,
                                                            boxShadow: ch.boxShadow
                                                        }}>
                                                            {ch.icon}
                                                        </span>
                                                    </Tooltip>
                                                ))}
                                            </Flex>
                                        </>
                                    )}
                                </Flex>
                            </Card>
                        </div>
                    )}


                    <Menu
                        mode="inline"
                        items={menuItems}
                        onClick={onMenuClick}
                        selectedKeys={[selectedMenu]}
                        inlineCollapsed={siderCollapsed}
                    />

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



