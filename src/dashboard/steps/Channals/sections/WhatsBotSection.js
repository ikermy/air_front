import React, {useState, useEffect} from "react";
import {Alert, Button, Modal, QRCode, Switch} from "antd";
import {ContactsModal} from "../ContactsModal";
import {showErrorNotification, showNotification} from "../../../hotification/showNotification";
import {getBotName} from "../chUtils";
import {useTranslation} from "react-i18next";


export const WhatsBotSection = ({
                                    channel,
                                    selectedChannels,
                                    setSelectedChannels,
                                    isGeneratingQRCode,
                                    isLoadingContacts,
                                    qrCodeUrl,
                                    showQRCode,
                                    setShowQRCode,
                                    authService,
                                    handleGetQR,
                                    handleGetContacts,
                                    originalChannelStates
                                }) => {
    const {t} = useTranslation();
    // Состояния для модального окна и контактов
    const [isContactsModalVisible, setIsContactsModalVisible] = useState(false);
    const [currentSelectedIds, setCurrentSelectedIds] = useState([]);

    // Извлекаем текущие выбранные контакты (если они есть)
    useEffect(() => {
        // Определяем текущие выбранные ID для кнопки и модального окна
        // Используем исходное состояние если канал только что был развернут
        const originalState = originalChannelStates[channel.key];
        const displaySelectedIds = originalState ? originalState.contactsIds || [] : channel.contactsIds || [];
        setCurrentSelectedIds(displaySelectedIds);
    }, [originalChannelStates, channel.key, channel.contactsIds]);

    // Функция для открытия модального окна выбора контактов
    const handleOpenContactsModal = async () => {
        try {
            await handleGetContacts();
            // После успешного получения открываем модальное окно
            setIsContactsModalVisible(true);
        } catch (error) {
            showErrorNotification(t("error") || 'Ошибка', `${t("channelContactsError") || "Не удалось загрузить контакты"}: ${error.message}`, 'error');
        }
    };

    // Функция для сохранения выбранных контактов
    const handleSaveSelectedContacts = (selectedIds, selectedContacts) => {
        setCurrentSelectedIds(selectedIds);

        // Обновляем данные канала
        const selectedContactsStr = JSON.stringify(selectedContacts);

        // Обновляем состояние в родительском компоненте
        setSelectedChannels(
            selectedChannels.map((ch) =>
                ch.key === channel.key
                    ? { ...ch, contactsIds: selectedIds, contacts: selectedContactsStr }
                    : ch
            )
        );

        // Закрываем модальное окно
        setIsContactsModalVisible(false);

        // Показываем уведомление
        showNotification(
            t("whatsBotSettingsChanged") || "Настройки изменены",
            t("whatsBotAfterSaveSelected") || "После сохранения Агент будет взаимодействовать только с выбранными контактами"
        );
    };

    // Настройки ответа WhatsApp-бота хранятся в формате, который ожидает backend:
    // AllowText, AllowCall и Uids.
    const parseChannelData = (data) => {
        try {
            const parsed = typeof data === 'string' ? JSON.parse(data) : (data || {});
            return {
                ...parsed,
                AllowText: parsed.AllowText ?? true,
                AllowCall: parsed.AllowCall ?? true,
            };
        } catch {
            return {AllowText: true, AllowCall: true};
        }
    };

    const parsedChannelData = parseChannelData(channel.data);

    const handleOptionToggle = (optionKey) => (checked) => {
        setSelectedChannels(
            selectedChannels.map((ch) =>
                ch.key === channel.key
                    ? {...ch, data: JSON.stringify({...parsedChannelData, [optionKey]: checked})}
                    : ch
            )
        );
    };
    // Вспомогательный компонент для отображения состояния при генерации QR-кода
    const ShowQR = () => {
        return (
            <div>
                <Alert
                    className="channel-alert"
                    description={
                        t("whatsBotQRPreparing") || "Подготовка QR-кода для авторизации в WhatsApp. Пожалуйста, подождите..."
                    }
                    type={"info"}
                />
            </div>
        );
    };

    const [botName, setBotName] = useState(null);

    const fetchBotNameFor = async (chName) => {
        try {
            const res = await getBotName(chName);
            if (res && typeof res === "object") {
                return res.name ?? null;
            }
            return res;
        } catch (err) {
            console.error("Failed to get bot name:", err);
            return null;
        }
    };

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            try {
                if (!channel || !channel.key) {
                    if (mounted) setBotName(null);
                    return;
                }
                const name = await fetchBotNameFor(channel.key);
                if (mounted) setBotName(name);
            } catch (error) {
                console.error("Ошибка при загрузке данных:", error);
            }
        };

        load();
        return () => {
            mounted = false;
        };
    }, [channel]);

    if (channel.data) {
        return (
            <>
                <div className="padding">
                    <Alert
                        className="channel-alert"
                        message={t("whatsBotCreated") || "WhatsApp UserBot создан"}
                        description={
                            botName != null ? (
                                <>
                                    {t("whatsBotRunning") || "Сейчас ваш WhatsApp UserBot"} <b>{botName}</b> {t("whatsBotInteracting") || "запущен и взаимодействует с Агентом."}
                                    {t("whatsBotReauth") || "Если требуется повторная авторизация, или вы хотите повторно создать канал WhatsApp UserBot, вам нужно удалить текущий канал."}
                                </>
                            ) : (
                                <>
                                    {t("whatsBotNoAction") || "Дополнительные действия не требуются."}
                                    {t("whatsBotReauth") || "Если требуется повторная авторизация, или вы хотите повторно создать канал WhatsApp UserBot, вам нужно удалить текущий канал."}
                                    <br/>
                                    {t("whatsBotWarning") || "Предупреждение - после запуска этого канала, Агент начнет обрабатывать новые сообщения примерно через одну минуту"}
                                </>
                            )
                        }
                        type={"success"}
                    />
                    <div className="lining">
                        <Button
                            style={{color: "black"}}
                            type="primary"
                            loading={isLoadingContacts}
                            onClick={handleOpenContactsModal}
                            disabled={isLoadingContacts || !(channel.isEnabled && !!channel.data)}
                        >
                            {currentSelectedIds.length > 0 ? (t("whatsBotChangeContacts") || 'Изменить выбор контактов') : (t("whatsBotSelectContacts") || 'Выбрать контакты')}
                        </Button>

                        {currentSelectedIds.length > 0 && (
                            <Button
                                style={{color: "black"}}
                                type="primary"
                                disabled={!(channel.isEnabled && !!channel.data)}
                                onClick={() => {
                                    // Очищаем выбранные контакты
                                    channel.contactsIds = [];
                                    channel.contacts = '';

                                    // Обновляем состояние в родительском компоненте
                                    setSelectedChannels(
                                        selectedChannels.map((ch) =>
                                            ch.key === channel.key
                                                ? {...ch, contactsIds: [], contacts: ''}
                                                : ch
                                        )
                                    );

                                    // Показываем уведомление
                                    showNotification(
                                        t("whatsBotSettingsChanged") || "Настройки изменены",
                                        t("whatsBotAfterSaveAll") || "После сохранения Агент будет взаимодействовать со всеми вашими контактами"
                                    );
                                }}
                            >
                                {t("whatsBotListenAll") || "Слушать всех"}
                            </Button>
                        )}
                    </div>
                    <Alert
                        className="channel-alert"
                        description={
                            <>
                                {channel.contacts ? (
                                    <>
                                        {t("whatsBotSelectedContacts") || "Сейчас Агент работает с выбранными вами контактами или группами."}
                                    </>
                                ) : (
                                    <>
                                        {t("whatsBotAllContacts") || "Сейчас Агент работает со всеми вашими существующими и новыми контактами. Так же вы можете выбрать отдельные контакты или группы с которыми будет взаимодействовать Агент"}
                                    </>
                                )}
                            </>
                        }
                        type={channel.contacts ? "success" : "warning"}
                    />
                    <div style={{display: "flex", flexDirection: "column", gap: 8, marginTop: 8, paddingLeft: 16}}>
                        <div style={{display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end"}}>
                            <span>{t("tguserBotReplyTextMessages") || "Отвечать на текстовые сообщения"}</span>
                            <Switch
                                checked={parsedChannelData.AllowText}
                                onChange={handleOptionToggle('AllowText')}
                                disabled={!channel.isEnabled}
                                checkedChildren={<span style={{color: "black"}}>{t('Yes')}</span>}
                                unCheckedChildren={<span style={{color: "black"}}>{t('No')}</span>}
                            />
                        </div>
                        <div style={{display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end"}}>
                            <span>{t("tguserBotReplyVoiceCalls") || "Отвечать на голосовые вызовы"}</span>
                            <Switch
                                checked={parsedChannelData.AllowCall}
                                onChange={handleOptionToggle('AllowCall')}
                                disabled={!channel.isEnabled}
                                checkedChildren={<span style={{color: "black"}}>{t('Yes')}</span>}
                                unCheckedChildren={<span style={{color: "black"}}>{t('No')}</span>}
                            />
                        </div>
                    </div>
                </div>
                <ContactsModal
                    visible={isContactsModalVisible}
                    onClose={() => setIsContactsModalVisible(false)}
                    contacts={channel.contacts || []} // Передаем контакты
                    onSave={handleSaveSelectedContacts} // Передаем функцию сохранения
                    initialSelectedIds={currentSelectedIds} // Передаем текущий выбор
                />
            </>
        );
    }

    return (
        <div className="padding">
            <Alert
                className="channel-alert"
                message={t("whatsBotSetup") || "Настройка параметров WhatsApp UserBot"}
                description={
                    <>
                        {t("whatsBotSetupDesc") || "Для того что бы ваш агент мог вести себя как реальный человек в WhatsApp, вам нужно просто отсканировать QR код через приложение WhatsApp на вашем телефоне!"}&nbsp;
                    </>
                }
                type={channel.data ? "success" : "warning"}
            />

            {!showQRCode && (
                <Button
                    style={{color: "black"}}
                    type="primary"
                    loading={isGeneratingQRCode}
                    // disabled={!channel.data}
                    onClick={handleGetQR}
                >
                    {t("whatsBotGetQR") || "Получить QR код авторизации"}
                </Button>
            )}

            {isGeneratingQRCode && (<ShowQR/>)}

            {showQRCode && (
                <Modal
                    title={t("whatsBotQRTitle") || "QR-код для авторизации в WhatsApp"}
                    open={showQRCode}
                    onCancel={() => {
                        setShowQRCode(false);
                        if (authService) {
                            authService.closeConnection();
                        }
                    }}
                    footer={null}
                    width={400}
                >
                    <Alert
                        className="channel-alert"
                        description={t("whatsBotQRDesc") || "Отсканируйте QR-код через приложение WhatsApp для авторизации"}
                        type="success"
                        style={{marginBottom: 16}}
                    />
                    <div style={{display: 'flex', justifyContent: 'center', marginBottom: 16}}>
                        <QRCode
                            type={'svg'}
                            errorLevel={'Q'}
                            value={qrCodeUrl || 'loading...'}
                            color="#000000"
                            bgColor="#ffffff"
                            size={256}
                        />
                    </div>
                </Modal>
            )}
        </div>
    );
};

