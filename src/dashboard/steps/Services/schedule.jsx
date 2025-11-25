import React, {useEffect, useState} from "react";
import {validateAndRefreshToken} from "../../../utils/easyUtils";
import {readServiceAccessTime, saveServiceAccessTime} from "./serviceUtils";
import {
    Card,
    Button,
    TimePicker,
    Space,
    Spin,
    Typography,
    List,
    Switch,
    Divider,
    message,
    Row,
    Col,
    Tag,
    Tooltip,
    Badge,
    Modal
} from "antd";
import {
    ClockCircleOutlined,
    SaveOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    ThunderboltOutlined,
    CalendarOutlined,
    ExclamationCircleOutlined
} from "@ant-design/icons";
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import {showErrorNotification, showNotification} from "../../hotification/showNotification";

dayjs.extend(customParseFormat);

const { Title, Text } = Typography;
const { RangePicker } = TimePicker;

// Маппинг дней недели
const WEEKDAYS = [
    { key: 'Mon', label: 'Понедельник', short: 'ПН' },
    { key: 'Tue', label: 'Вторник', short: 'ВТ' },
    { key: 'Wed', label: 'Среда', short: 'СР' },
    { key: 'Thu', label: 'Четверг', short: 'ЧТ' },
    { key: 'Fri', label: 'Пятница', short: 'ПТ' },
    { key: 'Sat', label: 'Суббота', short: 'СБ' },
    { key: 'Sun', label: 'Воскресенье', short: 'ВС' }
];

export function Schedule() {
    const [accessTime, setAccessTime] = useState({});
    const [loading, setLoading] = useState(true);
    const [hasChanges, setHasChanges] = useState(false);
    const [isWorkdaysModalOpen, setIsWorkdaysModalOpen] = useState(false);
    const [isAllDaysModalOpen, setIsAllDaysModalOpen] = useState(false);
    const [workdaysTime, setWorkdaysTime] = useState([dayjs('09:00', 'HH:mm'), dayjs('18:00', 'HH:mm')]);
    const [allDaysTime, setAllDaysTime] = useState([dayjs('09:00', 'HH:mm'), dayjs('18:00', 'HH:mm')]);

    useEffect(() => {
        const loadAccessTime = async () => {
            const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
            if (!token) {
                message.error('Ошибка аутентификации');
                setAccessTime({});
                setLoading(false);
                return;
            }
            try {
                const data = await readServiceAccessTime(token);
                setAccessTime(data || {});
            } catch (e) {
                message.error('Ошибка загрузки расписания');
                setAccessTime({});
            } finally {
                setLoading(false);
            }
        };

        loadAccessTime();
    }, []);

    const handleDayToggle = (day, checked) => {
        setAccessTime({
            ...accessTime,
            [day]: checked ? [{ from: '09:00', to: '18:00' }] : []
        });
        setHasChanges(true);
    };

    const handleTimeRangeChange = (day, timeRange) => {
        if (timeRange && timeRange[0] && timeRange[1]) {
            setAccessTime({
                ...accessTime,
                [day]: [{
                    from: timeRange[0].format('HH:mm'),
                    to: timeRange[1].format('HH:mm')
                }]
            });
        } else {
            // Если время не выбрано, устанавливаем дефолтное значение
            setAccessTime({
                ...accessTime,
                [day]: [{ from: '09:00', to: '18:00' }]
            });
        }
        setHasChanges(true);
    };

    // Быстрые действия
    const handleSetAllWorkdays = () => {
        setIsWorkdaysModalOpen(true);
    };

    const handleWorkdaysConfirm = () => {
        if (workdaysTime && workdaysTime[0] && workdaysTime[1]) {
            const workdaySchedule = {
                from: workdaysTime[0].format('HH:mm'),
                to: workdaysTime[1].format('HH:mm')
            };
            const newSchedule = {};
            WEEKDAYS.forEach(day => {
                if (day.key !== 'Sat' && day.key !== 'Sun') {
                    newSchedule[day.key] = [workdaySchedule];
                } else {
                    newSchedule[day.key] = accessTime[day.key] || [];
                }
            });
            setAccessTime(newSchedule);
            setHasChanges(true);
            message.success(`Установлены рабочие дни с ${workdaysTime[0].format('HH:mm')} до ${workdaysTime[1].format('HH:mm')}`);
            setIsWorkdaysModalOpen(false);
        }
    };

    const handleSetAllDays = () => {
        setIsAllDaysModalOpen(true);
    };

    const handleAllDaysConfirm = () => {
        if (allDaysTime && allDaysTime[0] && allDaysTime[1]) {
            const workdaySchedule = {
                from: allDaysTime[0].format('HH:mm'),
                to: allDaysTime[1].format('HH:mm')
            };
            const newSchedule = {};
            WEEKDAYS.forEach(day => {
                newSchedule[day.key] = [workdaySchedule];
            });
            setAccessTime(newSchedule);
            setHasChanges(true);
            message.success(`Установлены все дни с ${allDaysTime[0].format('HH:mm')} до ${allDaysTime[1].format('HH:mm')}`);
            setIsAllDaysModalOpen(false);
        }
    };

    const handleClearAll = () => {
        const newSchedule = {};
        WEEKDAYS.forEach(day => {
            newSchedule[day.key] = [];
        });
        setAccessTime(newSchedule);
        setHasChanges(true);
        message.success('Расписание очищено');
    };

    const handleSaveSchedule = async () => {
        const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
        if (!token) {
            message.error('Ошибка аутентификации');
            setAccessTime({});
            setLoading(false);
            return;
        }
        try {
        const resp = await saveServiceAccessTime(token, accessTime);
            if (resp) {
                setHasChanges(false);
                showNotification('Расписание сохранено');
            } else {
                setHasChanges(true);
                showErrorNotification('Ошибка при сохранении расписания');
            }
        } catch (e) {
            setHasChanges(true);
            showErrorNotification('Ошибка при сохранении расписания');
        }
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '50px' }}>
                <Spin size="large" />
                <div style={{ marginTop: 16 }}>
                    <Text type="secondary">Загрузка расписания...</Text>
                </div>
            </div>
        );
    }

    // Подсчет статистики
    const workingDaysCount = WEEKDAYS.filter(day => {
        const daySchedule = accessTime[day.key] || [];
        return daySchedule.length > 0;
    }).length;

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px' }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                {/* Заголовок со статистикой */}
                <div style={{ marginBottom: 16 }}>
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        <Space align="center">
                            <CalendarOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                            <Title level={3} style={{ margin: 0 }}>
                                Расписание работы
                            </Title>
                        </Space>
                        <Row gutter={16} align="middle">
                            <Col>
                                <Text type="secondary">
                                    Настройте часы работы ассистента для каждого дня недели
                                </Text>
                            </Col>
                            <Col>
                                <Space size="middle">
                                    <Badge status="success" text={`Рабочих дней: ${workingDaysCount}`} />
                                    <Badge status="default" text={`Выходных: ${7 - workingDaysCount}`} />
                                </Space>
                            </Col>
                        </Row>
                    </Space>
                </div>

                {/* Быстрые действия */}
                <Card title={<><ThunderboltOutlined /> Быстрые действия</>} bordered={false}>
                    <Space wrap>
                        <Button
                            icon={<CheckCircleOutlined />}
                            onClick={handleSetAllWorkdays}
                        >
                            Пн-Пт (настроить время)
                        </Button>
                        <Button
                            icon={<CheckCircleOutlined />}
                            onClick={handleSetAllDays}
                        >
                            Все дни (настроить время)
                        </Button>
                        <Button
                            icon={<CloseCircleOutlined />}
                            onClick={handleClearAll}
                            danger
                        >
                            Очистить все
                        </Button>
                    </Space>
                </Card>

                {/* Основная карточка с расписанием */}
                <Card title={<><ClockCircleOutlined /> Недельное расписание</>} bordered={false}>
                    <List
                        dataSource={WEEKDAYS}
                        renderItem={(weekday, index) => {
                            const daySchedule = accessTime[weekday.key] || [];
                            const isWorking = daySchedule.length > 0;
                            const timeSlot = daySchedule[0];

                            return (
                                <List.Item key={weekday.key} style={{ display: 'block', padding: '20px 0' }}>
                                    <Row gutter={16} align="middle">
                                        {/* День недели */}
                                        <Col xs={24} sm={6} md={5}>
                                            <Space>
                                                <Badge
                                                    status={isWorking ? "success" : "default"}
                                                    style={{ fontSize: 10 }}
                                                />
                                                <div>
                                                    <Text strong style={{ fontSize: 16, display: 'block' }}>
                                                        {weekday.label}
                                                    </Text>
                                                    <Tag
                                                        color={isWorking ? 'var(--main-color)' : undefined}
                                                        style={{
                                                            marginTop: 4,
                                                            backgroundColor: isWorking ? 'var(--main-color)' : 'var(--error-color)',
                                                            color: isWorking ? 'black' : 'white',
                                                            borderColor: isWorking ? undefined : 'var(--error-color)'
                                                        }}
                                                    >

                                                    {isWorking ? 'Рабочий' : 'Выходной'}
                                                    </Tag>
                                                </div>
                                            </Space>
                                        </Col>

                                        {/* Временной интервал */}
                                        <Col xs={24} sm={12} md={13} style={{ marginTop: { xs: 12, sm: 0 } }}>
                                            {isWorking ? (
                                                <RangePicker
                                                    format="HH:mm"
                                                    minuteStep={15}
                                                    value={
                                                        timeSlot && timeSlot.from && timeSlot.to
                                                            ? [
                                                                dayjs(timeSlot.from, 'HH:mm'),
                                                                dayjs(timeSlot.to, 'HH:mm')
                                                            ]
                                                            : null
                                                    }
                                                    onChange={(timeRange) => handleTimeRangeChange(weekday.key, timeRange)}
                                                    placeholder={['Начало', 'Конец']}
                                                    style={{ width: '100%' }}
                                                    size="large"
                                                />
                                            ) : (
                                                <Text type="secondary" style={{ fontSize: 16 }}>
                                                    <CloseCircleOutlined style={{ marginRight: 8 }} />
                                                    Не работает
                                                </Text>
                                            )}
                                        </Col>

                                        {/* Переключатель */}
                                        <Col xs={24} sm={6} md={6} style={{ textAlign: 'right', marginTop: { xs: 12, sm: 0 } }}>
                                            <Tooltip title={isWorking ? 'Сделать выходным' : 'Сделать рабочим'}>
                                                <Switch
                                                    checked={isWorking}
                                                    onChange={(checked) => handleDayToggle(weekday.key, checked)}
                                                    checkedChildren={<CheckCircleOutlined style={{ color: '#20401a' }} />}
                                                    unCheckedChildren={<CloseCircleOutlined />}
                                                    size="default"
                                                />
                                            </Tooltip>
                                        </Col>
                                    </Row>
                                    {index !== WEEKDAYS.length - 1 && <Divider style={{ margin: '20px 0 0 0' }} />}
                                </List.Item>
                            );
                        }}
                    />
                </Card>

                {/* Кнопка сохранения */}
                <Card bordered={false} style={{
                    // background: hasChanges ? '#fff7e6' : '#f5f5f5',
                    borderLeft: hasChanges ? '4px solid #faad14' : 'none'
                }}>
                    <Row align="middle" justify="space-between">
                        <Col>
                            <Space>
                                {hasChanges ? (
                                    <>
                                        <ExclamationCircleOutlined style={{ color: '#faad14', fontSize: 18 }} />
                                        <Text strong>Изменения не сохранены</Text>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />
                                        <Text style={{color : 'var(--text-color)'}} type="secondary">Все изменения сохранены</Text>
                                    </>
                                )}
                            </Space>
                        </Col>
                        <Col>
                            <Button
                                type="primary"
                                size="large"
                                icon={<SaveOutlined />}
                                onClick={handleSaveSchedule}
                                disabled={!hasChanges}
                            >
                                Сохранить расписание
                            </Button>
                        </Col>
                    </Row>
                </Card>
            </Space>

            {/* Модальное окно для настройки рабочих дней */}
            <Modal
                title={<><CalendarOutlined /> Настроить рабочие дни (Пн-Пт)</>}
                open={isWorkdaysModalOpen}
                onOk={handleWorkdaysConfirm}
                onCancel={() => setIsWorkdaysModalOpen(false)}
                okText="Применить"
                cancelText="Отмена"
                okButtonProps={{style: {color: "black"}}}
            >
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Text>Выберите время работы для будних дней (понедельник - пятница):</Text>
                    <RangePicker
                        format="HH:mm"
                        minuteStep={15}
                        value={workdaysTime}
                        onChange={(time) => setWorkdaysTime(time)}
                        placeholder={['Начало', 'Конец']}
                        style={{ width: '100%' }}
                        size="large"
                    />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Суббота и воскресенье останутся без изменений
                    </Text>
                </Space>
            </Modal>

            {/* Модальное окно для настройки всех дней */}
            <Modal
                title={<><CalendarOutlined /> Настроить все дни недели</>}
                open={isAllDaysModalOpen}
                onOk={handleAllDaysConfirm}
                onCancel={() => setIsAllDaysModalOpen(false)}
                okText="Применить"
                cancelText="Отмена"
                okButtonProps={{style: {color: "black"}}}
            >
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Text>Выберите время работы для всех дней недели:</Text>
                    <RangePicker
                        format="HH:mm"
                        minuteStep={15}
                        value={allDaysTime}
                        onChange={(time) => setAllDaysTime(time)}
                        placeholder={['Начало', 'Конец']}
                        style={{ width: '100%' }}
                        size="large"
                    />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Будет применено ко всем дням, включая выходные
                    </Text>
                </Space>
            </Modal>
        </div>
    );
}