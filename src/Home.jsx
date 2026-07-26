import React, {useEffect} from "react";
import {useSearchParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import LandingPage from "./landing/LandingPage";
import TopMenu from "./menu/TopMenu";
import {Widget} from "./widget/Widget";
import {useAuth} from "./AuthContext";
import {checkAuthToken} from "./landing/auth/CheckAuth";
import {showNotification, showErrorNotification} from "./dashboard/hotification/showNotification";
import {useLocation} from "react-router-dom";

function Home() {
    const {login, setShowLoginForm} = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const {t} = useTranslation();
    const location = useLocation();

    // Проверка query параметров для подтверждения email
    useEffect(() => {
        const confirmStatus = searchParams.get('confirm');
        const errorReason = searchParams.get('reason');
        const email = searchParams.get('email');

        if (confirmStatus === 'success') {
            // Успешное подтверждение email
            showNotification(
                t("emailConfirmSuccessTitle"),
                t("emailConfirmSuccessDesc", {email: email || ''})
            );

            // Открываем форму входа
            setShowLoginForm(true);

            // Очищаем параметры из URL
            searchParams.delete('confirm');
            searchParams.delete('email');
            setSearchParams(searchParams, {replace: true});

        } else if (confirmStatus === 'error') {
            // Обработка ошибок подтверждения email
            let errorMessage;

            switch(errorReason) {
                case 'no-token':
                    errorMessage = t("emailConfirmErrorNoToken");
                    break;
                case 'invalid-token':
                    errorMessage = t("emailConfirmErrorInvalidToken");
                    break;
                case 'server-error':
                    errorMessage = t("emailConfirmErrorServerError");
                    break;
                default:
                    errorMessage = t("emailConfirmErrorGeneric");
            }

            showErrorNotification(
                t("emailConfirmErrorTitle"),
                errorMessage
            );

            // Очищаем параметры из URL
            searchParams.delete('confirm');
            searchParams.delete('reason');
            setSearchParams(searchParams, {replace: true});
        }
    }, [searchParams, setSearchParams, setShowLoginForm, t]);

    // Проверяю автоматическую авторизацию пользователя по сохраненному токену
    useEffect(() => {
        // Если мы только что вышли, не пытаемся сразу войти обратно по рефреш-токену
        if (location.state?.loggedOut) {
            // Очищаем состояние, чтобы при следующем посещении главной автологин сработал
            window.history.replaceState({}, document.title);
            return;
        }

        const checkAuth = async () => {
            const result = await checkAuthToken()

            if (result === "success") {
                login()
            }
        };

        checkAuth();
    }, [login, location.state?.loggedOut]);

    return (
        <div>
            <TopMenu/>
            <LandingPage/>
            <Widget
                widgetCode={process.env.REACT_APP_WIDGET_CODE}
                // buttonPosition={{right: '30px', bottom: '30px'}}
                // buttonSize={{width: '50px', height: '50px'}}
                // buttonStyle={{
                //     borderRadius: '50%',
                //     boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                // }}
                // colors={{
                //     buttonBackground: '#00ffea',
                //     buttonIconFilter: '#000000',
                //
                //     windowBackground: '#94b854',
                //     windowBorder: '#000000',
                //     textColor: '#000000',
                //
                //     headerBackground: '#ffe138',
                //     headerText: '#000000',
                //     headerIconFilter: '#000000',
                //
                //     messageBackgroundUser: '#b0c199',
                //     messageTextUser: '#253c83',
                //     messageBackgroundBot: '#bda889',
                //     messageTextBot: '#000000',
                //
                //     inputBackground: 'rgba(255,242,201,0.75)',
                //     inputText: '#000000',
                //     inputPlaceholder: '#7a7a7a',
                //
                //     sendButtonBackground: '#00ffea',
                //    sendButtonIconFilter: '#000000',
                //
                //     closeButtonBackground: '#b6ff44',
                //     closeButtonText: '#003cff',
                //
                //     connectedIndicator: '#ffffff',
                //     disconnectedIndicator: '#dc3545',
                //}}
            />
        </div>
    );
}

export default Home;
