import React, {useCallback, useEffect, useState} from 'react';
import {createPortal} from 'react-dom';
import {useTheme} from '../ThemeContext';
import LanguageSwitcher from '../LanguageSwitcher';
import ThemeToggle from './ThemeToggle'; // Импортируем ThemeToggle
import {useTranslation} from "react-i18next";
import './TopMenu.css';
import {Avatar, Badge, message, Tooltip} from 'antd';
import {UserOutlined} from "@ant-design/icons";
import {AuthForm} from "../landing/auth/AuthForm";
import Modal from "../Modal";
import {RegForm} from "../landing/auth/RegForm";
import {
    handleDeny,
    handleDenyMail, handleDiasbled,
    handleError,
    handleFalure, handleNotConfirmed,
    handleSuccess
} from "../landing/auth/notificationHandlers";
import {RestoreMail} from "../landing/auth/RestoreMail";
import {useAuth} from "../AuthContext";
import {useNavigate} from "react-router-dom";
import {FaRegWindowMaximize} from "react-icons/fa";
import {useChatVisibility} from "../ChatVisibilityContext";


function TopMenu() {
    const {t} = useTranslation();
    const {theme} = useTheme();
    const [isModalOpen, setIsModalOpen] = useState(false); // Состояние для модального окна
    const [mirror, setMirror] = useState(false);
    const [messageApi, contextHolder] = message.useMessage();
    const [restore, setRestore] = useState(false);
    const navigate = useNavigate();
    const { isChatVisible, setIsChatVisible } = useChatVisibility();

    const {isAuthenticated} = useAuth();

    // Управляем классом modal-open для body при открытии/закрытии модального окна
    useEffect(() => {
        if (isModalOpen) {
            document.body.classList.add('modal-open');
        } else {
            document.body.classList.remove('modal-open');
        }

        // Очистка при размонтировании компонента
        return () => {
            document.body.classList.remove('modal-open');
        };
    }, [isModalOpen]);

    const handleCloseModal = () => {
        setIsModalOpen(false)
    };

    const handleAvatarClick = useCallback(() => {
        if (isAuthenticated) {
            navigate("/dashboard");
        } else {
            setIsModalOpen(true);
            setMirror(false);
            setRestore(false);
        }
    }, [isAuthenticated, navigate]);

    const {showLoginForm, setShowLoginForm} = useAuth();

    // Функция для прокрутки к разделу "Примеры использования"
    const scrollToExamples = () => {
        const element = document.getElementById('examples-section');
        if (element) {
            const offsetTop = element.offsetTop - 100; // Отступ для учета фиксированного меню
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    };

    // Функция для прокрутки к разделу "О нас"
    const scrollToAbout = () => {
        const element = document.getElementById('about-section');
        if (element) {
            const offsetTop = element.offsetTop - 100; // Отступ для учета фиксированного меню
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    };

    // Функция для прокрутки к разделу "Документация"
    const scrollToDocumentation = () => {
        const element = document.getElementById('documentation-section');
        if (element) {
            const offsetTop = element.offsetTop - 100; // Отступ для учета фиксированного меню
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    };

    const handleRestoreChat = () => {
        setIsChatVisible(true);
    };

    useEffect(() => {
        if (showLoginForm) {
            handleAvatarClick();
            setShowLoginForm(false)
        }
    }, [handleAvatarClick, setShowLoginForm, showLoginForm]);


    return (
        <div className={`top-menu ${theme}`}>
            {contextHolder}
            <div className="menu-content">
                <div className="left-content">
                    <p onClick={scrollToAbout} style={{cursor: 'pointer'}}>{t('TopMenu-about')}</p>
                    <p onClick={scrollToExamples} style={{cursor: 'pointer'}}>{t('TopMenu-examples')}</p>
                    <p onClick={scrollToDocumentation} style={{cursor: 'pointer'}}>{t('TopMenu-docs')}</p>
                </div>
                <div className="right-content">
                    {!isChatVisible && (
                        <Tooltip title="Восстановить чат">
                            <FaRegWindowMaximize
                                className="maximize-button"
                                onClick={handleRestoreChat}
                            />
                        </Tooltip>
                    )}
                    <Badge dot
                           color={isAuthenticated ? "green" : "red"}
                    >
                        <Tooltip
                            title={!isAuthenticated ? t('TopMenu-login') : t('TopMenu-controlPanel')}
                        >
                            <Avatar
                                shape="square"
                                size={32}
                                icon={<UserOutlined/>}
                                onClick={handleAvatarClick}
                                style={{cursor: "pointer"}}
                            />
                        </Tooltip>
                    </Badge>
                    <LanguageSwitcher/>
                    <ThemeToggle/>
                </div>
            </div>
            {isModalOpen && createPortal(
                <Modal
                    onClose={handleCloseModal}
                    itFreeClose={false}
                >
                    {restore ? (
                        <RestoreMail
                            setMainModalOpen={setIsModalOpen}
                            handleDenyMail={() => handleDenyMail(messageApi)}
                            handleSuccess={() => handleSuccess(messageApi)}
                            handleError={() => handleError(messageApi)}
                        />
                    ) : (
                        <>
                            {!mirror ? (
                                <AuthForm
                                    setMainModalOpen={setIsModalOpen}
                                    setMirror={setMirror}
                                    mirror={!mirror}
                                    setRestoreMail={setRestore}
                                    handleError={() => handleError(messageApi)}
                                    handleDeny={() => handleDeny(messageApi)}
                                    handleDiasbled={() => handleDiasbled(messageApi)}
                                    handleNotConfirmed={() => handleNotConfirmed(messageApi)}
                                />
                            ) : (
                                <RegForm
                                    setMirror={setMirror}
                                    setMainModalOpen={setIsModalOpen}
                                    handleSuccess={() => handleSuccess(messageApi)}
                                    handleFalure={() => handleFalure(messageApi)}
                                    handleError={() => handleError(messageApi)}
                                />
                            )}
                        </>
                    )}
                </Modal>,
                document.body
            )}
        </div>
    );
}

export default TopMenu;
