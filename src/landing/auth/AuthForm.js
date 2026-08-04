import React, {useContext, useEffect, useRef, useState} from 'react';
import { LockOutlined, MailOutlined, SafetyOutlined} from '@ant-design/icons';
import {Button, Form, Input, Spin, Switch} from 'antd';
import {encryptPassword, getKey} from "../../utils/easyUtils";
import {UserContext} from "../../UserContext";
import {useNavigate} from "react-router-dom";
import {useAuth} from "../../AuthContext";
import {useTranslation} from "react-i18next";
import {authTotp} from "../../dashboard/steps/User-data/totpUtils";


async function sendAuthData({userId, mail, pass, auto}) {
    try {
        const response = await fetch(`/v1/auth/login`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            credentials: 'include',
            body: JSON.stringify({
                "a": userId,
                "b": mail,
                "c": pass,
                "d": auto, // Автоматически входить (сохранить токен)
            })
        });

        if (!response.ok) {
            if (response.status === 401) return {status: "deny"};
            return {status: "error"};
        }

        const data = await response.json();

        if (data.status === "totp_required") {
            return {status: "totp_required", totp_token: data.totp_token};
        }

        if (data.confirmed && !data.disabled) {
            return {
                status: "permit",
                sta: data.token,
                totpEnabled: false,
                master: data.master,
            };
        } else if (!data.confirmed) {
            return {status: "confirmed"};
        } else if (data.disabled) {
            return {status: "disabled"};
        }

    } catch (error) {
        console.error(error);
        return {status: "error"};
    }
}

export function AuthForm({
                             setMainModalOpen, setMirror, setRestoreMail,
                             mirror, handleDeny, handleError, handleNotConfirmed, handleDiasbled,
                             confirm
                         }) {
    const {t} = useTranslation();
    const userId = useContext(UserContext);
    const [form] = Form.useForm();
    const [restore, setRestore] = useState(false);
    const navigate = useNavigate();
    const handleRegClick = () => { setMirror(true) };
    const handleRestore = () => { setRestoreMail(true); }
    const {login} = useAuth();

    // Состояния для TOTP-шага
    const [totpStep, setTotpStep] = useState(false); // true = показываем экран TOTP
    const [totpToken, setTotpToken] = useState('');
    const [totpCode, setTotpCode] = useState('');
    const [totpLoading, setTotpLoading] = useState(false);
    const [totpError, setTotpError] = useState('');
    const [autoLogin, setAutoLogin] = useState(false);
    const totpInputRef = useRef(null);

    useEffect(() => {
        if (totpStep) {
            setTimeout(() => totpInputRef.current?.focus(), 50);
        }
    }, [totpStep]);

    const onFinish = async (values) => {
        try {
            const result = await getKey({userId});

            switch (result.status) {
                case "error":
                    if (!confirm) setMainModalOpen(false);
                    handleError();
                    break;
                case "ok":
                    break;
                default:
                    if (!confirm) setMainModalOpen(false);
                    handleError();
            }

            const encryptedPassword = await encryptPassword(values.password, result.key);
            // Отправка данных регистрации на сервер при успешной проверке
            const auth = await sendAuthData({
                userId,
                mail: values.email,
                pass: encryptedPassword,
                auto: values.checker
            });

            switch (auth.status) {
                case "totp_required":
                    setTotpToken(auth.totp_token);
                    setAutoLogin(values.checker);
                    setTotpCode('');
                    setTotpError('');
                    setTotpStep(true);
                    break;
                case "permit":
                    login(auth.sta);
                    navigate("/dashboard", {
                        state: {
                            warn2FA: !auth.totpEnabled,
                            warnMasterKey: !auth.master }
                    });
                    break;
                case "deny":
                    handleDeny();
                    setRestore(true);
                    break;
                case "confirmed":
                    handleNotConfirmed();
                    if (!confirm) setMainModalOpen(false);
                    break;
                case "disabled":
                    handleDiasbled();
                    if (!confirm) setMainModalOpen(false);
                    break;
                default:
                    handleError();
                    console.error("Error: " + JSON.stringify(result.error));
            }
        } catch (error) {
            console.error('Ошибка:', error.message);
            handleError();
        }
    };

    const handleTotpSubmit = async (codeArg) => {
        const code = codeArg ?? totpCode;
        if (!code || code.length !== 6) return;
        try {
            setTotpLoading(true);
            setTotpError('');
            const response = await authTotp(totpToken, code);
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || `Ошибка сервера: ${response.status}`);
            }
            const result = await response.json();
            login(result.token);
            navigate("/dashboard");
            // не сбрасываем totpStep — окно остаётся на спиннере до перехода
        } catch (err) {
            const msg = typeof err === 'string' ? err : (err.message || t('AuthForm-TotpError') || 'Неверный код. Попробуйте снова');
            setTotpError(msg);
            setTotpCode('');
            setTimeout(() => totpInputRef.current?.focus(), 50);
        } finally {
            setTotpLoading(false);
        }
    };

    const validatePassword = (_, value) => {
        if (!value) { return Promise.reject(t('RegForm-PassRequired')); }
        if (value.length < 6) { return Promise.reject(t('RegForm-PassLength')); }
        return Promise.resolve();
    };

    // Экран ввода TOTP-кода
    if (totpStep) {
        return (
            <div className="sub-modal">
                <br/>
                <div style={{textAlign: 'center', marginBottom: 24}}>
                    <SafetyOutlined style={{fontSize: 40, color: 'var(--icon-bg)'}}/>
                    <p style={{marginTop: 12, color: 'var(--text-color)', fontSize: 14}}>
                        {t('AuthForm-TotpDesc') || "Введите 6-значный код из приложения-аутентификатора"}
                    </p>
                </div>
                <Input
                    ref={totpInputRef}
                    size="large"
                    maxLength={6}
                    value={totpCode}
                    onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        setTotpCode(val);
                        setTotpError('');
                        if (val.length === 6) handleTotpSubmit(val);
                    }}
                    placeholder="000000"
                    style={{textAlign: 'center', letterSpacing: 8, fontSize: 24}}
                    disabled={totpLoading}
                    status={totpError ? 'error' : ''}
                />
                {totpError && (
                    <p style={{color: '#ff4d4f', marginTop: 8, textAlign: 'center', fontSize: 13}}>
                        {totpError}
                    </p>
                )}
                {totpLoading && (
                    <div style={{textAlign: 'center', marginTop: 12}}>
                        <Spin/>
                    </div>
                )}
                <div style={{marginTop: 40}}>
                </div>
            </div>
        );
    }

    return (
        <div className="sub-modal">
            <br/>
            <Form
                form={form}
                name="regForm"
                initialValues={{ checker: true }}
                style={{maxWidth: 400}}
                onFinish={onFinish}
            >
                <Form.Item
                    name="email"
                    rules={[
                        { type: "email", message: t('RegForm-EnterLegalEmail') },
                        { required: true, message: t('RegForm-PleaseEnterYouEmail') },
                    ]}
                >
                    <Input prefix={<MailOutlined/>} placeholder={t('AuthForm-EnterEmail')}/>
                </Form.Item>

                <Form.Item name="password" rules={[{validator: validatePassword}]}>
                    <Input.Password prefix={<LockOutlined/>} placeholder={t('AuthForm-EnterPassword')}/>
                </Form.Item>

                <Form.Item>
                    <Button block type="primary" htmlType="submit" style={{color: "black"}}>
                        {t('AuthForm-Login')}
                    </Button>
                </Form.Item>

                {!confirm && (
                    <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px"}}>
                        <span style={{color: "var(--text-color)"}}>{t('AuthForm-LoginAuto')}&nbsp;</span>
                        <Form.Item name="checker" valuePropName="checked" style={{margin: 0}}>
                            <Switch
                                checkedChildren={<span style={{color: "black"}}>{t('Yes')}</span>}
                                unCheckedChildren={<span style={{color: "black"}}>{t('No')}</span>}
                            />
                        </Form.Item>
                    </div>
                )}
            </Form>

            {restore && (
                <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px"}}>
                    <span style={{fontSize: "14px", color: "var(--text-color)"}}>{t('AuthForm-LostPass')}</span>
                    <Button type="link" onClick={handleRestore}>{t('AuthForm-RestorePass')}</Button>
                </div>
            )}

            {(mirror && !restore) && (
                <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px"}}>
                    <span style={{fontSize: "14px", color: "var(--text-color)"}}>{t('AuthForm-DontHaveAccount')}</span>
                    <Button type="link" onClick={handleRegClick}>{t('AuthForm-Register')}</Button>
                </div>
            )}
        </div>
    );
}
