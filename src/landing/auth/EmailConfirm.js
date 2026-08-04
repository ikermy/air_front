import React, {useEffect, useState} from "react";
import {useSearchParams, useNavigate} from "react-router-dom";
import {CheckOutlined, LoadingOutlined, CloseCircleOutlined} from '@ant-design/icons';
import {useAuth} from "../../AuthContext";

function EmailConfirm() {
    const [status, setStatus] = useState("loading");
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { setShowLoginForm } = useAuth();

    useEffect(() => {
        const confirmEmail = async () => {
            const key = searchParams.get("key");
            if (key) {

                try {
                    const response = await fetch(`/v1/auth/email/confirm?key=${key}`, {
                        method: "GET",
                        headers: {
                            "Accept": "application/json"
                        }
                    });
                    const data = await response.json();

                    if (response.ok && data.status === "success") {
                        setStatus("success");
                        setTimeout(() => {
                            setShowLoginForm(true)
                            navigate("/")
                        }, 3000);

                    } else {
                        setStatus("error");
                        setTimeout(() => {
                            navigate("/");
                        }, 5000);
                    }
                } catch (error) {
                    console.error("Ошибка подтверждения email:", error);
                    setStatus("error");
                    setTimeout(() => {
                        navigate("/");
                    }, 5000);
                }
            } else {
                setStatus("error");
                setTimeout(() => {
                    navigate("/");
                }, 5000);
            }
        }

        confirmEmail();
    }, [searchParams, navigate, setShowLoginForm]);

    return (
        <div className="confirmation-container">
            {/*{contextHolder}*/}
            {status === "loading" && (
                <div>
                    <LoadingOutlined />
                    <h2>Подтверждение email...</h2>
                </div>
            )}

            {status === "success" && (
                <div className="success-state">
                    <h2><CheckOutlined /> Ваш адрес электронной почты успешно подтвержден!</h2>
                </div>
            )}

            {status === "error" && (
                <div>
                    <CloseCircleOutlined />
                    <h2>Ошибка подтверждения адреса электронной почты</h2>
                </div>
            )}
        </div>
    );
}

export default EmailConfirm;

