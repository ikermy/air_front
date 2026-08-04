import React, {useContext, useState} from 'react';
import {LockOutlined, UserOutlined, MailOutlined} from '@ant-design/icons';
import {Button, Form, Input, Switch} from 'antd';
import {UserContext} from "../../UserContext";
import {encryptPassword} from "../../utils/easyUtils";
import {useTranslation} from "react-i18next";
import i18n from "i18next";
import {PolicyModal, DemoModal} from './PolicyModals';


async function sendRegData({userId, name, mail, pass, demo, language}) {
    try {
        const response = await fetch(`/v1/auth/register`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                "a": userId,
                "b": name,
                "c": mail,
                "d": pass,
                "e": demo,
                "f": language,
            })
        });

        if (!response.ok) {
            return "error"
        }

        return "ok"
    } catch (error) {
        console.error(error)
        return "error"
    }
}

async function check({userId, mail}) {
    try {
        const response = await fetch(`/v1/auth/check-email`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                "a": mail,
                "b": userId,
            })
        });

        if (!response.ok) {
            return {status: "error"}
        }

        const data = await response.json();

        // Логика проверки ответа
        if (data.email === true) {
            return {status: "email"}; // Email существует
        } else if (data.email === false) {
            return {status: "ok", key: data.key}; // Ничего не найдено - значит всё ок
        } else {
            console.error("Error: " + JSON.stringify(data));
            return {status: "error"}; // Неожиданный ответ
        }
    } catch (error) {
        console.error("Error: " + JSON.stringify(error));
        return {status: "error"};
    }
}

export function RegForm({
                            setMainModalOpen, setMirror, mirror, demo,
                            handleSuccess, handleFalure, handleError
}) {
    const {t} = useTranslation();
    const userId = useContext(UserContext); // Получаю значение userId из контекста (он же в контейнере)
    const [form] = Form.useForm(); // Создаём экземпляр формы
    const [isReglasOpen, setIsReglasOpen] = useState(false);
    const [isDemoOpen, setIsDemoOpen] = useState(false);
    const handleAuthClick = () => {
        setMirror(true)
        // setMainModalOpen(false)
    };

    const showReglas = () => {
        setIsReglasOpen(true);
    };

    const showDemo = () => {
        setIsDemoOpen(true);
    };

    const handleCancel = () => {
        setIsReglasOpen(false);
        setIsDemoOpen(false);
    };

    const onFinish = async (values) => {
        if (values.acceptPolicy) {
            const result = await check({userId, mail: values.email});

            switch (result.status) {
                case "error":
                    setMainModalOpen(false);
                    handleError();
                    break;

                case "email":
                    form.setFields([
                        {
                            name: "email",
                            errors: [t('RegForm-EmailExist')],
                        },
                    ]);
                    break;

                case "ok":
                    try {
                        const encryptedPassword = await encryptPassword(values.password, result.key);

                        // Отправка данных регистрации на сервер при успешной проверке
                        const sendResp = await sendRegData({
                            userId,
                            name: values.name,
                            mail: values.email,
                            pass: encryptedPassword,
                            demo: values.demo,
                            language: i18n.language
                        })

                        switch (sendResp) {
                            case "ok":
                                handleSuccess()
                                setMainModalOpen(false)
                                break
                            default:
                                handleError()
                                setMainModalOpen(false)
                                console.error("Error: " + JSON.stringify(sendResp));
                        }
                        break;
                    } catch (error) {
                        console.error("Error: " + JSON.stringify(error));
                        setMainModalOpen(false);
                        handleError();
                    }
                    break;

                default:
                    console.error("Unexpected result:", result);
                    break;
            }
        } else {
            setMainModalOpen(false);
            handleFalure();
        }
    };

    const validatePassword = (_, value) => {
        if (!value) {
            return Promise.reject(t('RegForm-PassRequired'));
        }
        if (value.length < 6) {
            return Promise.reject(t('RegForm-PassLength'));
        }
        if (!/[A-Z]/.test(value)) {
            return Promise.reject(t('RegForm-PassNeedCapital'));
        }
        if (!/[0-9]/.test(value)) {
            return Promise.reject(t('RegForm-PassNeedDigital'));
        }
        return Promise.resolve();
    };

    return (
        <div className="sub-modal">
            <br/>
            <Form
                form={form}
                name="regForm"
                style={{maxWidth: 400}}
                onFinish={onFinish}
            >
                <Form.Item
                    name="name"
                    rules={[
                        {
                            required: true,
                            message: t('RegForm-PleaseWriteName'),
                        },
                        {
                            pattern: /^[a-zA-Zа-яА-Я- ]+$/,
                            message: t('RegForm-NameNoPermiteSymbols'),
                        },
                    ]}
                >
                    <Input prefix={<UserOutlined/>} placeholder={t('RegForm-WhatYouName')}/>
                </Form.Item>

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
                    <Input prefix={<MailOutlined/>} placeholder={t('RegForm-EnterYouEmail')}/>
                </Form.Item>

                <Form.Item
                    name="password"
                    rules={[{validator: validatePassword}]}
                >
                    <Input.Password autoComplete="new-password" prefix={<LockOutlined/>} placeholder={t('RegForm-ThinkPass')}/>
                </Form.Item>

                <Form.Item
                    name="confirmPassword"
                    dependencies={["password"]} // Ссылка на поле "password"
                    rules={[
                        {required: true, message: t('RegForm-PleaseConfirmPass')},
                        ({getFieldValue}) => ({
                            validator(_, value) {
                                if (!value || getFieldValue("password") === value) {
                                    return Promise.resolve();
                                }
                                return Promise.reject(t('RegForm-PassNoMatch'));
                            },
                        }),
                    ]}
                >
                    <Input.Password autoComplete="new-password" prefix={<LockOutlined/>} placeholder={t('RegForm-ConfirmPass')}/>
                </Form.Item>

                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "24px",
                    }}
                >
                    <span>
                        {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                        {t('RegForm-YoConfirm')}<a onClick={showReglas}>{t('RegForm-PrivacyPolicy')}</a>&nbsp;
                    </span>
                    <Form.Item
                        name="acceptPolicy"
                        valuePropName="checked"
                        rules={[{required: true, message: t('RegForm-PleaseConfirmPrivacyPolicy')}]}
                        style={{margin: 0}}
                    >
                        <Switch
                            checkedChildren={<span style={{color: "black"}}>{t('Yes')}</span>}
                            unCheckedChildren={<span style={{color: "black"}}>{t('No')}</span>}
                        />
                    </Form.Item>
                </div>

                {demo && (
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "24px",
                        }}
                    >
                    <span>
                        {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                        {t('RegForm-WontGet')}<a onClick={showDemo}>{t('RegForm-DemoAccess')}</a>&nbsp;
                    </span>
                        <Form.Item
                            name="demo"
                            valuePropName="demo"
                            // rules={[{required: true, message: "Пожалуйста, примите нашу политику конфиденциальности!"}]}
                            style={{margin: 0}}
                        >
                            <Switch
                                checkedChildren={<span style={{color: "black"}}>{t('Yes')}</span>}
                                unCheckedChildren={<span style={{color: "black"}}>{t('No')}</span>}
                            />
                        </Form.Item>
                    </div>
                )}

                <Form.Item>
                    <Button
                        block
                        type="primary"
                        htmlType="submit"
                        style={{
                            color: "black",
                        }}
                    >
                        {t('RegForm-Register')}
                    </Button>
                </Form.Item>
            </Form>

            {mirror && (
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "24px",
                    }}
                >
                    <span style={{ fontSize: "14px", fontWeight: "normal" }}>
                        {t('RegForm-HayLogin')}
                    </span>
                    <Button type="link" onClick={handleAuthClick}>{t('RegForm-Login')}</Button>
                </div>
            )}

            <PolicyModal isOpen={isReglasOpen} onClose={handleCancel} />
            <DemoModal isOpen={isDemoOpen} onClose={handleCancel} />
        </div>
    );
}
