import React from 'react';
import LanguageSwitcher from "../LanguageSwitcher";
import ThemeToggle from "../menu/ThemeToggle";
import {Button} from "antd";
import {useAuth} from "../AuthContext";
import {useNavigate} from "react-router-dom";
import './dash.css';
import {RxExit} from "react-icons/rx";
import {MenuOutlined} from "@ant-design/icons";

export const DashboardHeader = ({ setSiderCollapsed, siderCollapsed }) => {
    const {logout} = useAuth();
    const navigate = useNavigate();

    const handleExit = () => {
        localStorage.removeItem("authToken");
        logout();
        navigate("/");
    };

    // Функция для показа/скрытия меню
    const handleMenuToggle = () => {
        setSiderCollapsed(!siderCollapsed);
    };

    return (
        <div className="dashboard-header-fixed">
            {/* Кнопка меню в самой левой части */}
            <Button
                className="header-menu-toggle"
                type="text"
                icon={<MenuOutlined />}
                onClick={handleMenuToggle}
                title="Показать/скрыть меню"
            />

            <img
                src="/landing/aperture.svg"
                alt="Логотип"
                className="dashboard-logo"
            />
            <div className="dashboard-status-circle"></div>
            <b className="dashboard-title">Маруся AI</b>
            <div className="dashboard-lang-switch">
                <LanguageSwitcher/>
            </div>
            <div className="dashboard-theme-switch">
                <ThemeToggle/>
            </div>
            <div className="exit-btn">
                <Button
                    block
                    type="primary"
                    danger
                    ghost
                    icon={<RxExit />}
                    iconPosition="end"
                    onClick={handleExit}
                >
                    Выход
                </Button>
            </div>
        </div>
    );
};