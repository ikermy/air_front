import React from 'react';
import HeroSection from "./Hero";
import Meta from "./Meta";
import AssistFeatures from "./AssistFeatures";
import MessengerFeatures from "./MessengerFeatures";
import Documentation from "./Documentation";
import {FloatingChatDemo} from "./demochat/FloatingChatDemo";
import {useChatVisibility} from "../ChatVisibilityContext";
import "./LandingPage.css"
import ExamplesCarousel from "./ExamplesCarousel";
import DashboardOverView from "./DashboardOverView";
import FooterSection from "./FooterSection";

const LandingPage = () => {
    const { isChatVisible, setIsChatVisible } = useChatVisibility();

    return (
        <div>
            <Meta
                title="Маруся AI - сообщения клиентов со всех мессенджеров в одном окне"
                // description="Добро пожаловать на наш сайт, созданный с использованием React!"
                // keywords="React, лендинг, веб-разработка"
                charSet="utf-8"
                // viewport
            />

            <main className="main-container">
                <HeroSection/>
                <AssistFeatures/>
                <MessengerFeatures/>
                <ExamplesCarousel />
                <DashboardOverView />
                <Documentation/>

                {isChatVisible && <FloatingChatDemo className="chat-window" onMinimize={() => setIsChatVisible(false)} />}
            </main>

            <FooterSection />
        </div>
    );
};

export default LandingPage;
