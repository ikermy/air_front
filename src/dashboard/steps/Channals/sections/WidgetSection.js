import {Alert, Button, ColorPicker, DatePicker, Input, Space, Switch, Typography, Divider} from "antd";
import {getWidgetCode} from "../chUtils";
import {useTranslation} from "react-i18next";
import {useMemo, useState} from "react";
import dayjs from "dayjs";
import {showWarningNotification} from "../../../hotification/showNotification";

const MAX_ORIGINS = 10;
const originPattern = /^[a-z][a-z\d+.-]*:\/\/[^\s/*]+(?::\d+)?$/i;

const getInitialConfig = (data) => {
    if (!data) return {allowedUrls: [], neverExpires: true};
    try {
        const parsed = typeof data === "string" ? JSON.parse(data) : data;
        return {
            allowedUrls: Array.isArray(parsed?.allowedUrls) ? parsed.allowedUrls : [],
            expiresAt: parsed?.expiresAt,
            neverExpires: parsed?.neverExpires !== false,
            script: parsed?.script,
            widgetCode: parsed?.widgetCode
            , colors: parsed?.colors && typeof parsed.colors === 'object' ? parsed.colors : {}
        };
    } catch {
        return {allowedUrls: [], neverExpires: true};
    }
};

export const WidgetSection = ({channel, selectedChannels, setSelectedChannels}) => {
    const {t} = useTranslation();
    const initial = useMemo(() => getInitialConfig(channel.data), [channel.data]);
    const [allowedUrls, setallowedUrls] = useState(initial.allowedUrls);
    const [origin, setOrigin] = useState('');
    const [neverExpires, setNeverExpires] = useState(initial.neverExpires);
    const [expiresAt, setExpiresAt] = useState(initial.expiresAt ? dayjs(initial.expiresAt) : null);
    const [error, setError] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [colors, setColors] = useState(initial.colors || {});
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewChatOpen, setPreviewChatOpen] = useState(true);
    const [previewButtonHovered, setPreviewButtonHovered] = useState(false);

    const updateChannelData = (data) => setSelectedChannels(selectedChannels.map((ch) =>
        ch.key === "widg" ? {...ch, data} : ch
    ));

    const addOrigin = () => {
        const value = origin.trim().replace(/\/$/, '');
        if (!originPattern.test(value)) return setError(t('widgetOriginInvalid'));
        if (allowedUrls.includes(value)) return setError(t('widgetOriginDuplicate'));
        if (allowedUrls.length >= MAX_ORIGINS) return setError(t('widgetOriginLimit'));
        setallowedUrls([...allowedUrls, value]);
        setOrigin('');
        setError('');
    };

    const removeOrigin = (value) => setallowedUrls(allowedUrls.filter((item) => item !== value));

    const saveConfig = (extra = {}) => updateChannelData({
        ...extra,
        allowedUrls,
        colors,
        ...(neverExpires ? {neverExpires: true} : {
            expiresAt: expiresAt?.toISOString(),
            neverExpires: false
        })
    });

    const fetchDataAsync = async () => {
        if (!allowedUrls.length) return;
        if (!neverExpires && (!expiresAt || !expiresAt.isAfter(dayjs()))) {
            setError(t('widgetExpiryInvalid'));
            return;
        }
        setIsGenerating(true);
        setError('');
        try {
            const payload = neverExpires
                ? {allowedUrls, neverExpires: true}
                : {allowedUrls, expiresAt: expiresAt.toISOString(), neverExpires: false};
            const result = await getWidgetCode(payload);
            const widgetCode = result.widgetCode || result;
            const encodedColors = encodeURIComponent(JSON.stringify(colors));
            const script = `<script src="${window.location.origin}/widget/marusya-widget.js" data-widget-code="${widgetCode}" data-widget-colors="${encodedColors}"></script>`;
            saveConfig({widgetCode, script});
        } catch (e) {
            if (e.status === 401) {
                showWarningNotification(
                    t("authError") || "Ошибка авторизации",
                    t("tokenNotFound") || "Токен не найден"
                );
            }
            setError(e.message || t('widgetCodeError'));
        } finally {
            setIsGenerating(false);
        }
    };

    const config = getInitialConfig(channel.data);
    const script = config.script;

    const updateColor = (key, value) => {
        setColors((current) => {
            const nextColors = {...current, [key]: value};
            if (config.widgetCode) {
                const encodedColors = encodeURIComponent(JSON.stringify(nextColors));
                const nextScript = `<script src="${window.location.origin}/widget/marusya-widget.js" data-widget-code="${config.widgetCode}" data-widget-colors="${encodedColors}"></script>`;
                updateChannelData({
                    ...channel.data,
                    widgetCode: config.widgetCode,
                    script: nextScript,
                    colors: nextColors,
                    allowedUrls,
                    ...(neverExpires ? {neverExpires: true} : {
                        expiresAt: expiresAt?.toISOString(),
                        neverExpires: false
                    }),
                });
            }
            return nextColors;
        });
    };
    const colorValue = (key, fallback) => colors[key] || fallback;

    return <Space orientation="vertical" size="middle" style={{width: '100%'}}>
        <Alert
            message={script ? (t("widgetAddToSite") || "Добавьте виджет себе на сайт") : (t("widgetGetCode") || "Получите HTML код виджета")}
            description={script ? (t("widgetReadyDesc") || "Код виджета готов.") : (t("widgetGetCodeDesc") || "Настройте разрешённые сайты и срок работы виджета.")}
            type={script ? "success" : "warning"}
        />
        <Typography.Text strong>{t('widgetallowedUrls', {
            count: allowedUrls.length,
            max: MAX_ORIGINS
        })}</Typography.Text>
        <Space.Compact style={{width: '100%'}}>
            <Input value={origin} onChange={(e) => setOrigin(e.target.value)} onPressEnter={addOrigin}
                   placeholder={t('widgetOriginPlaceholder')}/>
            <Button onClick={addOrigin} disabled={allowedUrls.length >= MAX_ORIGINS}>{t('widgetAddOrigin')}</Button>
        </Space.Compact>
        <Space wrap>
            {allowedUrls.map((item) => <Button key={item} size="small"
                                               onClick={() => removeOrigin(item)}>{item} ×</Button>)}
        </Space>
        <Space>
            <Typography.Text strong>{t('widgetExpirationTitle')}</Typography.Text>
            <Switch checked={neverExpires} onChange={(checked) => {
                setNeverExpires(checked);
                setError('');
            }}/>
            <Typography.Text>{t('widgetNeverExpires')}</Typography.Text>
        </Space>
        {!neverExpires && <DatePicker showTime value={expiresAt} onChange={setExpiresAt} format="YYYY-MM-DD HH:mm"/>}
        {error && <Alert type="error" message={error}/>}
        <Divider orientation="left">{t('widgetColors') || 'Оформление виджета'}</Divider>
        <Space wrap>
            <ColorPicker value={colorValue('buttonBackground', '#1677ff')}
                         onChangeComplete={(color) => updateColor('buttonBackground', color.toHexString())} showText/>
            <Typography.Text>{t('widgetButtonColor') || 'Кнопка'}</Typography.Text>
            <ColorPicker value={colorValue('buttonHoverBackground', '#0958d9')}
                         onChangeComplete={(color) => updateColor('buttonHoverBackground', color.toHexString())}
                         showText/>
            <Typography.Text>{t('widgetButtonHoverColor') || 'Кнопка при наведении'}</Typography.Text>
            <ColorPicker value={colorValue('headerBackground', '#ffffff')}
                         onChangeComplete={(color) => updateColor('headerBackground', color.toHexString())} showText/>
            <Typography.Text>{t('widgetHeaderColor') || 'Заголовок'}</Typography.Text>
            <ColorPicker value={colorValue('messageBackgroundUser', '#d9f7be')}
                         onChangeComplete={(color) => updateColor('messageBackgroundUser', color.toHexString())}
                         showText/>
            <Typography.Text>{t('widgetUserMessageColor') || 'Сообщение пользователя'}</Typography.Text>
            <ColorPicker value={colorValue('messageBackgroundBot', '#ffffff')}
                         onChangeComplete={(color) => updateColor('messageBackgroundBot', color.toHexString())}
                         showText/>
            <Typography.Text>{t('widgetBotMessageColor') || 'Сообщение модели'}</Typography.Text>
            <ColorPicker value={colorValue('inputBackground', '#ffffff')}
                         onChangeComplete={(color) => updateColor('inputBackground', color.toHexString())} showText/>
            <Typography.Text>{t('widgetInputColor') || 'Поле ввода'}</Typography.Text>
            <ColorPicker value={colorValue('sendButtonBackground', '#1677ff')}
                         onChangeComplete={(color) => updateColor('sendButtonBackground', color.toHexString())}
                         showText/>
            <Typography.Text>{t('widgetSendButtonColor') || 'Кнопка отправки'}</Typography.Text>
            <ColorPicker value={colorValue('windowBackground', '#f5f5f5')}
                         onChangeComplete={(color) => updateColor('windowBackground', color.toHexString())} showText/>
            <Typography.Text>{t('widgetWindowColor') || 'Окно'}</Typography.Text>
            <ColorPicker value={colorValue('windowBorder', '#d9d9d9')}
                         onChangeComplete={(color) => updateColor('windowBorder', color.toHexString())} showText/>
            <Typography.Text>{t('widgetBorderColor') || 'Граница'}</Typography.Text>
            <ColorPicker value={colorValue('messageTextUser', '#333333')}
                         onChangeComplete={(color) => {
                             const value = color.toHexString();
                             updateColor('messageTextUser', value);
                             updateColor('messageTextBot', value);
                         }} showText/>
            <Typography.Text>{t('widgetTextColor') || 'Цвет текста сообщений'}</Typography.Text>
        </Space>
        <div style={{display: "flex", gap: "8px"}}>
            <Button style={{flex: 1}} onClick={() => setPreviewOpen((open) => !open)}>
                {previewOpen ? (t('widgetHidePreview') || 'Скрыть предпросмотр') : (t('widgetShowPreview') || 'Предпросмотр виджета')}
            </Button>
            <Button
                danger
                style={{flex: 1}}
                onClick={() => {
                    setColors({});
                    if (config.widgetCode) {
                        const nextScript = `<script src="${window.location.origin}/widget/marusya-widget.js" data-widget-code="${config.widgetCode}" data-widget-colors="%7B%7D"></script>`;
                        updateChannelData({
                            ...channel.data,
                            widgetCode: config.widgetCode,
                            script: nextScript,
                            colors: {},
                            allowedUrls
                        });
                    }
                }}>{t('widgetResetColors') || 'Сбросить цвета'}</Button>
            <Button style={{flex: 1}} type="primary" loading={isGenerating} disabled={!allowedUrls.length}
                    onClick={fetchDataAsync}>
                {t("widgetGetCodeButton") || "Получить код"}
            </Button>
        </div>
        {previewOpen && <div style={{
            height: 390,
            overflow: 'hidden',
            border: '1px solid #d9d9d9',
            borderRadius: 8,
            background: '#fafafa',
            position: 'relative'
        }}>
            <div style={{
                width: 720,
                height: 760,
                transform: 'scale(0.5)',
                transformOrigin: 'top left',
                position: 'absolute',
                left: 12,
                top: 12,
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif"
            }}>
                <>
                    <button type="button" onClick={() => setPreviewChatOpen(true)}
                            onMouseEnter={() => setPreviewButtonHovered(true)}
                            onMouseLeave={() => setPreviewButtonHovered(false)} style={{
                        position: 'absolute',
                        right: 600,
                        bottom: 50,
                        width: 64,
                        height: 64,
                        border: 0,
                        borderRadius: '50%',
                        background: previewButtonHovered ? colorValue('buttonHoverBackground', '#0958d9') : colorValue('buttonBackground', '#1677ff'),
                        color: '#fff',
                        fontSize: 24,
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(0,0,0,.2)',
                        transition: 'background-color .2s ease'
                    }}>◌
                    </button>
                    {previewChatOpen && <div style={{
                        position: 'absolute',
                        right: 0,
                        bottom: 84,
                        width: 520,
                        height: 620,
                        display: 'flex',
                        flexDirection: 'column',
                        background: colorValue('windowBackground', '#f5f5f5'),
                        border: `1px solid ${colorValue('windowBorder', '#d9d9d9')}`,
                        borderRadius: 10,
                        overflow: 'hidden',
                        boxShadow: '0 8px 30px rgba(0,0,0,.2)'
                    }}>
                        <div style={{
                            height: 58,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '0 16px',
                            background: colorValue('headerBackground', '#fff'),
                            color: colorValue('headerText', '#333'),
                            borderBottom: `1px solid ${colorValue('windowBorder', '#d9d9d9')}`
                        }}>
                                <span style={{
                                    width: 14,
                                    height: 14,
                                    borderRadius: '50%',
                                    background: colorValue('connectedIndicator', '#28a745')
                                }}/>
                            <strong style={{flex: 1}}>Маруся AI</strong>
                            <button type="button" onClick={() => setPreviewChatOpen(false)} style={{
                                border: 0,
                                background: 'transparent',
                                color: colorValue('headerText', '#333'),
                                fontSize: 24,
                                cursor: 'pointer'
                            }}>×
                            </button>
                        </div>
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                            padding: 16,
                            background: colorValue('windowBackground', '#f5f5f5')
                        }}>
                            <div style={{
                                alignSelf: 'flex-end',
                                maxWidth: '72%',
                                padding: '10px 14px',
                                borderRadius: 12,
                                background: colorValue('messageBackgroundUser', '#d9f7be'),
                                color: colorValue('messageTextUser', '#333')
                            }}>Пример сообщения пользователя
                            </div>
                            <div style={{
                                alignSelf: 'flex-start',
                                maxWidth: '72%',
                                padding: '10px 14px',
                                borderRadius: 12,
                                background: colorValue('messageBackgroundBot', '#fff'),
                                color: colorValue('messageTextBot', '#333')
                            }}>Пример сообщения модели
                            </div>
                        </div>
                        <div style={{
                            display: 'flex',
                            gap: 8,
                            padding: 12,
                            background: colorValue('inputBackground', '#fff'),
                            borderTop: `1px solid ${colorValue('windowBorder', '#d9d9d9')}`
                        }}>
                            <input readOnly value="Введите сообщение" style={{
                                flex: 1,
                                minWidth: 0,
                                border: 0,
                                outline: 0,
                                background: colorValue('inputBackground', '#fff'),
                                color: colorValue('inputPlaceholder', '#888'),
                                fontSize: 16
                            }}/>
                            <button type="button" style={{
                                width: 42,
                                height: 36,
                                border: 0,
                                borderRadius: 6,
                                background: colorValue('sendButtonBackground', '#1677ff'),
                                color: '#fff',
                                cursor: 'pointer'
                            }}>➤
                            </button>
                        </div>
                    </div>}
                </>
            </div>
        </div>}
        {script && <Input.TextArea value={script} readOnly autoSize={{minRows: 1, maxRows: 6}}/>}
    </Space>;
};
