import React, { Suspense, lazy } from 'react';
import HeroSection from "./Hero";
import Meta from "./Meta";
import AssistFeatures from "./AssistFeatures";
import {useChatVisibility} from "../ChatVisibilityContext";
import "./LandingPage.css"
import FooterSection from "./FooterSection";
import { Spin } from 'antd';

// Lazy loading для компонентов, которые не видны сразу
const MessengerFeatures = lazy(() => import("./MessengerFeatures"));
const Documentation = lazy(() => import("./Documentation"));
const FloatingChatDemo = lazy(() => import("./demochat/FloatingChatDemo").then(module => ({ default: module.FloatingChatDemo })));
const ExamplesCarousel = lazy(() => import("./ExamplesCarousel"));
const DashboardOverView = lazy(() => import("./DashboardOverView"));

// Компонент загрузки для секций
const SectionLoader = () => (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <Spin size="large" />
    </div>
);

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

                <Suspense fallback={<SectionLoader />}>
                    <MessengerFeatures/>
                    <ExamplesCarousel />
                    <DashboardOverView />
                    <Documentation/>
                </Suspense>

                {isChatVisible && (
                    <Suspense fallback={null}>
                        <FloatingChatDemo className="chat-window" onMinimize={() => setIsChatVisible(false)} />
                    </Suspense>
                )}
            </main>

            <FooterSection />
        </div>
    );
};

export default LandingPage;
