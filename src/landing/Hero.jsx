import React, {useEffect, useState} from 'react';
import {useTranslation} from "react-i18next";
import './hero.css';
import Modal from "../Modal";
import {RegForm} from "./auth/RegForm";
import {message} from "antd";
import {AuthForm} from "./auth/AuthForm";
import {
    handleDeny,
    handleDenyMail,
    handleDiasbled,
    handleError,
    handleFalure, handleNotConfirmed,
    handleSuccess
} from "./auth/notificationHandlers";
import {RestoreMail} from "./auth/RestoreMail";
import {useAuth} from "../AuthContext";
import {useNavigate} from "react-router-dom";
import {trackVisitor} from "../utils/tracking";
import {getOrSetUserId} from "../utils/getOrSetUserId";


const HeroSection = () => {
    const {t} = useTranslation();
    const [isModalOpen, setIsModalOpen] = useState(false); // Состояние для модального окна
    const [messageApi, contextHolder] = message.useMessage();
    const [mirror, setMirror] = useState(false);
    const [restore, setRestore] = useState(false);
    const {isAuthenticated} = useAuth();
    const navigate = useNavigate();

    const [userId] = useState(getOrSetUserId()); // Вызываем функцию ииии получаем userId, ведь так?!

    // Управляем классом modal-open для body при открытии/закрытии модального окна
    useEffect(() => {
        if (isModalOpen) {
            document.body.classList.add('modal-open');
        } else {
            document.body.classList.remove('modal-open');
        }

        // Очистка при размонтировании компонента
        return () => {
            document.body.classList.remove('modal-open');
        };
    }, [isModalOpen]);
    const handleOpenModal = () => {
        if (isAuthenticated) {
            navigate("/dashboard")
        } else {
            // трекинг открытия модалки — всегда отправляем (sampleRate:1, minIntervalMs:0)
            trackVisitor(userId, { event: 'open_try_modal', minIntervalMs: 0 });

            setIsModalOpen(true);
            setMirror(false)
            setRestore(false)
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };


    return (
        <>
            <div className="hero-main">
                {contextHolder} {/*для всплывающих сообщений*/}
                <h1><b className="highlight">{t('hero-h1-b')}</b>{t('hero-h1')}</h1>
                <h4>{t('hero-h4')}</h4>
                <div className="try" onClick={handleOpenModal}>{t('hero-try')}</div>

                {isModalOpen && (
                    <Modal onClose={handleCloseModal} itFreeClose={false}>
                        {restore ? (
                            <RestoreMail
                                setMainModalOpen={setIsModalOpen}
                                handleDenyMail={() => handleDenyMail(messageApi)}
                                handleSuccess={() => handleSuccess(messageApi)}
                                handleError={() => handleError(messageApi)}
                            />
                        ) : (
                            <>
                                {!mirror ? (
                                    <RegForm
                                        demo={true}
                                        setMirror={setMirror}
                                        setMainModalOpen={setIsModalOpen}
                                        handleSuccess={() => handleSuccess(messageApi)}
                                        handleFalure={() => handleFalure(messageApi)}
                                        handleError={() => handleError(messageApi)}
                                        mirror={!mirror}
                                    />
                                ) : (
                                    <AuthForm
                                        setMainModalOpen={setIsModalOpen}
                                        setMirror={setMirror}
                                        mirror={!mirror}
                                        setRestoreMail={setRestore}
                                        handleError={() => handleError(messageApi)}
                                        handleDeny={() => handleDeny(messageApi)}
                                        handleDiasbled={() => handleDiasbled(messageApi)}
                                        handleNotConfirmed={() => handleNotConfirmed(messageApi)}
                                    />
                                )}
                            </>
                        )}
                    </Modal>
                )}
            </div>
        </>
    );
};

export default HeroSection;
