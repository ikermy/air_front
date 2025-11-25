import React, {useContext, useState} from 'react';
import {LockOutlined, UserOutlined, MailOutlined} from '@ant-design/icons';
import {Button, Form, Input, Modal, Switch, Typography} from 'antd';
import {UserContext} from "../../index";
import {encryptPassword} from "../../utils/easyUtils";
import './auth.css';
import {useTranslation} from "react-i18next";
import i18n from "i18next";

const LAND_URL = window.runtimeConfig?.REACT_APP_LAND || process.env.REACT_APP_LAND;

async function sendRegData({userId, name, mail, pass, demo, language}) {
    try {
        const response = await fetch(`${LAND_URL}/reg`, {
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
        const response = await fetch(`${LAND_URL}/check`, {
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
                    <Input.Password prefix={<LockOutlined/>} placeholder={t('RegForm-ThinkPass')}/>
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
                    <Input.Password prefix={<LockOutlined/>} placeholder={t('RegForm-ConfirmPass')}/>
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

            <Modal
                title="Политика конфиденциальности"
                open={isReglasOpen}
                onCancel={handleCancel}
                footer={null}
                width={700}
                zIndex={10001}
            >
                <Typography.Paragraph>
                    🛡 <strong>Краткая политика конфиденциальности</strong>
                </Typography.Paragraph>

                <Typography.Paragraph>
                    Мы ценим вашу приватность.
                </Typography.Paragraph>

                <Typography.Paragraph>
                    На нашем сайте вы создаёте и используете <strong>свои</strong> модели ИИ-ассистентов.
                </Typography.Paragraph>

                <Typography.Paragraph>
                    <strong>Что это значит для вас:</strong>
                </Typography.Paragraph>

                <ul>
                    <li>Мы собираем только то, что нужно для работы сервиса (аккаунт, технические данные, данные для доступа к каналам взаимодействия).</li>
                    <li>Всё, что вы вводите или загружаете, используется <strong>только</strong> для работы вашего ассистента.</li>
                    <li>Мы <strong>не</strong> используем ваши данные для рекламы, аналитики или обучения чужих моделей.</li>
                    <li>Мы <strong>не</strong> передаём ваши данные третьим лицам.</li>
                    <li>Вы можете удалить свои данные и модели в любой момент — мы их безвозвратно уничтожим.</li>
                </ul>

                <Typography.Paragraph>
                    💬 <em>В двух словах:</em> ваши данные — ваши. Мы их храним только для того, чтобы ваш ассистент работал, и больше ни для чего.
                </Typography.Paragraph>

                <Typography.Paragraph>
                    Ознакомьтесь с <a href="/privacy-policy" target="_blank">полным текстом политики конфиденциальности</a>.
                </Typography.Paragraph>
            </Modal>

            <Modal
                title="Правила демонстрационного доступа"
                open={isDemoOpen}
                onCancel={handleCancel}
                footer={null}
                width={700}
                zIndex={10001}
            >
                <Typography.Paragraph>
                    1. <strong>Неограниченные каналы связи</strong> — вы можете взаимодействовать с Ассистентом через любые доступные каналы, включая поддержку <strong>голосовых сообщений</strong>.
                </Typography.Paragraph>

                <Typography.Paragraph>
                    2. <strong>Полный функционал создания модели</strong> — доступны все возможности конструктора ассистента, включая:
                </Typography.Paragraph>
                <ul>
                    <li>использование <strong>векторного хранилища</strong>;</li>
                    <li>подключение <strong>S3-хранилища</strong>;</li>
                    <li><strong>генерацию файлов</strong>.</li>
                </ul>

                <Typography.Paragraph>
                    3. <strong>Лимит сообщений</strong> — в рамках демонстрационного доступа предоставляется <strong>30 сообщений</strong> от ИИ Ассистента.
                </Typography.Paragraph>
            </Modal>
        </div>
    );
}
