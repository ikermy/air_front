import React, {useContext, useState} from 'react';
import {LockOutlined, MailOutlined} from '@ant-design/icons';
import {Button, Form, Input, Switch} from 'antd';
import {encryptPassword, getKey} from "../../utils/easyUtils";
import './auth.css';
import {UserContext} from "../../index";
import {useNavigate} from "react-router-dom";
import {useAuth} from "../../AuthContext";
import {useTranslation} from "react-i18next";

// const LAND_URL = process.env.REACT_APP_LAND;
const LAND_URL = window.runtimeConfig?.REACT_APP_LAND || process.env.REACT_APP_LAND;

async function sendAuthData({userId, mail, pass, auto}) {
    try {
        const response = await fetch(`${LAND_URL}/auth`, {
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
            if (response.status === 401) {
                return {status: "deny"}
            }

            return {status: "error"}
        }

        const data = await response.json();

        if (data.confirmed && !data.disabled) {
            return {
                status: "permit",
                sta: data.token,
            };
        } else if (!data.confirmed) {
            return {status: "confirmed"};
        } else if (data.disabled) {
            return {status: "disabled"}
        }

    } catch (error) {
        console.error(error)
        return {status: "error"}
    }
}

export function AuthForm({
                             setMainModalOpen, setMirror, setRestoreMail,
                             mirror, handleDeny, handleError, handleNotConfirmed, handleDiasbled,
                             confirm
                         }) { // confirm - для не закрытия модального окна (когда в нем)
    const {t} = useTranslation();
    const userId = useContext(UserContext); // Получаю значение userId из контекста (он же в контейнере)
    const [form] = Form.useForm(); // Создаём экземпляр формы
    const [restore, setRestore] = useState(false);
    const navigate = useNavigate();
    const handleRegClick = () => {
        setMirror(true)
    };
    const handleRestore = () => {
        setRestoreMail(true);
    }
    const {login} = useAuth();


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
            })

            switch (auth.status) {
                case "permit":
                    login()
                    if (values.checker) {
                        localStorage.setItem("authToken", auth.sta)
                    }

                    navigate("/dashboard")
                    break
                case "deny":
                    handleDeny()
                    setRestore(true)
                    break
                case "confirmed":
                    handleNotConfirmed()
                    if (!confirm) setMainModalOpen(false);
                    break
                case "disabled":
                    handleDiasbled()
                    if (!confirm) setMainModalOpen(false);
                    break
                default:
                    handleError();
                    console.error("Error: " + JSON.stringify(result.error))
            }
        } catch (error) {
            console.error('Ошибка:', error.message);
            handleError();
        }
    };

    const validatePassword = (_, value) => {
        if (!value) {
            return Promise.reject(t('RegForm-PassRequired'));
        }
        if (value.length < 6) {
            return Promise.reject(t('RegForm-PassLength'));
        }
        return Promise.resolve();
    };

    return (
        <div className="sub-modal">
            <br/>
            <Form
                form={form}
                name="regForm"
                initialValues={{
                    checker: true,
                }}
                style={{maxWidth: 400}}
                onFinish={onFinish}
            >
                <Form.Item
                    name="email"
                    rules={[
                        {
                            type: "email",
                            message: t('RegForm-EnterLegalEmail'),
                        },
                        {
                            required: true,
                            message: t('RegForm-PleaseEnterYouEmail'),
                        },
                    ]}
                >
                    <Input prefix={<MailOutlined/>} placeholder={t('AuthForm-EnterEmail')}/>
                </Form.Item>

                <Form.Item
                    name="password"
                    rules={[{validator: validatePassword}]}
                >
                    <Input.Password prefix={<LockOutlined/>} placeholder={t('AuthForm-EnterPassword')}/>
                </Form.Item>

                <Form.Item>
                    <Button
                        block
                        type="primary"
                        htmlType="submit"
                        style={{
                            color: "black",
                        }}
                    >
                        {t('AuthForm-Login')}
                    </Button>
                </Form.Item>

                {!confirm && (
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "24px",
                        }}
                    >
                    <span style={{ color: "var(--text-color)" }}>
                        {t('AuthForm-LoginAuto')}&nbsp;
                    </span>
                        <Form.Item
                            name="checker"
                            valuePropName="checked"
                            style={{margin: 0}}
                        >
                            <Switch
                                checkedChildren={<span style={{color: "black"}}>{t('Yes')}</span>}
                                unCheckedChildren={<span style={{color: "black"}}>{t('No')}</span>}
                            />
                        </Form.Item>
                    </div>
                )}
            </Form>

            {restore && (
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "24px",
                    }}
                >
                   <span style={{ fontSize: "14px", color: "var(--text-color)" }}>
                        {t('AuthForm-LostPass')}
                    </span>
                    <Button type="link" onClick={handleRestore}>{t('AuthForm-RestorePass')}</Button>
                </div>
            )}

            {(mirror && !restore) && (
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "24px",
                    }}
                >
                    <span style={{ fontSize: "14px", color: "var(--text-color)" }}>
                        {t('AuthForm-DontHaveAccount')}
                    </span>
                    <Button type="link" onClick={handleRegClick}>{t('AuthForm-Register')}</Button>
                </div>
            )}
        </div>
    );
}
