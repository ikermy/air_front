import React from 'react';
import {LockOutlined} from '@ant-design/icons';
import {Button, Form, Input} from 'antd';
import {encryptPassword, getKey} from "../../utils/easyUtils";
import './auth.css';
import {useNavigate} from "react-router-dom";
import {useAuth} from "../../AuthContext";
import {useTranslation} from "react-i18next";

// const LAND_URL = process.env.REACT_APP_LAND;
const LAND_URL = window.runtimeConfig?.REACT_APP_LAND || process.env.REACT_APP_LAND;

async function sendData({mail, pass, token}) {
    try {
        const response = await fetch(`${LAND_URL}/resetpas`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                "a": token,
                "b": mail,
                "c": pass,
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

export function ResetPass({userId, email, token, handleSuccess, handleError}) {
    const {t} = useTranslation();
    const [form] = Form.useForm(); // Создаём экземпляр формы
    const navigate = useNavigate();
    const {setShowLoginForm} = useAuth();

    const onFinish = async (values) => {
        try {
            const result = await getKey({userId});
            switch (result.status) {
                case "error":
                    handleError();
                    break;

                case "ok":
                    break;

                default:
                    handleError()
                    setTimeout(() => {
                        setShowLoginForm(true)
                        navigate("/");
                    }, 5000);
            }

            const encryptedPassword = await encryptPassword(values.password, result.key);
            // Отправка данных регистрации на сервер при успешной проверке
            const sendResp = await sendData({
                mail: email,
                pass: encryptedPassword,
                token: token,
            })

            switch (sendResp) {
                case "ok":
                    handleSuccess()
                    setTimeout(() => {
                        setShowLoginForm(true)
                        navigate("/")
                    }, 3000);
                    break
                default:
                    handleError()
                    setTimeout(() => {
                        setShowLoginForm(true)
                        navigate("/");
                    }, 5000);
            }
        } catch (error) {
            console.error("Ошибка шифрования пароля:", error);
            handleError();
            setTimeout(() => {
                setShowLoginForm(true)
                navigate("/");
            }, 5000);
        }
    }

    const validatePassword = (_, value) => {
        if (!value) {
            return Promise.reject(t("passwordRequired") || 'Пароль обязателен!');
        }
        if (value.length < 6) {
            return Promise.reject(t("passwordMinLength") || 'Пароль должен быть не менее 6 символов!');
        }
        if (!/[A-Z]/.test(value)) {
            return Promise.reject(t("passwordNeedCapital") || 'Пароль должен содержать хотя бы одну заглавную букву!');
        }
        if (!/[0-9]/.test(value)) {
            return Promise.reject(t("passwordNeedDigit") || 'Пароль должен содержать хотя бы одну цифру!');
        }
        return Promise.resolve();
    };

    return (
        <div className="sub-modal">
            <br/>
            <Form
                form={form}
                name="resetForm"
                style={{maxWidth: 400}}
                onFinish={onFinish}
            >

                <Form.Item
                    name="password"
                    rules={[{validator: validatePassword}]}
                >
                    <Input.Password prefix={<LockOutlined/>} placeholder={t("newPasswordPlaceholder") || 'Придумайте новый пароль'}/>
                </Form.Item>

                <Form.Item
                    name="confirmPassword"
                    dependencies={["password"]} // Ссылка на поле "password"
                    rules={[
                        {required: true, message: t("passwordConfirmRequired") || 'Пожалуйста, подтвердите пароль!'},
                        ({getFieldValue}) => ({
                            validator(_, value) {
                                if (!value || getFieldValue("password") === value) {
                                    return Promise.resolve();
                                }
                                return Promise.reject(t("passwordsDoNotMatch") || 'Пароли не совпадают!');
                            },
                        }),
                    ]}
                >
                    <Input.Password prefix={<LockOutlined/>} placeholder={t("confirmPasswordPlaceholder") || 'Подтвердите новый пароль'}/>
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
                        {t("changePasswordButton") || 'Сменить пароль'}
                    </Button>
                </Form.Item>
            </Form>

        </div>
    )
}
