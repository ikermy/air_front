import React, {useState, useEffect, useCallback} from "react";
import {Layout, Menu, Progress, Card, Typography, Space, Tag} from "antd";
import {
    AndroidOutlined,
    NotificationOutlined,
    SubnodeOutlined,
    DollarOutlined,
    UserOutlined,
    WalletOutlined,
    CalendarOutlined,
    CrownOutlined,
    CommentOutlined, DatabaseOutlined
} from "@ant-design/icons";
import "./dash.css";
import {useNavigate, useLocation} from "react-router-dom";
import {getUserDetails} from "./getUserDetails";
import {dashboardContent} from "./dashboardContent";
import {useTranslation} from "react-i18next";
import {showWarningNotification} from "./hotification/showNotification";
import {FaDev, FaHouseUser, FaTelegramPlane, FaWhatsapp, FaInstagram} from "react-icons/fa";
import {GoLog} from "react-icons/go";
import {GiConversation} from "react-icons/gi";
import {DashboardHeader} from "./DashboardHeader";
import {PiUserCircleDashedThin} from "react-icons/pi";
import {trackVisitor} from "../utils/tracking";
import {getOrSetUserId} from "../utils/getOrSetUserId";
import {GrServices} from "react-icons/gr";
import {useInstantNotifications} from "../hooks/useInstantNotifications";
import {SiCivicrm} from "react-icons/si";
import AvitoIcon from "./steps/Channals/AvitoIcon";

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

    useEffect(() => {
        // При заходе на dashboard
        trackVisitor(userId, {minIntervalMs: 60000, event: 'main'});
    }, [userId]);

    const {t} = useTranslation();
    const location = useLocation();
    const [userData, setUserData] = useState(null);
    const [selectedMenu, setSelectedMenu] = useState("start");

    // Показываем предупреждение о 2FA и MasterKey если пришли с соответствующими флагами
    useEffect(() => {
        if (location.state?.warn2FA) {
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
        if (location.state?.warnMasterKey) {
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
    const showSimpleAuth = false;

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

        // TODO возмоно сделаю через SSE
        // Автоматическое обновление данных пользователя каждую минуту
        const intervalId = setInterval(() => {
            fetchData();
        }, 30000); // 60000 мс = 1 минута

        // Очистка интервала при размонтировании компонента
        return () => clearInterval(intervalId);
    }, [refreshUserData]);

    // Передаем функцию refreshUserData в dashboardContent
    const renderDashboardContent = () => {
        return dashboardContent(selectedMenu, refreshUserData, userData?.RoleName, setSelectedMenu);
    };

    // Функция для получения цвета роли
    const getRoleColor = (role) => {
        switch (role) {
            case 'Developer':
                return 'purple';
            case 'Demo':
                return 'red';
            case 'Service':
                return 'gold';
            case 'User':
                return 'blue';
            default:
                return 'white';
        }
    };

    // Функция для получения иконки роли
    const getRoleIcon = (role) => {
        switch (role) {
            case 'Developer':
                return <FaDev/>;
            case 'Demo':
                return <PiUserCircleDashedThin/>;
            case 'Service':
                return <CrownOutlined/>;
            default:
                return <UserOutlined/>;
        }
    };

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
                                <Space direction="vertical" size={6} style={{width: '100%'}}>
                                    {/* Профиль */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        padding: '6px',
                                        background: 'rgba(255, 255, 255, 0.15)',
                                        borderRadius: '8px',
                                        backdropFilter: 'blur(10px)',
                                        border: '1px solid rgba(255, 255, 255, 0.25)'
                                    }}>
                                        <div style={{
                                            width: 36,
                                            height: 36,
                                            borderRadius: '50%',
                                            background: 'rgba(255, 255, 255, 0.25)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <UserOutlined style={{fontSize: 20, color: '#fff'}}/>
                                        </div>
                                        <div style={{flex: 1, minWidth: 0}}>
                                            <Text strong style={{
                                                fontSize: 13,
                                                display: 'block',
                                                lineHeight: 1.3,
                                                color: '#fff'
                                            }}>
                                                {userData.Name}
                                            </Text>
                                            <Tag
                                                size="small"
                                                color={getRoleColor(userData.RoleName)}
                                                icon={getRoleIcon(userData.RoleName)}
                                                style={{margin: '3px 0 0 0', fontSize: 10}}
                                            >
                                                {t(userData.RoleName.toLowerCase())}
                                            </Tag>
                                        </div>
                                    </div>

                                    {/* Баланс */}
                                    {!showSimpleAuth && userData.Balance !== null && userData.Balance !== undefined && (
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            padding: '6px 10px',
                                            background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.5))',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(16, 185, 129, 0.7)'
                                        }}>
                                            <WalletOutlined style={{fontSize: 16, color: '#34D399'}}/>
                                            <Text style={{
                                                fontSize: 11,
                                                color: 'rgba(255, 255, 255, 0.9)',
                                                fontWeight: 500
                                            }}>{t('dashboardBalance') || "Баланс"}:</Text>
                                            <Text strong style={{
                                                fontSize: 13,
                                                marginLeft: 'auto',
                                                color: '#fff',
                                                fontWeight: 700
                                            }}>
                                                {userData.Balance} {userData.CurrencyName}
                                            </Text>
                                        </div>
                                    )}

                                    {/* Подписка */}
                                    {!showSimpleAuth && (
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            padding: '6px 10px',
                                            background: userData.EndDate
                                                ? 'linear-gradient(90deg, rgba(59, 130, 246, 0.7), rgba(37, 99, 235, 0.5))'
                                                : 'linear-gradient(90deg, rgba(107, 114, 128, 0.7), rgba(75, 85, 99, 0.5))',
                                            borderRadius: '8px',
                                            border: userData.EndDate
                                                ? '1px solid rgba(59, 130, 246, 1)'
                                                : '1px solid rgba(107, 114, 128, 1)'
                                        }}>
                                            <CalendarOutlined style={{
                                                fontSize: 16,
                                                color: userData.EndDate ? '#60A5FA' : '#9CA3AF'
                                            }}/>
                                            <Text style={{
                                                fontSize: 11,
                                                color: 'rgba(255, 255, 255, 0.9)',
                                                fontWeight: 500
                                            }}>
                                                {userData.EndDate ? (t('dashboardUntil') || "До") : (t('dashboardSubscription') || "Подписка")}
                                            </Text>
                                            <Text strong style={{
                                                fontSize: 12,
                                                marginLeft: 'auto',
                                                color: '#fff',
                                                fontWeight: 700
                                            }}>
                                                {userData.EndDate || (t('dashboardAbsent') || "отсутствует")}
                                            </Text>
                                        </div>
                                    )}

                                    {/* Сообщения */}
                                    {!showSimpleAuth && (
                                        <div style={{
                                            padding: '6px 8px',
                                            background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.18), rgba(217, 119, 6, 0.5))',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(245, 158, 11, 0.7)'
                                        }}>
                                            <div style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 4,
                                                marginBottom: 6
                                            }}>
                                                <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                                                    <DatabaseOutlined style={{fontSize: 14, color: '#FCD34D'}}/>
                                                    <Text strong
                                                          style={{fontSize: 12, color: '#fff', marginLeft: 'auto'}}>
                                                        {userData.StorageUsed || 0}/{userData.StorageLimit || 0}
                                                    </Text>
                                                </div>

                                                <Progress
                                                    percent={userData.StorageLimit ? Math.round((userData.StorageUsed / userData.StorageLimit) * 100) : 0}
                                                    size="small"
                                                    showInfo={false}
                                                    strokeColor={{
                                                        '0%': '#34D399',
                                                        '75%': '#FBBF24',
                                                        '90%': '#F87171'
                                                    }}
                                                    trailColor="rgba(255, 255, 255, 0.2)"
                                                    style={{width: '100%'}}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Каналы */}
                                    {(userData.Telegram_bot === 1 || userData.Telegram_user === 1 || userData.WhatsApp === 1 || userData.Widget === 1 || userData.Instagram === 1) && (
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-around',
                                            marginTop: 4,
                                            gap: 2,
                                            flexWrap: 'wrap'
                                        }}>
                                            {/* Telegram Bot */}
                                            {userData.Telegram_bot === 1 && (
                                                <div style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center'
                                                }}>
                                                    <div style={{
                                                        width: 28,
                                                        height: 28,
                                                        borderRadius: '6px',
                                                        background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        border: '2px solid rgba(37, 99, 235, 0.5)',
                                                        boxShadow: '0 3px 8px rgba(37, 99, 235, 0.3)',
                                                        transition: 'all 0.3s ease'
                                                    }}>
                                                        <FaTelegramPlane style={{
                                                            fontSize: 14,
                                                            color: '#fff'
                                                        }}/>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Telegram User */}
                                            {userData.Telegram_user === 1 && (
                                                <div style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center'
                                                }}>
                                                    <div style={{
                                                        width: 28,
                                                        height: 28,
                                                        borderRadius: '6px',
                                                        background: 'linear-gradient(135deg, #0EA5E9, #0284C7)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        border: '2px solid rgba(2, 132, 199, 0.5)',
                                                        boxShadow: '0 3px 8px rgba(2, 132, 199, 0.3)',
                                                        transition: 'all 0.3s ease'
                                                    }}>
                                                        <FaTelegramPlane style={{
                                                            fontSize: 14,
                                                            color: '#fff'
                                                        }}/>
                                                    </div>
                                                </div>
                                            )}

                                            {/* WhatsApp */}
                                            {userData.WhatsApp === 1 && (
                                                <div style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center'
                                                }}>
                                                    <div style={{
                                                        width: 28,
                                                        height: 28,
                                                        borderRadius: '6px',
                                                        background: 'linear-gradient(135deg, #10B981, #059669)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        border: '2px solid rgba(5, 150, 105, 0.5)',
                                                        boxShadow: '0 3px 8px rgba(5, 150, 105, 0.3)',
                                                        transition: 'all 0.3s ease'
                                                    }}>
                                                        <FaWhatsapp style={{
                                                            fontSize: 14,
                                                            color: '#fff'
                                                        }}/>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Widget */}
                                            {userData.Widget === 1 && (
                                                <div style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center'
                                                }}>
                                                    <div style={{
                                                        width: 28,
                                                        height: 28,
                                                        borderRadius: '6px',
                                                        background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        border: '2px solid rgba(124, 58, 237, 0.5)',
                                                        boxShadow: '0 3px 8px rgba(124, 58, 237, 0.3)',
                                                        transition: 'all 0.3s ease'
                                                    }}>
                                                        <CommentOutlined style={{
                                                            fontSize: 14,
                                                            color: '#fff'
                                                        }}/>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Instagram */}
                                            {userData.Instagram === 1 && (
                                                <div style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center'
                                                }}>
                                                    <div style={{
                                                        width: 28,
                                                        height: 28,
                                                        borderRadius: '6px',
                                                        background: 'linear-gradient(135deg, #EC4899, #DB2777)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        border: '2px solid rgba(219, 39, 119, 0.5)',
                                                        boxShadow: '0 3px 8px rgba(219, 39, 119, 0.3)',
                                                        transition: 'all 0.3s ease'
                                                    }}>
                                                        <FaInstagram style={{
                                                            fontSize: 14,
                                                            color: '#fff'
                                                        }}/>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Avito */}
                                            {userData.Avito === 1 && (
                                                <div style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center'
                                                }}>
                                                    <div style={{
                                                        width: 28,
                                                        height: 28,
                                                        borderRadius: '6px',
                                                        background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        border: '2px solid rgba(37, 99, 235, 0.5)',
                                                        boxShadow: '0 3px 8px rgba(37, 99, 235, 0.3)',
                                                        transition: 'all 0.3s ease'
                                                    }}>
                                                        <AvitoIcon style={{
                                                            fontSize: 14,
                                                            color: '#fff'
                                                        }}
                                                                   size={15}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </Space>
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



