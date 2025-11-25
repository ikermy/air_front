import React, {useEffect} from "react";
import LandingPage from "./landing/LandingPage";
import TopMenu from "./menu/TopMenu";
import {Widget} from "./widget/Widget";
import {useAuth} from "./AuthContext";
import {checkAuthToken} from "./landing/auth/CheckAuth";


function Home() {
    const {login} = useAuth();
    // Проверяю автоматическую авторизацию пользователя по сохраненному токену
    useEffect(() => {
        const checkAuth = async () => {
            const result = await checkAuthToken()

            if (result === "success") {
                login()
            }
        };

        checkAuth();
    }, [login])

    return (
        <div>
            <TopMenu/>
            <LandingPage/>
            <Widget
                examKey={"08a80a0e08272b86ac75870b43a01d9774285186e783f6068611a34b757f21f8c7327ae19fe4257fc1f"}
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