import React, {useEffect, useState, useRef, useCallback} from "react";
import {showErrorNotification, showNotification} from "../../hotification/showNotification";
import {Button, Slider, Table, Modal, Card, Row, Col, Typography, Space, Spin, message, Progress, QRCode, Tour, FloatButton} from "antd";
import {
    CreditCardOutlined,
    DollarOutlined,
    CopyOutlined,
    ClockCircleOutlined,
    CheckCircleOutlined,
    ExclamationCircleOutlined,
    PlayCircleOutlined,
    QuestionCircleOutlined
} from "@ant-design/icons";
import {paymentSSEManager} from './paymentSSEManager';
import {getTourPanelState, setTourPanelState} from "../../../utils/cookieUtils";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {checkPayAvailability, createCryptoPayment, fetchCurrencies, getUserTariff} from "./payUtils";
import {useTranslation} from "react-i18next";

const {Text, Title} = Typography;

export function Billing({refreshUserData}) {
    const {t} = useTranslation();
    const [payment, setPayment] = useState({
        month: 1,
        discount: 0,
        value: 0,
    });
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [billingHistory, setBillingHistory] = useState([]);

    // Состояния для работы с криптовалютами
    const [showCurrencyModal, setShowCurrencyModal] = useState(false);
    const [currencies, setCurrencies] = useState([]);
    const [loadingCurrencies, setLoadingCurrencies] = useState(false);
    const [showAllCurrencies, setShowAllCurrencies] = useState(false);

    // Состояния для работы с платежными данными
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentData, setPaymentData] = useState(null);
    const [paymentStatus, setPaymentStatus] = useState('pending');
    const [timeLeft, setTimeLeft] = useState(0);

    // Новое состояние: доступность сервиса оплаты
    const [isPaymentServiceAvailable, setIsPaymentServiceAvailable] = useState(null);

    // Состояния для Tour
    const [tourVisible, setTourVisible] = useState(false);
    const [current, setCurrent] = useState(0);
    const [tourPanelVisible, setTourPanelVisible] = useState(getTourPanelState('billing')); // Состояние для видимости панели


    // Рефы для управления устаревшими таймерами (оставляем для обратной совместимости)
    const timerRef = useRef(null);
    const eventSourceRef = useRef(null);
    const pollingIntervalRef = useRef(null);

    // Refs для Tour targets
    const billingHeaderRef = useRef(null);
    const paymentSliderRef = useRef(null);
    const paymentInfoRef = useRef(null);
    const paymentButtonRef = useRef(null);
    const historyTableRef = useRef(null);

    const fetchData = useCallback(async () => {
        try {
            const data = await getUserTariff()

            if (data.status === "error") {
                showErrorNotification(t("billingErrorPaymentData") || "Ошибка получения данных оплаты",
                    t("billingErrorServerInternal") || "Внутренняя ошибка сервера, попробуйте позже!");
            } else {
                setPayment({
                    currency: data.Currency,
                    month: data.MonthCost,
                    discounts: data.Discounts,
                    messages: data.Messages,
                    end: data.EndDate,
                    value: 1,
                });
            }
            // Сохраняем историю платежей, если она есть
            if (data.Billing && Array.isArray(data.Billing)) {
                setBillingHistory(data.Billing);
            }
        } catch (error) {
            showErrorNotification(t("error") || "Ошибка", t("billingErrorUserData") || "Не удалось загрузить данные пользователя");
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        const fetchTariff = async () => {
            await fetchData();
        };

        fetchTariff();
    }, [fetchData]);

    useEffect(() => {
        const fetchCurrenciesData = async () => {
            try {
                await fetchCurrencies(setLoadingCurrencies, setCurrencies);
            } catch (error) {
                console.error('Ошибка загрузки валют при инициализации:', error);
                showErrorNotification(t("billingErrorLoadCurrencies") || "Ошибка загрузки валют", error.message);
            }
        };

        fetchCurrenciesData();
    }, [t]);

    const onChangePaymentSlider = (newValue) => {
        const newValues = {...payment, value: newValue};
        setPayment(newValues);
    };

    // Создаем marks только если userData доступен
    const getMarks = () => {
        // if (!userData || !userData.CurrencyName) return {};

        const calculateFinalPrice = (months) => {
            const basePrice = payment.month * months;
            // Используем calculateDiscount для получения скидки
            const discountAmount = calculateDiscount(months);
            return basePrice - discountAmount; // Вычитаем скидку из базовой цены
        };

        return {
            1: {label: <strong> {payment.month} {payment.currency} </strong>},
            3: {
                // style: {color: "#395a00"},
                style: {color: "var(--text-color)"},
                // label: <strong> {(payment.month * 3) - payment.discount * 2} {userData.CurrencyName}</strong>,
                label: <strong> {calculateFinalPrice(3)} {payment.currency}</strong>,
            },
            6: {
                // style: {color: "#629704"},
                style: {color: "var(--text-color)"},
                // label: <strong> {(payment.month * 6) - payment.discount * 9} {userData.CurrencyName}</strong>,
                label: <strong> {calculateFinalPrice(6)} {payment.currency}</strong>,
            },
            9: {
                // style: {color: "#3aa100"},
                style: {color: "var(--text-color)"},
                // label: <strong> {(payment.month * 9) - payment.discount * 12} {userData.CurrencyName}</strong>,
                label: <strong> {calculateFinalPrice(9)} {payment.currency}</strong>,
            },
            12: {
                // style: {right: -90, color: "#1bff00"},
                style: {right: -90, color: "var(--text-color)"},
                // label: <strong> {(payment.month * 12) - payment.discount * 20} {userData.CurrencyName}</strong>,
                label: <strong> {calculateFinalPrice(12)} {payment.currency}</strong>,
            },
        };
    };

    const calculateDiscount = (months) => {
        if (!payment || !payment.discounts) return 0;
        // payment.discounts — это объект вида { "3": 10.00, "6": 45.00, ... }
        return payment.discounts[months] || 0;
    };

    const addMonthsAndFormat = (dateString, monthsToAdd) => {
        if (!dateString || typeof monthsToAdd !== 'number') {
            return t("billingInvalidDateOrMonths") || "Неверная дата или количество месяцев";
        }
        try {
            const date = new Date(dateString); // Преобразуем строку в дату
            date.setMonth(date.getMonth() + monthsToAdd); // Добавляем месяцы

            // Форматируем дату в YYYY-MM-DD
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0'); // Месяцы от 0 до 11, добавляем 1
            const day = String(date.getDate()).padStart(2, '0');

            return `${year}-${month}-${day}`;
        } catch (error) {
            console.error("Ошибка обработки даты:", error);
            return t("billingDateError") || "Ошибка даты";
        }
    };

    // Функция для получения правильного окончания слова "месяц"
    const getMonthSuffix = (value) => {
        if (value === undefined || value === null) return '';
        const val = Math.abs(value) % 100;
        const num = val % 10;
        if (val > 10 && val < 20) return t("billingMonthPlural2") || 'месяцев'; // для 11-19
        if (num > 1 && num < 5) return t("billingMonthPlural1") || 'месяца';   // для 2, 3, 4
        if (num === 1) return t("billingMonthSingular") || 'месяц';            // для 1
        return t("billingMonthPlural2") || 'месяцев';                         // для 0, 5, 6, 7, 8, 9
    };

    // Функция форматирования для tooltip
    const tooltipFormatter = (value) => {
        if (value === undefined || value === null) return '';
        return `${value} ${getMonthSuffix(value)}`;
    };

    // Функция для получения текущей цены в зависимости от выбранного периода
    const getCurrentPrice = () => {
        const months = payment.value;
        const basePrice = payment.month * months;
        const discountAmount = calculateDiscount(months);
        return basePrice - discountAmount;
    };

    // Убедитесь, что передаете необходимые зависимости в функцию
    const handleCreateCryptoPayment = async (currency, network) => {
        try {
            const paymentResult = await createCryptoPayment(
                currency,
                network,
                getCurrentPrice,
                checkPayAvailability
            );

            // Обрабатываем ответ от /create-payment
            if (paymentResult.orderId) {
                // Устанавливаем данные для отображения
                setPaymentData(paymentResult);
                setPaymentStatus('pending');

                // Настраиваем колбэки для SSE менеджера
                paymentSSEManager.setCallbacks({
                    onPaymentUpdate: (data) => {
                        setPaymentData(prevData => ({
                            ...prevData,
                            ...data,
                            receivedAmount: data.currentReceivedAmount || data.receivedAmount || 0,
                            confirmations: data.currentConfirmations || data.confirmations || 0,
                            dbReceivedAmount: data.receivedAmount || 0,
                            dbConfirmations: data.confirmations || 0,
                            currentReceivedAmount: data.currentReceivedAmount || 0,
                            currentConfirmations: data.currentConfirmations || 0,
                            isPartialPayment: data.isPartialPayment || false,
                            updatedAt: data.updatedAt || (data.lastUpdateTime ? new Date(data.lastUpdateTime * 1000).toISOString() : undefined)
                        }));
                    },
                    onStatusUpdate: (status) => {
                        setPaymentStatus(status);
                    },
                    onTimerUpdate: (timeLeft) => {
                        setTimeLeft(timeLeft);
                    },
                    onPaymentComplete: (success) => {
                        setShowPaymentModal(false);
                        if (success && refreshUserData) refreshUserData();
                        if (success) fetchData();
                    },
                    onError: (title, message) => {
                        showErrorNotification(title, message);
                    },
                    onConnectionOpen: () => {
                    },
                    onConnectionClose: () => {
                    },
                    onNotification: (notification) => {
                        // Обрабатываем уведомления из PaymentSSEManager
                        if (notification.type === 'error') {
                            showErrorNotification(notification.title, notification.message);
                        } else {
                            showNotification(notification.title, notification.message, notification.duration);
                        }
                    }
                });

                // Подключаемся к отслеживанию статуса платежа через SSE менеджер
                await paymentSSEManager.connect(paymentResult.orderId);

                // Показываем модальное окно с данными для оплаты
                setShowPaymentModal(true);

                // Обработка поля reused для улучшения UX
                if (paymentResult.reused) {
                    showNotification(
                        t("billingActivePaymentFound") || "Активный платёж найден",
                        t("billingTransferAmount", {amount: paymentResult.amount, currency: paymentResult.currency}) || `Переведите ${paymentResult.amount} ${paymentResult.currency} на указанный адрес`
                    );
                } else {
                    showNotification(
                        t("billingInvoiceCreated") || "Счёт для оплаты создан",
                        t("billingTransferAmount", {amount: paymentResult.amount, currency: paymentResult.currency}) || `Переведите ${paymentResult.amount} ${paymentResult.currency} на указанный адрес`
                    );
                }
            }
        } catch (error) {
            console.error('Ошибка при создании платежа:', error);
        }
    };

    // Обработчик выбора валюты - теперь сразу создает платеж
    const handleCurrencySelect = async (currencyData) => {
        try {
            setShowCurrencyModal(false);
            setIsProcessing(true);

            // Создаем платеж через новый метод
            await handleCreateCryptoPayment(currencyData.symbol, currencyData.network);

        } catch (error) {
            // Ошибка уже обработана in handleCreateCryptoPayment
        } finally {
            setIsProcessing(false);
        }
    };


    // Обработчик нажатия кнопки "Оплатить"
    const handlePaymentSubmit = async () => {
        try {
            setIsProcessing(true);

            // Получаем список криптовалют и показываем модальное окно выбора
            await fetchCurrencies(setLoadingCurrencies, setCurrencies);
            setShowCurrencyModal(true);
            setShowAllCurrencies(false); // Сбрасываем состояние при открытии модального окна

        } catch (error) {
            showErrorNotification(
                t("error") || "Ошибка",
                error.message || t("billingErrorLoadPaymentData") || "Произошла ошибка при загрузке данных для оплаты"
            );
        } finally {
            setIsProcessing(false);
        }
    };

    // Функция для получения отфильтрованного списка валют
    const getDisplayedCurrencies = () => {
        if (showAllCurrencies) {
            return currencies;
        }
        // Показываем только USDT валюты
        return currencies.filter(currency => currency.symbol === 'USDT');
    };

    // TODO : временно скрыта
    // Обработчик кнопки "Оплатить в другой криптовалюте"
    // const handleShowAllCurrencies = () => {
    //     setShowAllCurrencies(true);
    // };

    // Определяем колонки для таблицы
    const columns = [
        {
            title: t("billingTableDate") || 'Дата платежа',
            dataIndex: 'Date',
            key: 'date',
            render: (text) => {
                const date = new Date(text);
                return date.toLocaleString('ru-RU');
            }
        },
        {
            title: t("billingTableAmount") || 'Сумма платежа',
            dataIndex: 'Payment',
            key: 'payment',
            render: (text) => `${text} ${payment.currency}`
        },
        {
            title: t("billingTableCurrency") || 'Валюта платежа',
            key: 'currency',
            render: () => payment.currency
        },
        {
            title: t("billingTableMonths") || 'Оплачено месяцев',
            dataIndex: 'Months',
            key: 'months'
        },
        {
            title: t("billingTableDiscount") || 'Размер скидки',
            dataIndex: 'Discount',
            key: 'discount',
            render: (text) => `${text} ${payment.currency}`
        }
    ];

    // Функция для очистки ресурсов при размонтировании компонента
    useEffect(() => {
        return () => {
            // Очищаем SSE менеджер
            paymentSSEManager.cleanup();

            // Очищаем устаревшие рефы (на случай если остались)
            if (timerRef.current) {
                // eslint-disable-next-line react-hooks/exhaustive-deps
                clearInterval(timerRef.current);
            }
            if (eventSourceRef.current) {
                // eslint-disable-next-line react-hooks/exhaustive-deps
                eventSourceRef.current.close();
            }
            if (pollingIntervalRef.current) {
                // eslint-disable-next-line react-hooks/exhaustive-deps
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, []);


    // Функция для копирования адреса в буфер обмена
    const copyToClipboard = async (text, description = 'Текст') => {
        try {
            await navigator.clipboard.writeText(text);
            message.success(`${description} скопирован в буфер обмена`);
        } catch (error) {
            console.error('Ошибка копирования:', error);
            message.error('Не удалось скопировать в буфер обмена');
        }
    };

    // Функция для форматирования времени
    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    // Функция для получения статуса платежа по цвету и иконке
    const getPaymentStatusDisplay = (status) => {
        switch (status) {
            case 'pending':
                return {
                    color: '#faad14',
                    icon: <ClockCircleOutlined/>,
                    text: t("billingStatusPending") || 'Ожидание платежа'
                };
            case 'partial':
                return {
                    color: '#1890ff',
                    icon: <ExclamationCircleOutlined/>,
                    text: t("billingStatusPartial") || 'Частичное поступление'
                };
            case 'confirmed':
                return {
                    color: '#52c41a',
                    icon: <CheckCircleOutlined/>,
                    text: t("billingStatusConfirmed") || 'Подтверждён'
                };
            case 'failed':
                return {
                    color: '#ff4d4f',
                    icon: <ExclamationCircleOutlined/>,
                    text: t("billingStatusFailed") || 'Ошибка'
                };
            case 'expired':
                return {
                    color: '#d9d9d9',
                    icon: <ClockCircleOutlined/>,
                    text: t("billingStatusExpired") || 'Истёк'
                };
            default:
                return {
                    color: '#d9d9d9',
                    icon: <ClockCircleOutlined/>,
                    text: t("billingStatusUnknown") || 'Неизвестно'
                };
        }
    };

    const handleCloseConfirm = async () => {
        setShowPaymentModal(false);
        // Очищаем SSE менеджер
        paymentSSEManager.cleanup();
        if (refreshUserData) refreshUserData();
        await fetchData();
    }

    // Функция сохранения PDF
    const handleSavePdf = async () => {
        const element = document.getElementById("payment-modal-content");
        if (!element) {
            message.error(t("billingErrorNoContent") || "Не найден контент для сохранения");
            return;
        }
        const canvas = await html2canvas(element, {scale: 2});
        // const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        // Размеры изображения в px
        // const imgProps = pdf.getImageProperties(imgData);
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;

        // Размеры изображения в PDF
        const pdfImgWidth = pageWidth;
        const pdfImgHeight = (imgHeight * pdfImgWidth) / imgWidth;

        let position = 0;
        let remainingHeight = pdfImgHeight;

        // Высота одной страницы в px относительно canvas
        const pageHeightPx = (imgWidth / pdfImgWidth) * pageHeight;

        while (remainingHeight > 0) {
            // Обрезаем нужную часть canvas
            const pageCanvas = document.createElement("canvas");
            pageCanvas.width = imgWidth;
            pageCanvas.height = Math.min(pageHeightPx, imgHeight - position);

            const ctx = pageCanvas.getContext("2d");
            ctx.drawImage(
                canvas,
                0, position, imgWidth, pageCanvas.height,
                0, 0, imgWidth, pageCanvas.height
            );

            const pageImgData = pageCanvas.toDataURL("image/png");
            const pagePdfHeight = (pageCanvas.height * pdfImgWidth) / imgWidth;

            pdf.addImage(pageImgData, "PNG", 0, 0, pdfImgWidth, pagePdfHeight);

            remainingHeight -= pageHeight;
            position += pageHeightPx;

            if (remainingHeight > 0) {
                pdf.addPage();
            }
        }

        pdf.save("payment.pdf");
    };

    // Функция для запуска тура
    const startTour = () => {
        setTourVisible(true);
        setCurrent(0);
        setTourPanelState('billing', false); // Сохраняем состояние скрытой панели
    };

    // Функция для показа панели Tour при клике на FloatButton
    const showTourPanel = () => {
        setTourPanelVisible(true);
        setTourPanelState('billing', true); // Сохраняем состояние показанной панели
    };

    const hideTourPanel = () => {
        setTourPanelVisible(false);
        setTourPanelState('billing', false); // Сохраняем состояние скрытой панели
    };

    // Определяем шаги тура
    const steps = [
        {
            title: t("billingTourWelcomeTitle") || '💳 Добро пожаловать в систему управления подпиской',
            description: t("billingTourWelcomeDesc") || 'Этот интерфейс позволяет управлять вашими тарифами, просматривать историю платежей и продлевать подписку на услуги ИИ-агента.',
            target: () => billingHeaderRef.current,
        },
        {
            title: t("billingTourPeriodTitle") || '📊 Выбор периода подписки',
            description: t("billingTourPeriodDesc") || 'Используйте слайдер для выбора периода подписки. Более длительные периоды включают скидки и более выгодные предложения.',
            target: () => paymentSliderRef.current,
        },
        {
            title: t("billingTourInfoTitle") || '📋 Информация о платеже',
            description: t("billingTourInfoDesc") || 'Здесь отображается детальная информация о выбранном пакете: количество месяцев, сообщений и размер скидки.',
            target: () => paymentInfoRef.current,
        },
        {
            title: t("billingTourPaymentTitle") || '💰 Кнопка оплаты',
            description: t("billingTourPaymentDesc") || 'Нажмите эту кнопку для перехода к процессу оплаты. Будет предложен выбор криптовалют для платежа.',
            target: () => paymentButtonRef.current,
        },
        // Условно добавляем шаг с историей платежей только если таблица существует
        ...(billingHistory && billingHistory.length > 0 && billingHistory.some(item => item.Date) ? [{
            title: t("billingTourHistoryTitle") || '📚 История платежей',
            description: t("billingTourHistoryDesc") || 'В этой таблице отображается вся история ваших платежей с детализацией по датам, суммам и полученным услугам.',
            target: () => {
                // Добавляем проверку на существование элемента
                if (historyTableRef.current) {
                    return historyTableRef.current;
                }
                // Возвращаем альтернативный элемент если основной не найден
                return document.querySelector('.ant-table-wrapper') || paymentButtonRef.current;
            },
        }] : []),
        {
            title: t("billingTourCompleteTitle") || '✅ Готово к использованию!',
            description: t("billingTourCompleteDesc") || 'Теперь вы знаете, как управлять своей подпиской. Выберите подходящий тариф и начните пользоваться расширенными возможностями!',
            target: () => paymentButtonRef.current,
        },
    ];

    // Восстанавливаем состояние тура из cookie при монтировании компонента
    useEffect(() => {
        // Не восстанавливаем tourVisible из cookie - тур должен запускаться только по клику
        // Панель тура остается видимой по умолчанию
    }, []);

    // Сохраняем состояние тура в cookie при каждом изменении tourVisible
    useEffect(() => {
        if (tourVisible) {
            setTourPanelState('billing', false); // Скрываем панель когда тур запущен
        }
    }, [tourVisible]);

    if (loading) {
        return <div className="notifications-loading">
            <Spin size="large" />
            <Text className="loading-text">
                {t("billingLoadingText") || "Загрузка данных..."}
            </Text>
        </div>
    }

    // Если сервис оплаты недоступен — показываем информационный блок
    if (isPaymentServiceAvailable === false) {
        return (
            <div className="create-model-container">
                <div className="section-title">
                    <CreditCardOutlined/>
                    Управление подпиской
                </div>
                <div className="section-description">
                    {t("billingManageDesc") || "Управляйте тарифами, просматривайте историю платежей и продлевайте подписку на услуги агента"}
                </div>
                <b>{t("billingServiceUnavailable") || "Сервис оплаты недоступен"}</b>
            </div>
        );
    }

    return (
        <div className="create-model-container">
            <div className="section-title" ref={billingHeaderRef}>
                <CreditCardOutlined/>
                {t("billingManageSubscription") || "Управление подпиской"}
            </div>
            <div className="section-description">
                {t("billingManageDesc") || "Управляйте тарифами, просматривайте историю платежей и продлевайте подписку на услуги агента"}
            </div>

            <div className="tour-layout">
                <div className="tour-content">
                    <div className="container">
                        <h2>{t("billingNewPayment") || "Новый платёж"}</h2>
                        {payment && payment.month !== null && (
                            <>
                                <div className="bill-slider" ref={paymentSliderRef}>
                                    <Slider
                                        min={1}
                                        max={12}
                                        marks={getMarks()}
                                        step={null}
                                        // style={{width: "90%", margin: "0 auto"}}
                                        onChange={onChangePaymentSlider}
                                        value={payment.value}
                                        tooltip={{formatter: tooltipFormatter}}
                                    />
                                </div>

                                <div className="billing-data" ref={paymentInfoRef}>
                                    <p>{t("billingPaymentFor") || "Оплата за"} <b>{payment.value}</b> {getMonthSuffix(payment.value)}</p>
                                    {payment.value !== 1 && (
                                        <p>{t("billingBenefit") || "Выгода"} <b>{calculateDiscount(payment.value)}</b> {payment.currency}</p>
                                    )}
                                    {payment.end && (
                                        <p>{t("billingSubscriptionEnd") || "Окончание подписки"} <b>{addMonthsAndFormat(payment.end, payment.value)}</b></p>
                                    )}
                                </div>

                                <Button
                                    type="primary"
                                    onClick={handlePaymentSubmit}
                                    loading={isProcessing}
                                    // style={{marginTop: '16px'}}
                                    style={{
                                        color: "black",
                                    }}
                                    ref={paymentButtonRef}
                                >
                                    {t("billingPay") || "Оплатить"} {getCurrentPrice()} {payment.currency}
                                </Button>
                            </>
                        )}

                        {billingHistory && billingHistory.length > 0 && billingHistory.some(item => item.Date) && (
                            <div ref={historyTableRef}>
                                <h2>{t("billingPaymentHistory") || "История платежей"}</h2>
                                <Table
                                    dataSource={billingHistory}
                                    columns={columns}
                                    rowKey={(record, index) => `payment-${index}`}
                                    pagination={false}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Панель управления Tour справа - показывается только когда tourPanelVisible = true */}
                {tourPanelVisible && (
                    <div className="tour-controls tour-primary">
                        <div className="tour-controls-header">
                            <PlayCircleOutlined className="tour-controls-icon" />
                            <h3 className="tour-controls-title">
                                {t("interactiveTourTitle") || "Интерактивный обзор"}
                            </h3>
                            <p className="tour-controls-subtitle">
                                {t("billingTourSubtitle") || "Изучите интерфейс управления подпиской пошагово"}
                            </p>
                        </div>

                        <div className="tour-start-button">
                            <Button
                                type="primary"
                                block
                                size="large"
                                onClick={startTour}
                            >
                                {t("startTour") || "🚀 Начать тур"}
                            </Button>
                        </div>

                        {tourVisible && (
                            <div className="tour-progress">
                                <div className="tour-progress-step">
                                    <span className="tour-progress-step-text">
                                        {t("tourStep", {current: current + 1, total: steps.length}) || `Шаг ${current + 1} из ${steps.length}`}
                                    </span>
                                </div>
                                <div className="tour-progress-bar">
                                    <div
                                        className="tour-progress-fill"
                                        style={{width: `${((current + 1) / steps.length) * 100}%`}}
                                    />
                                </div>
                                <div className="tour-progress-title">
                                    {steps[current]?.title}
                                </div>
                            </div>
                        )}

                        <div className="tour-info">
                            <div className="tour-info-title">{t("tourWhatYouLearn") || "📋 Что вы изучите:"}</div>
                            <ul className="tour-info-list">
                                <li>{t("billingTourLearn1") || "Выбор периода подписки"}</li>
                                <li>{t("billingTourLearn2") || "Расчёт скидок и выгоды"}</li>
                                <li>{t("billingTourLearn3") || "Процесс криптооплаты"}</li>
                                <li>{t("billingTourLearn4") || "Просмотр истории платежей"}</li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>

            {/* Модальное окно для выбора криптовалюты */}
            <Modal
                title={
                    <Space>
                        <DollarOutlined/>
                        <Text>{t("billingSelectCrypto") || "Выберите криптовалюту для оплаты"}</Text>
                    </Space>
                }
                open={showCurrencyModal}
                onCancel={() => setShowCurrencyModal(false)}
                footer={null}
                width={800}
                centered
                
            >
                <div style={{marginBottom: 16}}>
                    <Text type="secondary">
                        {t("billingAmountToPay") || "Сумма к оплате"}: <strong>{getCurrentPrice()} {payment.currency}</strong>
                    </Text>
                </div>

                {loadingCurrencies ? (
                    <div style={{textAlign: 'center', padding: '40px 0'}}>
                        <Spin size="large"/>
                        <div style={{marginTop: 16}}>
                            <Text>{t("billingLoadingCurrencies") || "Загрузка доступных криптовалют..."}</Text>
                        </div>
                    </div>
                ) : (
                    <>
                        {!showAllCurrencies && (
                            <div style={{marginBottom: 16}}>
                                <Title level={4} style={{margin: 0, color: 'var(--text-color)'}}>
                                    {t("billingPaymentInUSDT") || "Оплата в USDT"}
                                </Title>
                                <Text type="secondary" style={{fontSize: '14px'}}>
                                    {t("billingSelectNetworkUSDT") || "Выберите удобную сеть для оплаты в USDT"}
                                </Text>
                            </div>
                        )}

                        {showAllCurrencies && (
                            <div style={{marginBottom: 16}}>
                                <Title level={4} style={{margin: 0, color: 'var(--text-color)'}}>
                                    {t("billingAllCurrencies") || "Все доступные криптовалюты"}
                                </Title>
                                <Text type="secondary" style={{fontSize: '14px'}}>
                                    {t("billingSelectAnyCrypto") || "Выберите любую поддерживаемую криптовалюту"}
                                </Text>
                            </div>
                        )}

                        <Row gutter={[8, 8]}>
                            {getDisplayedCurrencies().map((currency, index) => (
                                <Col xs={20} sm={10} md={6} key={`${currency.symbol}-${currency.network}-${index}`}>
                                    <Card
                                        hoverable
                                        onClick={() => handleCurrencySelect(currency)}
                                        style={{
                                            cursor: 'pointer',
                                            border: '1px solid #d9d9d9',
                                            transition: 'all 0.3s ease'
                                        }}
                                        styles={{body: {padding: showAllCurrencies ? '14px' : '10px'}}}
                                    >
                                        {showAllCurrencies ? (
                                            // Полная информация для всех криптовалют
                                            <Space orientation="vertical" style={{width: '100%'}}>
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center'
                                                }}>
                                                    <Title level={4} style={{
                                                        margin: 0,
                                                        color: 'var(--text-color)',
                                                    }}>
                                                        {currency.symbol}
                                                    </Title>
                                                    <Text type="secondary" style={{fontSize: '12px'}}>
                                                        {currency.network}
                                                    </Text>
                                                </div>

                                                <Text style={{color: 'var(--text-color)'}}>
                                                    {t("billingNetwork") || "Сеть"}: {currency.name}
                                                </Text>

                                                <div style={{fontSize: '12px'}}>
                                                    <Text type="secondary">
                                                        {t("billingMinDeposit") || "Мин. депозит"}: {currency.minDeposit} {currency.symbol}
                                                    </Text>
                                                </div>

                                                <div style={{
                                                    marginTop: '8px',
                                                    padding: '4px 8px',
                                                    backgroundColor: 'var(--bg-color)',
                                                    borderRadius: '4px',
                                                    textAlign: 'center'
                                                }}>
                                                    <Text style={{fontSize: '11px', color: '#666'}}>
                                                        {t("billingNetwork") || "Сеть"}: {currency.network}
                                                    </Text>
                                                </div>
                                            </Space>
                                        ) : (
                                            // Компактный вид для USDT
                                            <div style={{textAlign: 'center'}}>
                                                <Title level={4}
                                                       style={{
                                                           margin: '0 0 8px 0',
                                                           color: 'var(--text-color)',
                                                       }}>
                                                    {currency.network}
                                                </Title>

                                                <Text type="secondary" style={{fontSize: '13px'}}>
                                                    {t("billingMinDeposit") || "Мин. депозит"}: {currency.minDeposit} USDT
                                                </Text>
                                            </div>
                                        )}
                                    </Card>
                                </Col>
                            ))}
                        </Row>

                        {/*TODO: временно скрыта*/}
                        {/* Кнопка для показа всех валют */}
                        {/*{!showAllCurrencies && currencies.length > 0 && (*/}
                        {/*    <div style={{*/}
                        {/*        textAlign: 'center',*/}
                        {/*        marginTop: 24,*/}
                        {/*        paddingTop: 16,*/}
                        {/*        borderTop: '1px solid #f0f0f0'*/}
                        {/*    }}>*/}
                        {/*        <Button*/}
                        {/*            type="default"*/}
                        {/*            size="large"*/}
                        {/*            onClick={handleShowAllCurrencies}*/}
                        {/*            style={{*/}
                        {/*                height: '40px',*/}
                        {/*                borderRadius: '6px',*/}
                        {/*                fontWeight: 500*/}
                        {/*            }}*/}
                        {/*        >*/}
                        {/*            Оплатить в другой криптовалюте*/}
                        {/*        </Button>*/}
                        {/*    </div>*/}
                        {/*)}*/}
                    </>
                )}

                {currencies.length === 0 && !loadingCurrencies && (
                    <div style={{textAlign: 'center', padding: '40px 0'}}>
                        <Text type="secondary">
                            {t("billingNoCurrencies") || "Нет доступных криптовалют для оплаты"}
                        </Text>
                    </div>
                )}
            </Modal>

            {/* Модальное окно для платежа криптовалют */}
            <Modal
                title={
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '95%'}}>
                        <Space>
                            <DollarOutlined/>
                            <Text>{t("billingCryptoPayment") || "Криптовалютный платеж"}</Text>
                        </Space>

                        {/* Кнопка сохранить в PDF */}
                        <Button
                            style={{color: "black"}}
                            key="save" type="primary" onClick={handleSavePdf}>
                            {t("billingSavePDF") || "Сохранить в PDF"}
                        </Button>

                        {/* Кнопка закрыть только если платёж подтверждён */}
                        {paymentStatus === 'confirmed' && (
                            <Button key="close" type="default" onClick={handleCloseConfirm}>
                                {t("billingClose") || "Закрыть"}
                            </Button>
                        )}
                    </div>
                }
                open={showPaymentModal}
                onCancel={() => setShowPaymentModal(false)}
                footer={null}
                width={700}
                centered
                mask={{ closable: false }}
                styles={{
                    body: {
                        maxHeight: '80vh',
                        overflowY: 'auto'
                    }
                }}
            >
                {paymentData ? (
                    <div id="payment-modal-content">
                        <div style={{padding: '12px 0'}}>
                            {/* Статус платежа */}
                            <div style={{
                                textAlign: 'center',
                                marginBottom: 16,
                                padding: '8px',
                                backgroundColor: getPaymentStatusDisplay(paymentStatus).color + '15',
                                borderRadius: '6px',
                                border: `1px solid ${getPaymentStatusDisplay(paymentStatus).color}`
                            }}>
                                <Space>
                                    {getPaymentStatusDisplay(paymentStatus).icon}
                                    <Text strong style={{color: getPaymentStatusDisplay(paymentStatus).color}}>
                                        {getPaymentStatusDisplay(paymentStatus).text}
                                    </Text>
                                </Space>
                            </div>

                            {/* Основная информация о платеже */}
                            <div style={{
                                background: 'var(--bg-color)',
                                padding: '16px',
                                borderRadius: '8px',
                                marginBottom: '16px'
                            }}>
                                <Title level={5} style={{
                                    textAlign: 'center',
                                    margin: '0 0 16px 0',
                                    color: 'var(--text-color)'
                                }}>
                                    Перевод {paymentData.currency} ({paymentData.network})
                                </Title>

                                {/* Сумма к оплате */}
                                <div style={{
                                    textAlign: 'center',
                                    marginBottom: '16px',
                                    padding: '12px',
                                    backgroundColor: 'var(--bg-color)',
                                    borderRadius: '8px',
                                    border: '2px solid var(--link-color)'
                                }}>
                                    <Text type="secondary"
                                          style={{fontSize: '14px', display: 'block', marginBottom: '4px'}}>
                                        Точная сумма к переводу
                                    </Text>
                                    <div style={{
                                        fontSize: '24px',
                                        fontWeight: 'bold',
                                        color: 'var(--link-color)',
                                        marginBottom: '4px'
                                    }}>
                                        {paymentData.amount} {paymentData.currency}
                                    </div>
                                    <Text type="secondary" style={{fontSize: '12px'}}>
                                        ≈ ${paymentData.amountUsd || 'N/A'} USD
                                    </Text>
                                </div>

                                {/* Адрес для перевода */}
                                <div style={{
                                    marginBottom: '16px',
                                    padding: '16px',
                                    backgroundColor: 'var(--bg-color)',
                                    borderRadius: '8px',
                                    border: '1px solid #e8e8e8'
                                }}>
                                    <div style={{marginBottom: '12px'}}>
                                        <Text strong style={{fontSize: '14px', color: 'var(--text-color)'}}>
                                            {t("billingWalletAddress") || "Адрес кошелька для перевода"}:
                                        </Text>
                                    </div>

                                    <div style={{
                                        padding: '12px',
                                        backgroundColor: 'var(--bg-color)',
                                        borderRadius: '6px',
                                        fontFamily: 'monospace',
                                        fontSize: '13px',
                                        wordBreak: 'break-all',
                                        border: '1px solid #d9d9d9',
                                        marginBottom: '8px'
                                    }}>
                                        {paymentData.depositAddress}
                                    </div>

                                    <div style={{display: 'flex', gap: '8px', justifyContent: 'center'}}>
                                        <Button
                                            style={{color: "black"}}
                                            type="primary"
                                            size="small"
                                            icon={<CopyOutlined/>}
                                            onClick={() => copyToClipboard(paymentData.depositAddress, t("billingWalletAddressShort") || 'Адрес кошелька')}
                                        >
                                            {t("billingCopyAddress") || "Копировать адрес"}
                                        </Button>
                                    </div>

                                    {/* QR-код для адреса */}
                                    <div style={{display: 'flex', justifyContent: 'center', marginTop: '16px'}}>
                                        <QRCode
                                            value={paymentData.qrCodeUri}
                                            size={180}
                                            style={{border: '1px solid #d9d9d9', borderRadius: '8px'}}
                                            // bgColor="#000000"   // фон QR-кода (тёмный)
                                            // fgColor="#fff"      // цвет самих квадратов (белый)
                                        />
                                    </div>
                                </div>

                                {/* Тег депозита (если есть) */}
                                {paymentData.depositTag && (
                                    <div style={{
                                        marginBottom: '16px',
                                        padding: '16px',
                                        backgroundColor: 'var(--bg-color)',
                                        borderRadius: '8px',
                                        border: '1px solid #ffd591'
                                    }}>
                                        <div style={{marginBottom: '8px'}}>
                                            <Text strong style={{fontSize: '14px', color: '#fa8c16'}}>
                                                {t("billingDepositTagRequired") || "Тег депозита (обязательно!)"}:
                                            </Text>
                                        </div>

                                        <div style={{
                                            padding: '8px 12px',
                                            backgroundColor: 'var(--bg-color)',
                                            borderRadius: '4px',
                                            fontFamily: 'monospace',
                                            fontSize: '14px',
                                            border: '1px solid #ffd591',
                                            marginBottom: '8px',
                                            textAlign: 'center'
                                        }}>
                                            {paymentData.depositTag}
                                        </div>

                                        <div style={{display: 'flex', gap: '8px', justifyContent: 'center'}}>
                                            <Button
                                                size="small"
                                                icon={<CopyOutlined/>}
                                                onClick={() => copyToClipboard(paymentData.depositTag, t("billingDepositTag") || 'Тег депозита')}
                                            >
                                                {t("billingCopyTag") || "Копировать тег"}
                                            </Button>
                                        </div>

                                        <div style={{marginTop: '8px', textAlign: 'center'}}>
                                            <Text style={{fontSize: '11px', color: '#fa8c16'}}>
                                                Важно: Без указания тега депозита средства могут быть потеряны!
                                            </Text>
                                        </div>
                                    </div>
                                )}

                                {/* Детали платежа */}
                                <div style={{
                                    marginBottom: '16px',
                                    padding: '12px',
                                    backgroundColor: 'var(--bg-color)',
                                    borderRadius: '6px',
                                    border: '1px solid #e8e8e8'
                                }}>
                                    <div
                                        style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                                        <Text style={{fontSize: '13px'}}>{t("billingCurrency") || "Валюта"}:</Text>
                                        <Text strong style={{fontSize: '13px'}}>{paymentData.currency}</Text>
                                    </div>

                                    <div
                                        style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                                        <Text style={{fontSize: '13px'}}>{t("billingBlockchainNetwork") || "Сеть блокчейна"}:</Text>
                                        <Text strong style={{
                                            fontSize: '13px',
                                            padding: '2px 6px',
                                            backgroundColor: 'var(--link-color)',
                                            color: 'white',
                                            borderRadius: '3px'
                                        }}>
                                            {paymentData.network}
                                        </Text>
                                    </div>

                                    <div
                                        style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                                        <Text style={{fontSize: '13px'}}>{t("billingPaymentID") || "ID платежа"}:</Text>
                                        <Text style={{fontSize: '12px', fontFamily: 'monospace'}}>
                                            {paymentData.orderId}
                                        </Text>
                                    </div>

                                    {/* Прогресс поступления средств */}
                                    {(paymentData.receivedAmount > 0 || paymentStatus === 'partial') && (
                                        <div style={{marginTop: '16px', marginBottom: '12px'}}>
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                marginBottom: '8px'
                                            }}>
                                                <Text style={{fontSize: '13px'}}>{t("billingProgressReceived") || "Прогресс поступления"}:</Text>
                                                <Text style={{fontSize: '13px'}}>
                                                    {paymentData.receivedAmount || 0} / {paymentData.amount} {paymentData.currency}
                                                </Text>
                                            </div>

                                            <Progress
                                                percent={Math.min(100, ((paymentData.receivedAmount || 0) / paymentData.amount) * 100)}
                                                strokeColor={{
                                                    '0%': paymentData.receivedAmount >= paymentData.amount ? '#52c41a' : '#faad14',
                                                    '100%': paymentData.receivedAmount >= paymentData.amount ? '#52c41a' : '#faad14',
                                                }}
                                                showInfo={true}
                                                format={(percent) => `${percent?.toFixed(1)}%`}
                                                size="small"
                                            />

                                            {paymentData.receivedAmount < paymentData.amount && paymentData.receivedAmount > 0 && (
                                                <Text style={{
                                                    fontSize: '11px',
                                                    color: '#fa8c16',
                                                    display: 'block',
                                                    marginTop: '4px'
                                                }}>
                                                    {t("billingShortage") || "Недостаёт"}: {(paymentData.amount - paymentData.receivedAmount).toFixed(6)} {paymentData.currency}
                                                </Text>
                                            )}
                                        </div>
                                    )}

                                    {/* Отображение полученной суммы */}
                                    {paymentData.receivedAmount > 0 && (
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                marginBottom: '8px'
                                            }}>
                                            <Text style={{fontSize: '13px'}}>Получено:</Text>
                                            <Text strong style={{
                                                fontSize: '13px',
                                                color: paymentData.receivedAmount >= paymentData.amount ? '#52c41a' : '#faad14'
                                            }}>
                                                {paymentData.receivedAmount} {paymentData.currency}
                                            </Text>
                                        </div>
                                    )}

                                    {/* Отображение подтверждений с прогресс баром */}
                                    {(paymentData.confirmations >= 0 || paymentData.txHash) && (
                                        <div style={{marginTop: '12px'}}>
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                marginBottom: '8px'
                                            }}>
                                                <Text style={{fontSize: '13px'}}>Подтверждения в сети:</Text>
                                                <Text strong style={{
                                                    fontSize: '13px',
                                                    color: paymentData.confirmations >= 10 ? '#52c41a' : '#faad14'
                                                }}>
                                                    {paymentData.confirmations || 0}
                                                </Text>
                                            </div>

                                            <Progress
                                                percent={Math.min(100, ((paymentData.confirmations || 0) / 10) * 100)}
                                                strokeColor={{
                                                    '0%': paymentData.confirmations >= 10 ? '#52c41a' : '#1890ff',
                                                    '100%': paymentData.confirmations >= 10 ? '#52c41a' : '#1890ff',
                                                }}
                                                showInfo={false}
                                                size="small"
                                            />

                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                marginTop: '4px'
                                            }}>
                                                <Text style={{
                                                    fontSize: '11px',
                                                    color: paymentData.confirmations >= 10 ? '#52c41a' : '#666'
                                                }}>
                                                    {paymentData.confirmations >= 10
                                                        ? 'Транзакция полностью подтверждена'
                                                        : `Ожидание подтверждений (${10 - (paymentData.confirmations || 0)} осталось)`
                                                    }
                                                </Text>

                                                {paymentData.confirmations > 0 && (
                                                    <Text style={{fontSize: '10px', color: '#999'}}>
                                                        Блоков: {paymentData.confirmations}
                                                    </Text>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Статус транзакции с улучшенным отображением */}
                                    {paymentData.txHash && (
                                        <div style={{marginTop: '12px'}}>
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                marginBottom: '8px'
                                            }}>
                                                <Text style={{fontSize: '13px'}}>Статус транзакции:</Text>
                                                <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                                                    {paymentStatus === 'confirmed' &&
                                                        <CheckCircleOutlined style={{color: '#52c41a'}}/>}
                                                    {paymentStatus === 'partial' &&
                                                        <ExclamationCircleOutlined style={{color: '#faad14'}}/>}
                                                    {paymentStatus === 'pending' && paymentData.receivedAmount > 0 &&
                                                        <ClockCircleOutlined style={{color: '#1890ff'}}/>}
                                                    {paymentStatus === 'pending' && paymentData.receivedAmount === 0 &&
                                                        <ClockCircleOutlined style={{color: '#d9d9d9'}}/>}

                                                    <Text strong style={{
                                                        fontSize: '13px',
                                                        color: getPaymentStatusDisplay(paymentStatus).color
                                                    }}>
                                                        {paymentStatus === 'confirmed' && (t("billingStatusConfirmedShort") || 'Подтверждена')}
                                                        {paymentStatus === 'partial' && (t("billingStatusPartialShort") || 'Частичная')}
                                                        {paymentStatus === 'pending' && paymentData.receivedAmount > 0 && (t("billingStatusProcessingShort") || 'В обработке')}
                                                        {paymentStatus === 'pending' && paymentData.receivedAmount === 0 && (t("billingStatusPendingShort") || 'Ожидается')}
                                                        {paymentStatus === 'failed' && (t("billingStatusFailedShort") || 'Неудачна')}
                                                        {paymentStatus === 'expired' && (t("billingStatusExpiredShort") || 'Истекла')}
                                                    </Text>
                                                </div>
                                            </div>

                                            {/* Дополнительная информация для частичного платежа */}
                                            {paymentStatus === 'partial' && (
                                                <div style={{
                                                    marginTop: '8px',
                                                    padding: '8px',
                                                    backgroundColor: 'var(--bg-color)',
                                                    borderRadius: '4px',
                                                    border: '1px solid #ffd591'
                                                }}>
                                                    <div style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        marginBottom: '4px'
                                                    }}>
                                                        <Text style={{fontSize: '12px'}}>{t("billingReceived") || "Поступило"}:</Text>
                                                        <Text strong style={{fontSize: '12px', color: '#faad14'}}>
                                                            {paymentData.currentReceivedAmount || paymentData.receivedAmount} {paymentData.currency}
                                                        </Text>
                                                    </div>
                                                    <div style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        marginBottom: '4px'
                                                    }}>
                                                        <Text style={{fontSize: '12px'}}>{t("billingCurrentConfirmations") || "Текущие подтверждения"}:</Text>
                                                        <Text strong style={{fontSize: '12px', color: '#faad14'}}>
                                                            {paymentData.currentConfirmations || paymentData.confirmations || 0} /
                                                            {t("billingBlocks") || "блоков"}
                                                        </Text>
                                                    </div>
                                                    <div style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        marginBottom: '4px'
                                                    }}>
                                                        <Text style={{fontSize: '12px'}}>{t("billingExpected") || "Ожидается"}:</Text>
                                                        <Text strong style={{fontSize: '12px', color: '#fa8c16'}}>
                                                            {(paymentData.amount - (paymentData.currentReceivedAmount || paymentData.receivedAmount)).toFixed(6)} {paymentData.currency}
                                                        </Text>
                                                    </div>
                                                    {/* Показываем данные из БД если они отличаются от текущих */}
                                                    {paymentData.dbReceivedAmount && paymentData.dbReceivedAmount !== paymentData.currentReceivedAmount && (
                                                        <div style={{
                                                            marginTop: '8px',
                                                            paddingTop: '4px',
                                                            borderTop: '1px solid #ffd591',
                                                            fontSize: '11px',
                                                            color: '#999'
                                                        }}>
                                                            <Text style={{fontSize: '11px', color: '#999'}}>
                                                                {t("billingInDB") || "В БД"}: {paymentData.dbReceivedAmount} {paymentData.currency},
                                                                {t("billingConfirmations") || "подтверждений"}: {paymentData.dbConfirmations || 0}
                                                            </Text>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Отображение хэша транзакции */}
                                    {paymentData.txHash && (
                                        <div style={{marginTop: '12px'}}>
                                            <Text style={{fontSize: '13px', display: 'block', marginBottom: '4px'}}>
                                                {t("billingTransactionHash") || "Хэш транзакции"}:
                                            </Text>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '8px',
                                                backgroundColor: 'var(--bg-color)',
                                                borderRadius: '4px',
                                                border: '1px solid #d9d9d9'
                                            }}>
                                                <Text style={{
                                                    fontSize: '11px',
                                                    fontFamily: 'monospace',
                                                    flex: 1,
                                                    wordBreak: 'break-all'
                                                }}>
                                                    {paymentData.txHash}
                                                </Text>
                                                <Button
                                                    type="text"
                                                    size="small"
                                                    icon={<CopyOutlined/>}
                                                    onClick={() => copyToClipboard(paymentData.txHash, t("billingTransactionHash") || 'Хэш транзакции')}
                                                    style={{fontSize: '10px', padding: '2px 4px'}}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Дополнительная информация о времени */}
                                    <div style={{
                                        marginTop: '12px',
                                        paddingTop: '8px',
                                        borderTop: '1px solid #f0f0f0',
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: '8px'
                                    }}>
                                        {paymentData.createdAt && (
                                            <div>
                                                <Text type="secondary" style={{fontSize: '11px', display: 'block'}}>
                                                    {t("billingCreatedAt") || "Создан"}:
                                                </Text>
                                                <Text style={{fontSize: '11px'}}>
                                                    {new Date(paymentData.createdAt).toLocaleString('ru-RU')}
                                                </Text>
                                            </div>
                                        )}

                                        {paymentData.updatedAt && (
                                            <div>
                                                <Text type="secondary" style={{fontSize: '11px', display: 'block'}}>
                                                    {t("billingUpdatedAt") || "Обновлён"}:
                                                </Text>
                                                <Text style={{fontSize: '11px'}}>
                                                    {new Date(paymentData.updatedAt).toLocaleString('ru-RU')}
                                                </Text>
                                            </div>
                                        )}
                                    </div>

                                    {/* Информация о комиссиях (если есть) */}
                                    {(paymentData.fees || paymentData.networkFee) && (
                                        <div style={{
                                            marginTop: '12px',
                                            padding: '8px',
                                            backgroundColor: 'var(--bg-color)',
                                            borderRadius: '4px',
                                            border: '1px solid #e8e8e8'
                                        }}>
                                            <Text strong
                                                  style={{fontSize: '12px', display: 'block', marginBottom: '4px'}}>
                                                {t("billingNetworkFees") || "Комиссии сети"}:
                                            </Text>
                                            {paymentData.networkFee && (
                                                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                                                    <Text style={{fontSize: '11px'}}>{t("billingNetworkFee") || "Сетевая комиссия"}:</Text>
                                                    <Text style={{fontSize: '11px'}}>
                                                        {paymentData.networkFee} {paymentData.currency}
                                                    </Text>
                                                </div>
                                            )}
                                            {paymentData.fees && (
                                                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                                                    <Text style={{fontSize: '11px'}}>Общая комиссия:</Text>
                                                    <Text style={{fontSize: '11px'}}>
                                                        {paymentData.fees} {paymentData.currency}
                                                    </Text>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Таймер */}
                                {paymentStatus === 'pending' && timeLeft > 0 && (
                                    <div style={{
                                        textAlign: 'center',
                                        padding: '12px',
                                        backgroundColor: 'var(--dialog-war-color)',
                                        borderRadius: '6px',
                                        border: '1px solid #ffd591',
                                        marginBottom: '16px'
                                    }}>
                                        <Space orientation="vertical" size="small">
                                            <Text strong style={{fontSize: '13px'}}>
                                                <ClockCircleOutlined/> {t("billingTimeUntilExpiry") || "Время до истечения платежа"}
                                            </Text>
                                            <div style={{
                                                fontSize: '20px',
                                                fontWeight: 'bold',
                                                color: timeLeft < 300 ? '#ff4d4f' : '#faad14'
                                            }}>
                                                {formatTime(timeLeft)}
                                            </div>
                                            <Progress
                                                percent={Math.max(0, (timeLeft / (30 * 60)) * 100)}
                                                showInfo={false}
                                                strokeColor={timeLeft < 300 ? '#ff4d4f' : '#faad14'}
                                                size="small"
                                            />
                                        </Space>
                                    </div>
                                )}

                                {/* Инструкции по переводу */}
                                <div style={{
                                    padding: '12px',
                                    backgroundColor: 'var(--dialog-bg-color)',
                                    borderRadius: '6px',
                                    border: '1px solid #91d5ff'
                                }}>
                                    <Text strong style={{
                                        display: 'block',
                                        marginBottom: '8px',
                                        color: '#1890ff',
                                        fontSize: '13px'
                                    }}>
                                        {t("billingTransferInstructions") || "Инструкции по переводу"}:
                                    </Text>

                                    <div style={{marginBottom: '8px'}}>
                                        <div style={{marginBottom: '4px'}}>
                                            <Text style={{fontSize: '12px', lineHeight: '1.4'}}>
                                                1. {t("billingInstruction1") || "Переведите точную сумму"} <strong>{paymentData.amount} {paymentData.currency}</strong> {t("billingInstruction1b") || "на указанный адрес"}
                                            </Text>
                                        </div>
                                        <div style={{marginBottom: '4px'}}>
                                            <Text style={{fontSize: '12px', lineHeight: '1.4'}}>
                                                2. {t("billingInstruction2") || "Используйте сеть"} <strong>{paymentData.network}</strong>
                                            </Text>
                                        </div>
                                        {paymentData.depositTag && (
                                            <div style={{marginBottom: '4px'}}>
                                                <Text style={{fontSize: '12px', lineHeight: '1.4'}}>
                                                    3. {t("billingInstruction3") || "Обязательно укажите тег депозита"}: <strong>{paymentData.depositTag}</strong>
                                                </Text>
                                            </div>
                                        )}
                                        <div style={{marginBottom: '4px'}}>
                                            <Text style={{fontSize: '12px', lineHeight: '1.4'}}>
                                                {paymentData.depositTag ? '4' : '3'}. {t("billingInstruction4") || "Дождитесь подтверждения транзакции в блокчейне"}
                                            </Text>
                                        </div>
                                    </div>

                                    <div style={{
                                        marginTop: '8px',
                                        padding: '8px',
                                        backgroundColor: 'var(--dialog-war-color)',
                                        borderRadius: '4px',
                                        border: '1px solid #ffd591'
                                    }}>
                                        <Text strong style={{
                                            display: 'block',
                                            marginBottom: '4px',
                                            color: '#fa8c16',
                                            fontSize: '12px'
                                        }}>
                                            {t("billingImportantWarnings") || "Важные предупреждения"}:
                                        </Text>
                                        <div style={{marginBottom: '2px'}}>
                                            <Text style={{fontSize: '11px', lineHeight: '1.3', color: '#fa8c16'}}>
                                                • {t("billingWarning1") || "Переводите только в указанной сети"} {paymentData.network}
                                            </Text>
                                        </div>
                                        <div style={{marginBottom: '2px'}}>
                                            <Text style={{fontSize: '11px', lineHeight: '1.3', color: '#fa8c16'}}>
                                                • {t("billingWarning2") || "Сумма должна быть точно"} {paymentData.amount} {paymentData.currency}
                                            </Text>
                                        </div>
                                        {paymentData.depositTag && (
                                            <div style={{marginBottom: '2px'}}>
                                                <Text style={{fontSize: '11px', lineHeight: '1.3', color: '#fa8c16'}}>
                                                    • {t("billingWarning3") || "Не забудьте указать тег депозита"} {paymentData.depositTag}
                                                </Text>
                                            </div>
                                        )}
                                        <div style={{marginBottom: '2px'}}>
                                            <Text style={{fontSize: '11px', lineHeight: '1.3', color: '#fa8c16'}}>
                                                • {t("billingWarning4") || "У вас есть 30 минут на совершение перевода"}
                                            </Text>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{textAlign: 'center', padding: '40px 0'}}>
                        <Spin size="large"/>
                        <div style={{marginTop: 16}}>
                            <Text>{t("billingCreatingPayment") || "Создание платежа..."}</Text>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Тур по компоненту (обучающий) */}
            <Tour
                open={tourVisible}
                onClose={() => {
                    setTourVisible(false);
                    setCurrent(0);
                    hideTourPanel();
                }}
                steps={steps}
                current={current}
                onChange={setCurrent}
                indicatorsRender={(current, total) => (
                    <span className="tour-indicator">
                    {current + 1} / {total}
                </span>
                )}
                type="primary"
                arrow={false}
            />

            <FloatButton
                icon={<QuestionCircleOutlined />}
                tooltip={t("tourFloatButtonTooltip") || "Начать обзор интерфейса"}
                onClick={showTourPanel}
                className="tour-float-button"
            />
        </div>
    );
}
