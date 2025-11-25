export const handleSuccess = (messageApi) => {
    messageApi.open({
        type: 'loading',
        content: 'Отправка сообщения...',
    });
    setTimeout(() => {
        messageApi.open({
            type: 'success',
            content: 'Ссылка с кодом подтверждения успешно отправлена на вашу почту!',
            duration: 3,
        });
    }, 2000);
};

export const handleResetPassSuccess = (messageApi) => {
    messageApi.open({
        type: 'success',
        content: 'Пароль успешно изменён!',
        duration: 3,
    })
};

export const handleFalure = (messageApi) => {
    messageApi.open({
        type: 'error',
        content: 'Вы не приняли нашу политику конфиденциальности!',
    });
};

export const handleError = (messageApi) => {
    messageApi.open({
        type: 'error',
        duration: 5,
        content: 'Внутренняя ошибка, повторите попытку позже!',
    });
};

export const handleDeny = (messageApi) => {
    messageApi.open({
        type: 'warning',
        duration: 5,
        content: 'В авторизации отказано, проверьте email и пароль!',
    });
};

export const handleNotConfirmed = (messageApi) => {
    messageApi.open({
        type: 'warning',
        duration: 5,
        content: 'Адрес электронной почты не подтвержден!',
    });
};

export const handleDiasbled = (messageApi) => {
    messageApi.open({
        type: 'warning',
        duration: 5,
        content: 'Учетная запись заблокированная!',
    });
};

export const handleDenyMail = (messageApi) => {
    messageApi.open({
        type: 'warning',
        duration: 5,
        content: 'Указанный email не зарегистрирован в системе!',
    });
};