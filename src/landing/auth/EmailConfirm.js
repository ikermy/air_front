import React, {useEffect, useState} from "react";
import {useSearchParams} from "react-router-dom";
import {CheckOutlined, LoadingOutlined, CloseCircleOutlined} from '@ant-design/icons';
import {goToLanding} from "../../utils/goToLanding";

function EmailConfirm() {
    const [status, setStatus] = useState("loading");
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const confirmEmail = () => {
            const key = searchParams.get("key");
            if (key) {
                // Endpoint confirms the email and redirects to /?confirm=...
                // where Home displays the result. Do not fetch it as JSON.
                window.location.replace(`/v1/auth/email/confirm?key=${encodeURIComponent(key)}`);
            } else {
                setStatus("error");
                setTimeout(() => {
                    goToLanding('login');
                }, 5000);
            }
        }

        confirmEmail();
    }, [searchParams]);

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

