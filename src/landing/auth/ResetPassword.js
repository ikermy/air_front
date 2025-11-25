import React, {useContext, useEffect, useState} from "react";
import {useSearchParams, useNavigate} from "react-router-dom";
import {handleError, handleResetPassSuccess} from "./notificationHandlers";
import {message} from "antd";
import './auth.css';
import {CheckOutlined, LoadingOutlined, CloseCircleOutlined} from '@ant-design/icons';
import {UserContext} from "../../index";
import {ResetPass} from "./resetPass";

// const LAND_URL = process.env.REACT_APP_LAND;
const LAND_URL = window.runtimeConfig?.REACT_APP_LAND || process.env.REACT_APP_LAND;

function ResetPassword() {
    const [status, setStatus] = useState("loading");
    const [email, setEmail] = useState("");
    const [token, setToken] = useState("");
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [messageApi, contextHolder] = message.useMessage();
    const userId = useContext(UserContext); // Получаю значение userId из контекста (он же в контейнере)

    useEffect(() => {
        const confirmEmail = async () => {
            const key = searchParams.get("key");

            if (key) {
                try {
                    const response = await fetch(`${LAND_URL}/checkreset`, {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            "a": userId,
                            "b": key,
                        })
                    });
                    const data = await response.json();

                    if (response.ok && data.status === "success") {
                        setEmail(data.email);
                        setToken(data.token);
                        setStatus("success");

                    } else {
                        setStatus("error");
                    }
                } catch (error) {
                    console.error("Ошибка сброса пароля:", error);
                    setStatus("error");
                }
            } else {
                console.error("Ошибка сброса пароля, не получен ключ");
                setStatus("error");
            }
        }

        confirmEmail();
    }, [searchParams, navigate, userId]);

    return (
        <div className="confirmation-container">
            {contextHolder}
            {status === "loading" && (
                <div>
                    <LoadingOutlined/>
                    <h2>Подтверждение email...</h2>
                </div>
            )}

            {status === "success" && (
                <div className="success-state">
                    <h2><CheckOutlined/> Введите новый пароль</h2>
                    <ResetPass
                        userId={userId}
                        email={email}
                        token={token}
                        handleSuccess={() => handleResetPassSuccess(messageApi)}
                        handleError={() => handleError(messageApi)}
                    />
                </div>
            )}

            {status === "error" && (
                <div>
                    <CloseCircleOutlined/>
                    <h2>Ошибка смены пароля</h2>
                </div>
            )}
        </div>
    );
}

export default ResetPassword;

