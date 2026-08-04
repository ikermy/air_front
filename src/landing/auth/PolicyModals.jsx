import React, {useEffect} from 'react';
import ReactDOM from 'react-dom';
import {ConfigProvider, Modal, Typography} from 'antd';
import {useTranslation} from 'react-i18next';

// Настроим глобальный z-index для всех модальных окон Ant Design
if (typeof window !== 'undefined') {
    ConfigProvider.config({
        rootClassName: 'high-z-index-modal',
    });
}

// Компонент для модального окна политики конфиденциальности
export function PolicyModal({ isOpen, onClose }) {
    const {t} = useTranslation();

    useEffect(() => {
        if (isOpen) {
            // Убедимся, что модальное окно получит высокий z-index
            const modalRoot = document.querySelector('.regform-policy-modal-portal');
            if (modalRoot) {
                modalRoot.style.zIndex = '30000';
            }
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <Modal
            title={t('PolicyModal-Title') || "Политика конфиденциальности"}
            open={isOpen}
            onCancel={onClose}
            footer={null}
            width={700}
            centered
            mask={true}
            mask={{ closable: true }}
            wrapClassName="regform-policy-modal-portal"
            style={{ zIndex: 30000 }}
            maskStyle={{ zIndex: 29999 }}
        >
            <Typography.Paragraph>
                🛡 <strong>{t('PolicyModal-ShortPolicy') || "Краткая политика конфиденциальности"}</strong>
            </Typography.Paragraph>

            <Typography.Paragraph>
                {t('PolicyModal-WeValuePrivacy') || "Мы ценим вашу приватность."}
            </Typography.Paragraph>

            <Typography.Paragraph>
                {t('PolicyModal-YouCreateModels') || "На нашем сайте вы создаёте и используете"} <strong>{t('PolicyModal-YourModels') || "свои"}</strong> {t('PolicyModal-AIAgents') || "модели ИИ-агентов"}.
            </Typography.Paragraph>

            <Typography.Paragraph>
                <strong>{t('PolicyModal-WhatMeansForYou') || "Что это значит для вас:"}</strong>
            </Typography.Paragraph>

            <ul>
                <li>{t('PolicyModal-OnlyNecessaryData') || "Мы собираем только то, что нужно для работы сервиса (аккаунт, технические данные, данные для доступа к каналам взаимодействия)."}</li>
                <li>{t('PolicyModal-OnlyForAgent') || "Всё, что вы вводите или загружаете, используется"} <strong>{t('PolicyModal-Only') || "только"}</strong> {t('PolicyModal-ForYourAgent') || "для работы вашего агента."}.</li>
                <li>{t('PolicyModal-NoAds') || "Мы"} <strong>{t('PolicyModal-Not') || "не"}</strong> {t('PolicyModal-NoAdsAnalytics') || "используем ваши данные для рекламы, аналитики или обучения чужих моделей."}.</li>
                <li>{t('PolicyModal-NoThirdParty') || "Мы"} <strong>{t('PolicyModal-Not') || "не"}</strong> {t('PolicyModal-NoThirdPartyShare') || "передаём ваши данные третьим лицам."}.</li>
                <li>{t('PolicyModal-CanDelete') || "Вы можете удалить свои данные и модели в любой момент — мы их безвозвратно уничтожим."}</li>
            </ul>

            <Typography.Paragraph>
                💬 <em>{t('PolicyModal-InShort') || "В двух словах:"}</em> {t('PolicyModal-YourDataYours') || "ваши данные — ваши. Мы их храним только для того, чтобы ваш агент работал, и больше ни для чего."}
            </Typography.Paragraph>

            <Typography.Paragraph>
                {t('PolicyModal-ReadFull') || "Ознакомьтесь с"} <a href="/privacy-policy" target="_blank">{t('PolicyModal-FullText') || "полным текстом политики конфиденциальности"}</a>.
            </Typography.Paragraph>
        </Modal>,
        document.body
    );
}

// Компонент для модального окна демо-доступа
export function DemoModal({ isOpen, onClose }) {
    const {t} = useTranslation();

    useEffect(() => {
        if (isOpen) {
            // Убедимся, что модальное окно получит высокий z-index
            const modalRoot = document.querySelector('.regform-demo-modal-portal');
            if (modalRoot) {
                modalRoot.style.zIndex = '30000';
            }
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <Modal
            title={t('DemoModal-Title') || "Правила демонстрационного доступа"}
            open={isOpen}
            onCancel={onClose}
            footer={null}
            width={700}
            centered
            mask={true}
            mask={{ closable: true }}
            wrapClassName="regform-demo-modal-portal"
            style={{ zIndex: 30000 }}
            maskStyle={{ zIndex: 29999 }}
        >
            <Typography.Paragraph>
                1. <strong>{t('DemoModal-UnlimitedChannels') || "Неограниченные каналы связи"}</strong> — {t('DemoModal-UnlimitedChannelsText') || "вы можете взаимодействовать с Агентом через любые доступные каналы, включая поддержку"} <strong>{t('DemoModal-VoiceMessages') || "голосовых сообщений"}</strong>.
            </Typography.Paragraph>

            <Typography.Paragraph>
                2. <strong>{t('DemoModal-FullFunctionality') || "Полный функционал создания моделей"}</strong> — {t('DemoModal-FullFunctionalityText') || "доступны все возможности конструктора агента, включая:"}
            </Typography.Paragraph>
            <ul>
                <li>{t('DemoModal-Embeddings') || "создание"} <strong>{t('DemoModal-EmbeddingsName') || "эмбеддингов"}</strong> {t('DemoModal-AndUsing') || "и использование"} <strong>{t('DemoModal-SemanticSearch') || "семантического поиска"}</strong>;</li>
                <li>{t('DemoModal-VectorStorage') || "использование"} <strong>{t('DemoModal-VectorStorageName') || "векторного хранилища"}</strong>;</li>
                <li>{t('DemoModal-S3Storage') || "подключение"} <strong>{t('DemoModal-S3StorageName') || "S3-хранилища"}</strong>;</li>
                <li><strong>{t('DemoModal-FileGeneration') || "генерацию файлов"}</strong>.</li>
            </ul>

            <Typography.Paragraph>
                3. <strong>{t('DemoModal-MessageLimit') || "Лимит сообщений"}</strong> — {t('DemoModal-MessageLimitText') || "в рамках демонстрационного доступа предоставляется"} <strong>{t('DemoModal-MessageCount') || "30 сообщений"}</strong> {t('DemoModal-FromAIAgent') || "от ИИ Агента"}.
            </Typography.Paragraph>
        </Modal>,
        document.body
    );
}

