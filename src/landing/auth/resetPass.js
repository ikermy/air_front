import React, {useState} from 'react';
import {KeyOutlined, LockOutlined} from '@ant-design/icons';
import {Alert, Button, Collapse, Form, Input} from 'antd';
import {encryptPassword, getKey} from "../../utils/easyUtils";
import {useNavigate} from "react-router-dom";
import {useAuth} from "../../AuthContext";
import {useTranslation} from "react-i18next";


async function sendData({mail, pass, token, rawMasterKey}) {
    try {
        const body = {
            "a": token,
            "b": mail,
            "c": pass,
        };
        if (rawMasterKey && rawMasterKey.trim()) {
            body["d"] = rawMasterKey.trim();
        }

        const response = await fetch(`/v1/auth/reset-password/confirm`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(body)
        });

        if (response.status === 400) return "bad_key";
        if (response.status === 429) return "429";
        if (!response.ok) return "error";

        return "ok"
    } catch (error) {
        console.error(error)
        return "error"
    }
}

export function ResetPass({userId, email, token, handleSuccess, handleError}) {
    const {t} = useTranslation();
    const [form] = Form.useForm();
    const navigate = useNavigate();
    const {setShowLoginForm} = useAuth();
    const [rawMasterKey, setRawMasterKey] = useState('');

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
                    handleError();
                    setTimeout(() => { setShowLoginForm(true); navigate("/"); }, 5000);
            }

            const encryptedPassword = await encryptPassword(values.password, result.key);
            const sendResp = await sendData({
                mail: email,
                pass: encryptedPassword,
                token: token,
                rawMasterKey,
            });

            switch (sendResp) {
                case "ok":
                    handleSuccess();
                    setTimeout(() => { setShowLoginForm(true); navigate("/"); }, 3000);
                    break;
                case "bad_key":
                    form.setFields([{
                        name: 'rawMasterKey',
                        errors: [t("resetPassBadMasterKey") || 'Неверный ключ шифрования']
                    }]);
                    break;
                case "429":
                    form.setFields([{
                        name: 'password',
                        errors: [t("resetPassTooManyRequests") || 'Слишком много запросов. Подождите.']
                    }]);
                    break;
                default:
                    handleError();
                    setTimeout(() => { setShowLoginForm(true); navigate("/"); }, 5000);
            }
        } catch (error) {
            console.error("Ошибка шифрования пароля:", error);
            handleError();
            setTimeout(() => { setShowLoginForm(true); navigate("/"); }, 5000);
        }
    };

    const validatePassword = (_, value) => {
        if (!value) return Promise.reject(t("passwordRequired") || 'Пароль обязателен!');
        if (value.length < 6) return Promise.reject(t("passwordMinLength") || 'Пароль должен быть не менее 6 символов!');
        if (!/[A-Z]/.test(value)) return Promise.reject(t("passwordNeedCapital") || 'Пароль должен содержать хотя бы одну заглавную букву!');
        if (!/[0-9]/.test(value)) return Promise.reject(t("passwordNeedDigit") || 'Пароль должен содержать хотя бы одну цифру!');
        return Promise.resolve();
    };

    return (
        <div className="sub-modal">
            <br/>
            <Form form={form} name="resetForm" style={{maxWidth: 400}} onFinish={onFinish}>

                <Form.Item name="password" rules={[{validator: validatePassword}]}>
                    <Input.Password prefix={<LockOutlined/>} placeholder={t("newPasswordPlaceholder") || 'Придумайте новый пароль'}/>
                </Form.Item>

                <Form.Item
                    name="confirmPassword"
                    dependencies={["password"]}
                    rules={[
                        {required: true, message: t("passwordConfirmRequired") || 'Пожалуйста, подтвердите пароль!'},
                        ({getFieldValue}) => ({
                            validator(_, value) {
                                if (!value || getFieldValue("password") === value) return Promise.resolve();
                                return Promise.reject(t("passwordsDoNotMatch") || 'Пароли не совпадают!');
                            },
                        }),
                    ]}
                >
                    <Input.Password prefix={<LockOutlined/>} placeholder={t("confirmPasswordPlaceholder") || 'Подтвердите новый пароль'}/>
                </Form.Item>

                {/* Опциональный raw MasterKey */}
                <Collapse
                    ghost
                    style={{marginBottom: 16}}
                    items={[{
                        key: '1',
                        label: <span style={{fontSize: 13}}><KeyOutlined/> {t("resetPassMasterKeyLabel") || "У меня есть ключ шифрования (MasterKey)"}</span>,
                        children: (
                            <>
                                <Alert
                                    type="warning"
                                    showIcon
                                    style={{marginBottom: 8, fontSize: 12, background: 'transparent', border: '1px solid var(--warning-color, #faad14)'}}
                                    message={t("resetPassMasterKeyWarning") || "Если вы не укажете сохранённый ключ шифрования, все зашифрованные данные будут безвозвратно удалены. Новый ключ можно будет создать после входа."}
                                />
                                <Form.Item name="rawMasterKey" style={{marginBottom: 0}}>
                                    <Input
                                        prefix={<KeyOutlined/>}
                                        placeholder={t("resetPassMasterKeyPlaceholder") || "Вставьте raw MasterKey"}
                                        value={rawMasterKey}
                                        onChange={e => setRawMasterKey(e.target.value)}
                                        style={{fontFamily: 'monospace'}}
                                    />
                                </Form.Item>
                            </>
                        )
                    }]}
                />

                <Form.Item>
                    <Button block type="primary" htmlType="submit" style={{color: "black"}}>
                        {t("changePasswordButton") || 'Сменить пароль'}
                    </Button>
                </Form.Item>
            </Form>
        </div>
    );
}
