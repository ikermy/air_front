import React, {useContext} from 'react';
import {MailOutlined} from '@ant-design/icons';
import {Button, Form, Input} from 'antd';
import './auth.css';
import { useNavigate } from "react-router-dom";
import {UserContext} from "../../index";

const LAND_URL = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND) || process.env.REACT_APP_LAND;

async function sendRestoreData({userId, mail}) {
    try {
        const response = await fetch(`${LAND_URL}/rest`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                "a": userId,
                "b": mail,
            })
        });

        // Специальная обработка для ошибки превышения лимита запросов
        if (response.status === 429) {

            return {status: "429"};
        }

        if (!response.ok) {
            return {status: "error"}
        }

        const data = await response.json();

        if (data.a) {
            return {status: "exist"};
        } else {
            return {status: "not"};
        }

    } catch (error) {
        console.error(error)
        return {status: "error"}
    }
}

export function RestoreMail({setMainModalOpen, handleSuccess, handleError, handleDenyMail, confirm}) {
    const [form] = Form.useForm(); // Создаём экземпляр формы
    const [isButtonDisabled, setIsButtonDisabled] = React.useState(false);
    const navigate = useNavigate();
    const userId = useContext(UserContext); // Получаю значение userId из контекста (он же в контейнере)

    const onFinish = async (values) => {
        const result = await sendRestoreData({userId, mail: values.email});

        switch (result.status) {
            case "exist":
                if (!confirm) setMainModalOpen(false);
                handleSuccess();
                setTimeout(() => {
                    navigate("/");
                }, 5000);
                break;

            case "429":
                form.setFields([
                    {
                        name: 'email',
                        errors: ['Слишком много запросов. Пожалуйста, подождите.']
                    }
                ]);
                // Отключаем кнопку на 2 секунды
                setIsButtonDisabled(true);
                setTimeout(() => {
                    setIsButtonDisabled(false);
                }, 5000);
                break

            case "not":
                // Устанавливаем ошибку валидации на поле email
                form.setFields([
                    {
                        name: 'email',
                        errors: ['Email не зарегистрирован в системе!']
                    }
                ]);
                handleDenyMail()
                break;

            default:
                setMainModalOpen(false);
                handleError();
        }
    };

    return (
        <div className="sub-modal">
            <br/>
            <Form
                form={form}
                name="restMail"
                style={{maxWidth: 400}}
                onFinish={onFinish}
            >
                <Form.Item
                    name="email"
                    rules={[
                        {
                            type: "email",
                            message: "Введите корректный адрес электронной почты!",
                        },
                        {
                            required: true,
                            message: "Пожалуйста, введите адрес электронной почты!",
                        },
                    ]}
                >
                    <Input prefix={<MailOutlined/>} placeholder="Введите email"/>
                </Form.Item>

                <Form.Item>
                    <Button
                        block
                        type="primary"
                        htmlType="submit"
                        disabled={isButtonDisabled}
                        style={{
                            color: "black",
                        }}
                    >
                        Восстановить пароль
                    </Button>
                </Form.Item>
            </Form>
        </div>
    );
}
