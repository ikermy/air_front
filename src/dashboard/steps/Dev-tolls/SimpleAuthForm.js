import React, { useContext } from 'react';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { Button, Form, Input } from 'antd';
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { UserContext } from "../../../UserContext";
import { getKey, encryptPassword } from '../../../utils/easyUtils';
import { useAuth } from "../../../AuthContext";
import { showNotification, showWarningNotification, showErrorNotification } from "../../hotification/showNotification.js";
import logoImage from '../../../assets/img/logo.png';


async function sendAuthData({ userId, mail, pass, auto }) {
    try {
        const response = await fetch(`/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                "a": userId,
                "b": mail,
                "c": pass,
                "d": auto,
            })
        });
        if (!response.ok) {
            if (response.status === 401) return { status: "deny" };
            return { status: "error" };
        }
        const data = await response.json();
        if (data.confirmed && !data.disabled) {
            return { status: "permit", sta: data.token};
        } else if (!data.confirmed) {
            return { status: "confirmed" };
        } else if (data.disabled) {
            return { status: "disabled" };
        }
    } catch {
        return { status: "error" };
    }
}

export function SimpleAuthForm() {
    const { t } = useTranslation();
    const userId = useContext(UserContext);
    const [form] = Form.useForm();
    const navigate = useNavigate();
    const { login } = useAuth();

    const onFinish = async (values) => {
        try {
            const result = await getKey({userId});
            if (result.status !== "ok") {
                showErrorNotification("Ошибка", "Не удалось получить ключ шифрования");
                return;
            }
            const encryptedPassword = await encryptPassword(values.password, result.key);
            const auth = await sendAuthData({
                userId,
                mail: values.login,
                pass: encryptedPassword,
                auto: true
            });
            switch (auth.status) {
                case "permit":
                    login(auth.sta);
                    showNotification("Успех", "Вы успешно авторизованы");
                    navigate("/dashboard");
                    break;
                case "deny":
                    showWarningNotification("Ошибка", "Доступ запрещён");
                    break;
                case "confirmed":
                    showWarningNotification("Подтверждение", "Почта не подтверждена");
                    break;
                case "disabled":
                    showErrorNotification("Ошибка", "Аккаунт заблокирован");
                    break;
                default:
                    showErrorNotification("Ошибка", "Неизвестная ошибка");
            }
        } catch (error) {
            showErrorNotification("Ошибка", "Ошибка при авторизации");
            console.error("Ошибка при авторизации:", error);
        }
    };

    return (
        <div className="sub-modal"
             style={{
                 position: "absolute",
                 top: "50%",
                 left: "50%",
                 transform: "translate(-50%, -50%)"
             }}
        >
            <img
                src={logoImage}
                alt="Logo"
                style={{
                    width: '200px',
                    height: 'auto',
                    marginBottom: '20px',
                    display: 'block',
                    margin: '0 auto 20px auto'
                }}
            />
            <br />
            <Form
                form={form}
                name="regForm"
                initialValues={{ checker: true }}
                style={{ maxWidth: 400 }}
                onFinish={onFinish}
            >
                <Form.Item
                    name="login"
                    rules={[
                        { required: true, message: t('RegForm-PleaseEnterYouEmail') },
                    ]}
                >
                    <Input prefix={<MailOutlined />} placeholder={t('AuthForm-EnterEmail')} />
                </Form.Item>
                <Form.Item
                    name="password"
                >
                    <Input.Password prefix={<LockOutlined />} placeholder={t('AuthForm-EnterPassword')} />
                </Form.Item>
                <Form.Item>
                    <Button block type="primary" htmlType="submit" style={{ color: "black" }}>
                        {t('AuthForm-Login')}
                    </Button>
                </Form.Item>
            </Form>
        </div>
    );
}

export default SimpleAuthForm;
