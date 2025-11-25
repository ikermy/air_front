import React, {useState, useEffect} from "react";
import {Alert, Button, Modal, QRCode} from "antd";
import {ContactsModal} from "../ContactsModal";
import {showErrorNotification, showNotification} from "../../../hotification/showNotification";
import {validateAndRefreshToken} from "../../../../utils/easyUtils";
import {getBotName} from "../getBotName";


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
    // Состояния для модального окна и контактов
    const [isContactsModalVisible, setIsContactsModalVisible] = useState(false);
    const [currentSelectedIds, setCurrentSelectedIds] = useState([]);

    // Определяем текущие выбранные ID для кнопки и модального окна
    // Используем исходное состояние если канал только что был развернут
    const originalState = originalChannelStates[channel.key];
    const displaySelectedIds = originalState ? originalState.contactsIds || [] : channel.contactsIds || [];

    // Извлекаем текущие выбранные контакты (если они есть)
    useEffect(() => {
        setCurrentSelectedIds(displaySelectedIds);
    }, [displaySelectedIds]);

    // Функция для открытия модального окна выбора контактов
    const handleOpenContactsModal = async () => {
        try {
            await handleGetContacts();
            // После успешного получения открываем модальное окно
            setIsContactsModalVisible(true);
        } catch (error) {
            showErrorNotification('Ошибка', `Не удалось загрузить контакты: ${error.message}`, 'error');
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
            "Настройки изменены",
            "После сохранения Ассистент будет взаимодействовать только с выбранными контактами"
        );
    };
    // Вспомогательный компонент для отображения состояния при генерации QR-кода
    const ShowQR = () => {
        return (
            <div>
                <Alert
                    className="channel-alert"
                    description={
                        "Подготовка QR-кода для авторизации в WhatsApp. Пожалуйста, подождите..."
                    }
                    type={"info"}
                />
            </div>
        );
    };

    const [botName, setBotName] = useState(null);

    const fetchBotNameFor = async (chName) => {
        const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
        if (!token) return null;

        try {
            const res = await getBotName(token, chName);
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
                        message="WhatsApp UserBot создан"
                        description={
                            botName != null ? (
                                <>
                                    Сейчас ваш WhatsApp UserBot <b>{botName}</b> запущен и взаимодействует с Ассистентом.
                                    Если требуется повторная авторизация, или вы хотите повторно создать канал WhatsApp
                                    UserBot, вам нужно удалить текущий канал.
                                </>
                            ) : (
                                <>
                                    Дополнительные действия не требуются.
                                    Если требуется повторная авторизация, или вы хотите повторно создать канал WhatsApp
                                    UserBot, вам нужно удалить текущий канал.
                                    <br/>
                                    Предупреждение - после запуска этого канала, Ассистент начнет обрабатывать
                                    новые сообщения примерно через одну минуту
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
                            {currentSelectedIds.length > 0 ? 'Изменить выбор контактов' : 'Выбрать контакты'}
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
                                        "Настройки изменены",
                                        "После сохранения Ассистент будет взаимодействовать со всеми вашими контактами"
                                    );
                                }}
                            >
                                Слушать всех
                            </Button>
                        )}
                    </div>
                    <Alert
                        className="channel-alert"
                        description={
                            <>
                                {channel.contacts ? (
                                    <>
                                        Сейчас Ассистент работает с выбранными вами контактами или группами.
                                    </>
                                ) : (
                                    <>
                                        Сейчас Ассистент работает со всеми вашими существующими и новыми контактами. Так
                                        же вы можете выбрать отдельные контакты или группы с которыми будет
                                        взаимодействовать Ассистент
                                    </>
                                )}
                            </>
                        }
                        type={channel.contacts ? "success" : "warning"}
                    />
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
                message="Настройка параметров WhatsApp UserBot"
                description={
                    <>
                        Для того что бы ваш ассистент мог вести себя как реальный
                        человек в WhatsApp, вам нужно просто отсканировать QR код через приложение WhatsApp на вашем телефоне!&nbsp;
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
                    Получить QR код авторизации
                </Button>
            )}

            {isGeneratingQRCode && (<ShowQR/>)}

            {showQRCode && (
                <Modal
                    title="QR-код для авторизации в WhatsApp"
                    open={showQRCode}
                    onCancel={() => {
                        setShowQRCode(false);
                        if (authService) {
                            authService.closeConnection();
                        }
                    }}
                    footer={null}
                >
                    <Alert
                        className="channel-alert"
                        description="Отсканируйте QR-код через приложение WhatsApp для авторизации"
                        type="success"
                        style={{marginBottom: 16}}
                    />
                    <div style={{display: 'flex', justifyContent: 'center'}}>
                        <QRCode
                            type={'svg'}
                            errorLevel={'Q'}
                            value={qrCodeUrl}
                            color="#000000"
                            bgColor="#ffffff"
                        />
                    </div>
                </Modal>
            )}
        </div>
    );
};