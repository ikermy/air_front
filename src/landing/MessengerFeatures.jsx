import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Tabs } from 'antd';
import './MessengerFeatures.css';
import {MessageOutlined} from "@ant-design/icons";
import Title from "antd/lib/typography/Title";
import Text from "antd/lib/typography/Text";

const MessengerFeatures = () => {
    const [activeTab, setActiveTab] = useState('messengers');
    // Добавляем детектор ширины для адаптивных заголовков вкладок
    const [isNarrow, setIsNarrow] = useState(false);
    useEffect(() => {
        const handleResize = () => {
            if (typeof window !== 'undefined') {
                setIsNarrow(window.innerWidth <= 425);
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const renderMessengers = () => (
        <Row gutter={[24, 24]} className="message-features-grid">
            <Col xs={24} sm={12} md={12}>
                <Card
                    className="feature-card"
                    style={{
                        backgroundImage: `url(/landing/telegram.png)`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center'
                    }}
                >
                    <div className="card-overlay">
                        <Card.Meta
                            title="Telegram"
                            description="Как в режиме бота, так и в режиме пользователя"
                        />
                    </div>
                </Card>
            </Col>
            <Col xs={24} sm={12} md={12}>
                <Card
                    className="feature-card"
                    style={{
                        backgroundImage: `url(/landing/whatsapp.png)`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center'
                    }}
                >
                    <div className="card-overlay">
                        <Card.Meta
                            title="WhatsApp"
                            description="В режиме пользовательского бота"
                        />
                    </div>
                </Card>
            </Col>
        </Row>
    );

    const renderSocialNetworks = () => (
        <Row gutter={[24, 24]} className="message-features-grid">
            <Col xs={24} sm={12} md={12}>
                <Card
                    className="feature-card"
                    style={{
                        backgroundImage: `url(/landing/instagram.png)`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center'
                    }}
                >
                    <div className="card-overlay">
                        <Card.Meta
                            title="Instagram"
                            description="Без использования Graph API эмулирует мобильное устройство"
                        />
                    </div>
                </Card>
            </Col>
        </Row>
    );

    const renderDirectIntegrations = () => (
        <Row gutter={[24, 24]} className="message-features-grid">
            <Col xs={24} sm={12} md={12}>
                <Card
                    className="feature-card"
                    style={{
                        backgroundImage: `url(/landing/widget.png)`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center'
                    }}
                >
                    <div className="card-overlay">
                        <Card.Meta
                            title="Виджет для сайта"
                            description="Полноценный месенджер для вашего веб-сайта"
                        />
                    </div>
                </Card>
            </Col>
            <Col xs={24} sm={12} md={12}>
                <Card
                    className="feature-card"
                    style={{
                        backgroundImage: `url(/landing/widget.png)`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center'
                    }}
                >
                    <div className="card-overlay">
                        <Card.Meta
                            title="API"
                            description="Прямая интеграция через API для разработчиков"
                        />
                    </div>
                </Card>
            </Col>
        </Row>
    );

    return (
        <div className="features-section">
            <h2 className="intro-title">
                <span className="highlight">Маруся AI</span> — поддерживает следующие каналы взаимодействия
            </h2>

            <div className="tabs-container">
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    centered
                    className="features-tabs"
                    items={[
                        {
                            key: 'messengers',
                            label: isNarrow ? 'Месс.' : 'Мессенджеры',
                            children: renderMessengers()
                        },
                        {
                            key: 'social',
                            label: isNarrow ? 'Сети' : 'Соц. сети',
                            children: renderSocialNetworks()
                        },
                        {
                            key: 'integrations',
                            label: isNarrow ? 'Интегр.' : 'Прямые интеграции',
                            children: renderDirectIntegrations()
                        }
                    ]}
                />
            </div>
            <div className="features-footer">
                <Card className="features-quick-start">
                    <div className="features-quick-start-content">
                        <MessageOutlined className="features-quick-start-icon" />
                        <div>
                            <Title level={4} className="features-quick-start-title">
                                Нужен особый канал связи?
                            </Title>
                            <Text className="features-quick-start-text">
                                Мы поможем интегрировать агента с любой платформой или сервисом
                            </Text>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default MessengerFeatures;
