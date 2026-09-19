import {CreateModel} from "./steps/CreateModel";
import {Channels} from "./steps/Channals/Channels";
import {Notifications} from "./steps/Notifications/Notifications";
import {DialogList} from "./steps/Dialogs/DialogList";
import {Dev} from "./steps/Dev-tolls/Dev";
import {SystemSettings} from "./steps/Dev-tolls/SystemSettings";
import DashboardOverview from "./steps/DashboardOverview";
import React from "react";
import {Billing} from "./steps/billing/Billing";
import {Logs} from "./steps/Logs/Logs";
import {UserData} from "./steps/User-data/UserData";
import {CreateService} from "./steps/Services/CreateService";
import {CreateCRM} from "./steps/CRM/CreateCRM";
import showSimpleAuth from "../utils/showSimpleAuth";

export const dashboardContent = (selectedMenu, refreshUserData, userRole = null, onMenuChange = null) => {
    // Возвращает контент в зависимости от выбранного меню
    switch (selectedMenu) {
        case "start":
            return (
                <div className="title">
                    {showSimpleAuth ? <SystemSettings/> :
                        <DashboardOverview userRole={userRole} onMenuChange={onMenuChange}/>}
                </div>
            );
        case "dev":
            return (
                <div className="form-section model-name-section">
                    <Dev/>
                </div>
            );
        case "user":
            return (
                <div className="form-section model-name-section">
                    <UserData/>
                </div>
            );
        case "models":
            return (
                <div className="form-section model-name-section">
                    <CreateModel onMenuChange={onMenuChange}/>
                </div>
            );
        case "crm":
            return (
                <div className="form-section model-name-section">
                    <CreateCRM/>
                </div>
            );
        case "services":
            return (
                <div className="form-section model-name-section">
                    <CreateService/>
                </div>
            );
        case "modules":
            return (
                <div className="form-section model-name-section">
                    <Channels/>
                </div>
            );
        case "notifications":
            return (
                <div className="form-section model-name-section">
                    <Notifications/>
                </div>
            );
        case "stat":
            return (
                <div className="form-section model-name-section">
                    <DialogList/>
                </div>
            );
        case "logs":
            return (
                <div className="form-section model-name-section">
                    <Logs/>
                </div>
            );
        case "bill":
            return (
                <div className="form-section model-name-section">
                    <Billing refreshUserData={refreshUserData}/>
                </div>
            );
        default:
            return (
                <>
                    <h1>Добро пожаловать!</h1>
                    <p>Выберите пункт меню для работы.</p>
                </>
            );
    }
};
