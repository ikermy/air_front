import React from 'react';
import { Carousel, Typography } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import './ExamplesCarousel.css';

const { Title, Paragraph } = Typography;

const ExamplesCarousel = () => {
    const examples = [
        {
            icon: "📢",
            title: "Поддержка бизнеса и клиентов",
            items: [
                "Автоответчик 24/7 в мессенджерах: принимает обращения, классифицирует по теме (заказ, доставка, жалоба), сразу присылает готовые инструкции или запрашивает недостающие данные.",
                "Продажа прямо в чате: отправка прайс‑листов в PDF, фото/видео товара, быстрые кнопки «Оформить заказ».",
                "Обновления и акции: публикует посты в Instagram с подготовленным описанием и одновременно шлёт подписчикам в WhatsApp/Telegram карточки с фото и промокодом."
            ]
        },
        {
            icon: "🎨",
            title: "Контент‑менеджмент и продвижение",
            items: [
                "Получает от владельца магазина голосовое описание товара в WhatsApp, генерирует карточку с фото и текстом, выкладывает её в Instagram.",
                "Автоматическая сборка дайджеста: берёт посты из Instagram, готовит еженедельный обзор и рассылает в Telegram‑канал.",
                "Готовит мультимодальные посты — фото+подпись+хэштеги, всё оформлено под стиль бренда."
            ]
        },
        {
            icon: "🗂",
            title: "Работа с документами и файлами",
            items: [
                "Клиент в Telegram присылает скан договора — ассистент распознаёт текст, проверяет наличие ключевых пунктов и отвечает в чате с пометками.",
                "В WhatsApp сотрудник отправляет фото квитанции — бот заносит данные в CRM и присылает PDF‑отчёт.",
                "В Instagram через Direct клиент присылает аудиоотзыв — ассистент делает расшифровку и добавляет как текст к публикации."
            ]
        },
        {
            icon: "🌐",
            title: "Личный помощник",
            items: [
                "Синхронная напоминалка: напишет в WhatsApp и Telegram, если пора на встречу или сработал пользовательский триггер (например, «продан товар №123»).",
                "Отслеживание упоминаний в Instagram: если кто-то отмечает ваш профиль в сторис или посте, ассистент уведомляет в удобном мессенджере.",
                "Голосовой переводчик: получаете аудиосообщение на иностранном языке в Telegram — бот сразу присылает расшифровку и перевод."
            ]
        },
        {
            icon: "🚀",
            title: "Многошаговые автоматизации",
            items: [
                "Пришёл запрос через WhatsApp → бот проверил товар в базе → сформировал PDF‑счёт → отправил клиенту и параллельно уведомил менеджера в Telegram.",
                "Новое фото продукта загрузили в Instagram → ассистент вытащил изображение, создал описание и опубликовал пост в Telegram и WhatsApp‑каналах."
            ]
        }
    ];

    // Кастомные стрелки
    const CustomPrevArrow = ({ onClick }) => (
        <div className="custom-arrow custom-arrow-prev" onClick={onClick}>
            <LeftOutlined />
        </div>
    );

    const CustomNextArrow = ({ onClick }) => (
        <div className="custom-arrow custom-arrow-next" onClick={onClick}>
            <RightOutlined />
        </div>
    );

    return (
        <div className="examples-carousel-section">
            <h2 className="intro-title">
                <span className="highlight">Маруся AI</span> — примеры использования
            </h2>
            <Carousel
                autoplay
                dots={false}
                arrows={true}
                autoplaySpeed={5000}
                className="examples-carousel"
                prevArrow={<CustomPrevArrow />}
                nextArrow={<CustomNextArrow />}
                infinite={true}
                slidesToShow={1}
                slidesToScroll={1}
                centerMode={false}
                variableWidth={false}
                swipeToSlide={false}
            >
                {examples.map((example, index) => (
                    <div key={index} className="carousel-slide">
                        <div className="slide-content">
                            <div className="slide-header">
                                <span className="slide-icon">{example.icon}</span>
                                <Title level={3} className="slide-title">
                                    {index + 1}. {example.title}
                                </Title>
                            </div>
                            <div className="slide-items">
                                {example.items.map((item, itemIndex) => (
                                    <div key={itemIndex} className="slide-item">
                                        <span className="item-bullet">-</span>
                                        <Paragraph className="item-text">
                                            {item}
                                        </Paragraph>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </Carousel>
        </div>
    );
};

export default ExamplesCarousel;
