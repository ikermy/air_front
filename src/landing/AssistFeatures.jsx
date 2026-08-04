import {Card, Badge} from "antd";
import React from "react";

const AssistFeatures = () => {
    const keyFeatures = [
        {
            icon: "🧠",
            title: "Умная память",
            description: "Сохраняет контекст диалога и учится на взаимодействиях",
            badge: "AI"
        },
        {
            icon: "🎯",
            title: "Конструктор моделей",
            description: "Создавайте персональных агентов без кода",
            badge: "NEW"
        },
        {
            icon: "☁️",
            title: "Облачное хранилище",
            description: "Встроенное S3 хранилище для ваших данных",
            badge: "PRO"
        },
        {
            icon: "⚡",
            title: "Автоматизация",
            description: "Умные триггеры и система целей",
            badge: "SMART"
        },
        {
            icon: "🎥",
            title: "Мультимодальность",
            description: "Работа с текстом, изображениями, аудио и видео",
            badge: "Enhanced"
        },
        {
            icon: "🌍",
            title: "Все языки мира",
            description: "Поддержка более 100 языков с автоопределением",
            badge: "Global"
        }
    ];

    const getBadgeColor = (badge) => {
        const colors = {
            "AI": "#722ed1",
            "NEW": "#1890ff",
            "PRO": "#52c41a",
            "SMART": "#eb2f96",
            "Enhanced": "#13c2c2",
            "Global": "#f5222d"
        };
        return colors[badge] || "#1890ff";
    };

    return (
        <div className="assistant-description" id="about-section">
            <div className="description-intro">
                <h2 className="intro-title">
                    <span className="highlight">Маруся AI</span> — виртуальный агент нового поколения
                </h2>
                <p className="intro-text">
                    Построен на базе GPT-5 с принципами сохранения контекста, мультимодальности
                    и расширяемости под ваши задачи
                </p>
            </div>

            <div className="features-container">
                <div className="features-grid">
                    {keyFeatures.map((feature, index) => (
                        <Card
                            key={index}
                            className="feature-card"
                            hoverable
                            size="small"
                        >
                            <div className="feature-content">
                                <div className="feature-header">
                                    <span className="feature-icon">{feature.icon}</span>
                                    <Badge
                                        count={feature.badge}
                                        size="small"
                                        color={getBadgeColor(feature.badge)}
                                        className="feature-badge"
                                    />
                                </div>
                                <div className="feature-text-content">
                                    <h3 className="feature-title">{feature.title}</h3>
                                    <p className="feature-description">{feature.description}</p>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AssistFeatures;
