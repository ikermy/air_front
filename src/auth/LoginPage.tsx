import React, { useEffect, useState } from 'react';
import { message, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';
import { AuthForm } from '../landing/auth/AuthForm';
import { RegForm } from '../landing/auth/RegForm';
import { RestoreMail } from '../landing/auth/RestoreMail';
import {
  handleDeny,
  handleDenyMail,
  handleDiasbled,
  handleError,
  handleFalure,
  handleNotConfirmed,
  handleSuccess,
} from '../landing/auth/notificationHandlers';
import { useAuth } from '../AuthContext';
import { goToLanding } from '../utils/goToLanding';
import './LoginPage.css';

type Mode = 'login' | 'register' | 'restore';

/**
 * Страница входа в дашборд.
 *
 * Зачем отдельный маршрут, а не модалка как раньше: формы авторизации жили
 * внутри модальных окон старого лендинга (src/landing/Hero.jsx и
 * src/menu/TopMenu.jsx). Новый лендинг переехал в App Router и этих
 * компонентов не использует, поэтому у дашборд не осталось ни одной точки
 * входа. `/login` — самостоятельная страница внутри SPA, на которую ведут
 * и CTA лендинга, и редирект ProtectedRoute.
 *
 * Сами формы переиспользуются как есть: их логика и сетевые контракты
 * (/v1/auth/login, поля a/b/c/d, totp_required, master) не менялись.
 * Изменился только контейнер — вместо Modal это полноценная страница,
 * поэтому setMainModalOpen получает no-op, а confirm={true} гасит попытки
 * форм «закрыть модалку», которой больше нет.
 */
function LoginPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [messageApi, contextHolder] = message.useMessage();
  const { isAuthenticated, isAuthReady } = useAuth();
  const navigate = useNavigate();

  // Авторизованному тут делать нечего: и прямой заход на /login,
  // и возврат «назад» после логина должны вести в дашборд.
  useEffect(() => {
    if (isAuthReady && isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthReady, isAuthenticated, navigate]);

  // Модалки нет — форме нечего закрывать.
  const noopModal = () => {};

  const titles: Record<Mode, string> = {
    login: 'Вход в панель управления',
    register: 'Создание аккаунта',
    restore: 'Восстановление пароля',
  };

  const subtitles: Record<Mode, string> = {
    login: 'Войдите, чтобы управлять своими AI-агентами.',
    register: '30 дней бесплатно, без привязки карты.',
    restore: 'Укажите email — вышлем ссылку для смены пароля.',
  };

  // Пока не завершилась попытка автологина по refresh-токену, не показываем
  // форму — иначе «Запомнить меня» мигало бы требованием пароля.
  if (!isAuthReady) {
    return (
      <div className="login-page">
        <Spin size="large" description="Загрузка..." />
      </div>
    );
  }

  return (
    <div className="login-page">
      {contextHolder}

      <div className="login-page__card">
        <button
          type="button"
          className="login-page__back"
          onClick={() => goToLanding()}
        >
          ← На главную
        </button>

        <h1 className="login-page__title">{titles[mode]}</h1>
        <p className="login-page__subtitle">{subtitles[mode]}</p>

        <div className="login-page__form">
          {mode === 'restore' && (
            <RestoreMail
              confirm
              setMainModalOpen={noopModal}
              handleDenyMail={() => handleDenyMail(messageApi)}
              handleSuccess={() => handleSuccess(messageApi)}
              handleError={() => handleError(messageApi)}
            />
          )}

          {mode === 'login' && (
            <AuthForm
              confirm
              setMainModalOpen={noopModal}
              /* mirror={true} раскрывает у формы ссылку «Зарегистрироваться» */
              mirror
              setMirror={() => setMode('register')}
              setRestoreMail={() => setMode('restore')}
              handleError={() => handleError(messageApi)}
              handleDeny={() => handleDeny(messageApi)}
              handleDiasbled={() => handleDiasbled(messageApi)}
              handleNotConfirmed={() => handleNotConfirmed(messageApi)}
            />
          )}

          {mode === 'register' && (
            <RegForm
              demo
              /* mirror={true} раскрывает ссылку «Уже есть аккаунт» */
              mirror
              setMirror={() => setMode('login')}
              setMainModalOpen={noopModal}
              handleSuccess={() => handleSuccess(messageApi)}
              handleFalure={() => handleFalure(messageApi)}
              handleError={() => handleError(messageApi)}
            />
          )}
        </div>

        {mode === 'restore' && (
          <button
            type="button"
            className="login-page__switch"
            onClick={() => setMode('login')}
          >
            Вернуться ко входу
          </button>
        )}
      </div>
    </div>
  );
}

export default LoginPage;
