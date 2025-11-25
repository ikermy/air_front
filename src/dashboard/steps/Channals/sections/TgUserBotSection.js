import React, {useEffect, useState} from "react";
import {Alert, Button, Input, Modal, QRCode, Progress} from "antd";
import {PhoneOutlined} from "@ant-design/icons";
import {ContactsModal} from "../ContactsModal";
import {showErrorNotification, showNotification} from "../../../hotification/showNotification";
import { Typography } from 'antd';
import {validateAndRefreshToken} from "../../../../utils/easyUtils";
import {getBotName} from "../getBotName";
const { Title, Paragraph } = Typography;

export const TgUserBotSection = ({
                                     channel,
                                     selectedChannels,
                                     setSelectedChannels,
                                     isGeneratingQRCode,
                                     isLoadingContacts,
                                     contactsLoadingStatus,
                                     qrCodeUrl,
                                     showQRCode,
                                     setShowQRCode,
                                     authService,
                                     password2FA,
                                     setPassword2FA,
                                     passwordModalVisible,
                                     setPasswordModalVisible,
                                     handleGetQR,
                                     handleGetContacts,
                                     handleSubmitPassword,
                                     needPassword,
                                     originalChannelStates
                                 }) => {
    // Состояние для видимости модального окна контактов
    const [isContactsModalVisible, setIsContactsModalVisible] = useState(false);

    // Определяем текущие выбранные ID для кнопки и модального окна
    // Используем исходное состояние если канал только что был развернут
    const originalState = originalChannelStates[channel.key];
    const currentSelectedIds = originalState ? originalState.contactsIds || [] : channel.contactsIds || [];

    // Функция, вызываемая при сохранении выбора в модальном окне
    const handleSaveSelectedContacts = (selectedIds) => {
        channel.contactsIds = selectedIds;
        // handleSetContactsIds(selectedIds);
        const usersCount = "Выбрано пользователей - " + selectedIds.length;
        showNotification(usersCount,
            "После сохранения настроек Ассистент будет взаимодействовать с выбранными пользователями");
    };

    // Функция для открытия модального окна контактов
    const openContactsModal = async () => {
        // Сначала пытаемся получить/обновить контакты
        try {
            await handleGetContacts();
            // После успешного получения открываем модальное окно
            setIsContactsModalVisible(true);
        } catch (error) {
            console.error("Ошибка при получении контактов:", error);
            showErrorNotification('Ошибка', `Не удалось загрузить контакты: ${error.message}`, 'error');
        }
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

    // Вспомогательный компонент для отображения состояния при генерации QR-кода
    const ShowQR = () => {
        return (
            <div>
                <Alert
                    className="channel-alert"
                    description={
                        needPassword
                            ? "Введите пароль для двухфакторной аутентификации"
                            : "Подготовка QR-кода для авторизации в Telegram. Если учетная запись требует двухфакторную авторизацию, будьте готовы ввести пароль и проверочный код"
                    }
                    type={needPassword ? "warning" : "info"}
                />
            </div>
        );
    };

    const [isManualOpen, setIsManualOpen] = useState(false);
    const showManual = () => {
        setIsManualOpen(true);
    };
    const handleCancel = () => {
        setIsManualOpen(false)
    };

    useEffect(() => {
        if (passwordModalVisible) {
            // очищаем старый пароль при открытии модалки
            setPassword2FA('');
        }
    }, [passwordModalVisible, setPassword2FA]);

    if (channel.data) {
        return (
            <>
                <div className="padding">
                    <Alert
                        className="channel-alert"
                        message="Telegram UserBot создан"
                        description={
                            botName != null ? (
                                <>
                                    Сейчас ваш Telegram UserBot <b>{botName}</b> запущен и взаимодействует с Ассистентом.
                                    Если требуется повторная авторизация, или вы хотите повторно создать канал Telegram
                                    UserBot, вам нужно удалить текущий канал.
                                </>
                            ) : (
                                <>
                                    Дополнительные действия не требуются.
                                    Если требуется повторная авторизация, или вы хотите повторно создать канал Telegram
                                    UserBot, вам нужно удалить текущий канал.
                                </>
                            )
                        }
                        type={"success"}
                    />

                    {/* Отображение статуса загрузки контактов */}
                    {isLoadingContacts && contactsLoadingStatus && contactsLoadingStatus.message && (
                        <Alert
                            className="channel-alert"
                            message="Загрузка контактов"
                            description={
                                <div>
                                    <div style={{ marginBottom: 8 }}>{contactsLoadingStatus.message}</div>
                                    {contactsLoadingStatus.progress > 0 && (
                                        <div>
                                            <Progress
                                                percent={contactsLoadingStatus.progress}
                                                size="small"
                                                showInfo={true}
                                                format={() => contactsLoadingStatus.current && contactsLoadingStatus.total
                                                    ? `${contactsLoadingStatus.current}/${contactsLoadingStatus.total}`
                                                    : `${contactsLoadingStatus.progress}%`
                                                }
                                            />
                                        </div>
                                    )}
                                </div>
                            }
                            type="info"
                            style={{ marginBottom: 16 }}
                        />
                    )}

                    <div className="lining">
                        <Button
                            style={{color: "black"}}
                            type="primary"
                            loading={isLoadingContacts}
                            onClick={openContactsModal}
                            disabled={isLoadingContacts || !(channel.isEnabled && !!channel.data)}
                        >
                            {isLoadingContacts ? 'Загружаем контакты...' :
                             currentSelectedIds.length > 0 ? 'Изменить выбор контактов' : 'Выбрать контакты'}
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
                message="Настройка параметров Telegram UserBot"
                description={
                    <>
                        Для того что бы ваш ассистент мог вести себя как реальный
                        человек в Telegram, нужно получить
                        api_id и api_hash перейдя по ссылке <a
                        href="https://my.telegram.org/" target="_blank"
                        rel="noopener noreferrer">my.telegram.org</a>&nbsp;
                        Подробнее о процесса создания Telegram UserBot в можно
                        {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                        узнать в <a onClick={showManual}>руководстве</a>
                    </>
                }
                type={channel.phone ? "success" : "warning"}
            />
            <Input
                prefix={<PhoneOutlined/>}
                placeholder="Введите номер телефона"
                value={channel.phone || ''}
                onChange={(e) => {
                    // Разрешаем только цифры, +, пробелы, дефисы и скобки
                    const value = e.target.value.replace(/[^\d\s\-()+]/g, '');

                    // Разрешает начинаться с + и содержать от 7 до 15 цифр
                    const phoneRegex = /^(\+)?[\d\s\-()+]{7,15}$/;

                    // Проверяем только если поле не пустое
                    const error = value && !phoneRegex.test(value)
                        ? 'Формат: +X(XXX)XXX-XX-XX'
                        : '';

                    setSelectedChannels(
                        selectedChannels.map((ch) =>
                            ch.key === channel.key
                                ? {...ch, phone: value, error: error}
                                : ch
                        )
                    );
                }}
                status={channel.error ? "error" : ""}
            />
            <div className="lining">
                <div className="thirty">
                    <Input
                        placeholder="Введите API ID"
                        value={channel.appId || ''}
                        onChange={(e) => {
                            // Разрешаем только цифры
                            const value = e.target.value.replace(/\D/g, '');

                            setSelectedChannels(
                                selectedChannels.map((ch) =>
                                    ch.key === channel.key
                                        ? {...ch, appId: value}
                                        : ch
                                )
                            );
                        }}
                    />
                </div>
                <div className="seventy">
                    <Input
                        placeholder="Введите API Hash"
                        value={channel.appHash || ''}
                        onChange={(e) => {
                            setSelectedChannels(
                                selectedChannels.map((ch) =>
                                    ch.key === channel.key
                                        ? {...ch, appHash: e.target.value}
                                        : ch
                                )
                            );
                        }}
                    />
                </div>
            </div>

            {!showQRCode && (
                <Button
                    style={{color: "black"}}
                    type="primary"
                    loading={isGeneratingQRCode}
                    disabled={!(
                        channel.appId && channel.appId.length >= 8 &&
                        channel.appHash && channel.appHash.length >= 30 &&
                        channel.phone && channel.phone.trim() !== '' &&
                        channel.phone.trim().length >= 7
                    )}
                    onClick={handleGetQR}
                >
                    Получить QR код авторизации
                </Button>
            )}

            {isGeneratingQRCode && (<ShowQR/>)}

            {showQRCode && (
                <Modal
                    title="QR-код для авторизации в Telegram"
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
                        description="Отсканируйте QR-код через приложение Telegram для авторизации"
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

            {passwordModalVisible && (
                <Modal
                    title="Двухфакторная аутентификация"
                    open={passwordModalVisible}
                    onOk={handleSubmitPassword}
                    onCancel={() => {
                        setPasswordModalVisible(false);
                        if (authService) {
                            authService.closeConnection();
                        }
                    }}
                    okText="Отправить"
                    cancelText="Отмена"
                    okButtonProps={{style: {color: "black"}}}
                >
                    <p>Введите пароль для двухфакторной аутентификации:</p>
                    <Input.Password
                        value={password2FA}
                        onChange={(e) => setPassword2FA(e.target.value)}
                        placeholder="Пароль 2FA"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleSubmitPassword();
                            }
                        }}
                    />
                </Modal>
            )}

            {isManualOpen && (
                <Modal
                    title="Руководство по настройке Telegram UserBot"
                    open={isManualOpen}
                    onCancel={handleCancel}
                    footer={null}
                    width={700}
                >
                    <Title
                        style={{
                            fontSize: '16px',
                        }}>
                        1. Создание Telegram API
                    </Title>
                    <Paragraph>
                        Чтобы получить Telegram API, вам нужно зарегистрировать приложение Marusia на портале
                        разработки Telegram и получить api_id и api_hash. Это нужно для создания пользовательского
                        бота взаимодействующего с Telegram.
                    </Paragraph>
                    <Title
                        style={{
                            fontSize: '14px',
                        }}>
                        Процесс получения API:
                    </Title>
                    <Paragraph
                        code={true}
                        style={{
                            whiteSpace: 'pre-wrap',
                            display: 'block',
                            fontSize: '16px',
                        }}
                    >
                        1. Перейдите на портал разработки Telegram:{'\n'}
                        Посетите сайт <a href="https://my.telegram.org/apps" target="_blank" rel="noopener noreferrer">https://my.telegram.org/apps</a>.{'\n'}
                        2. Авторизуйтесь:{'\n'}
                        Войдите в свой аккаунт Telegram, указав свой номер телефона и подтвердив код из SMS или
                        Telegram сообщения.{'\n'}
                        3. Создайте новое приложение:{'\n'}
                        Перейдите в раздел "API development tools" и создайте новое приложение, заполнив форму,
                        указав название (например Marusia), платформу (например, "Debian") и короткое описание
                        (например, "UserBot").{'\n'}
                        4. Получите api_id и api_hash:{'\n'}
                        После создания приложения вам будут предоставлены уникальные api_id и api_hash.{'\n'}
                    </Paragraph>
                    <Title
                        style={{
                            fontSize: '16px',
                        }}>
                        2. Проверка двухфакторной аутентификации 2FA
                    </Title>
                    <Paragraph
                        code={true}
                        style={{
                            whiteSpace: 'pre-wrap',
                            display: 'block',
                            fontSize: '16px',
                        }}
                    >
                        Важно! Если в настройках конфиденциальности вашего Telegram-аккаунта включена двухэтапная аутентификация
                        (настоятельно рекомендуется это сделать), то для дальнейшей настройки пользовательского бота,
                        вам потребуется указать пароль 2FA (пароль двухфакторной аутентификации).{'\n'}
                        Если вы не уверены что помните его, перейдите на вашем устройстве в раздел "Настройки"{'\n'}
                        - "Конфедициальность"{'\n'}
                        - "Облачный пароль"{'\n'}
                        и убедитесь что вы его помните свой пароль 2FA или восстановите его.{'\n'}
                    </Paragraph>
                </Modal>
            )}
        </div>
    );
};