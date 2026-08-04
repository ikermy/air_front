/**
 * Сервис для авторизации Avito через OAuth
 * Использует polling для отслеживания статуса авторизации вместо редиректов
 */

import { AvitoAuthURLResponse, AvitoAuthCallbacks } from './avitoTypes';
import { getAvitoStatus } from './avitoUtils';
import { authFetch } from '../../../utils/easyUtils';

export class AvitoAuthService {
    private callbacks: AvitoAuthCallbacks = {};
    private authWindow: Window | null = null;
    private pollingInterval: NodeJS.Timeout | null = null;
    private windowCheckInterval: NodeJS.Timeout | null = null;
    private messageHandler: ((event: MessageEvent) => void) | null = null;
    private authCompleted: boolean = false;

    /**
     * Устанавливает обработчики событий
     */
    setCallbacks(callbacks: AvitoAuthCallbacks): void {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    /**
     * Получает OAuth URL через Landing и открывает окно авторизации
     */
    async startAuthentication(url: string, clientId: string, clientSecret: string): Promise<void> {
        try {
            // Запрос к Landing (Landing извлечет UID из токена)
            const response = await authFetch(`/v1/avito/auth/url`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: url,
                    client_id: clientId,
                    client_secret: clientSecret
                }),
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Токен истёк, необходимо войти заново');
                }
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const data: AvitoAuthURLResponse = await response.json();

            if (!data.auth_url) {
                throw new Error('Не получен auth_url от сервера');
            }

            // Открываем popup окно для авторизации
            this.openAuthWindow(data.auth_url);

            // Запускаем polling статуса
            this.startPolling();

        } catch (error) {
            console.error('[Avito Auth] Ошибка:', error);
            const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';

            if (this.callbacks.onError) {
                this.callbacks.onError(errorMessage);
            }

            throw error;
        }
    }

    /**
     * Открывает popup окно для авторизации Avito
     */
    private openAuthWindow(authUrl: string): void {
        const width = 600;
        const height = 700;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;

        const features = `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`;

        this.authWindow = window.open(authUrl, 'AvitoOAuth', features);

        if (!this.authWindow) {
            const error = 'Не удалось открыть окно авторизации. Проверьте настройки блокировки всплывающих окон.';
            if (this.callbacks.onError) {
                this.callbacks.onError(error);
            }
            throw new Error(error);
        }

        // Настраиваем обработчик postMessage для получения событий от popup
        this.setupPostMessageHandler();

        // Проверяем, закрыл ли пользователь окно вручную
        this.windowCheckInterval = setInterval(() => {
            if (this.authWindow?.closed) {
                this.stopPolling();
                this.stopWindowCheck();
                this.removePostMessageHandler();
                // Не вызываем onError, так как пользователь мог закрыть окно после успешной авторизации
            }
        }, 500);
    }

    /**
     * Настраивает обработчик postMessage для межоконной коммуникации
     */
    private setupPostMessageHandler(): void {
        this.messageHandler = (event: MessageEvent) => {
            if (this.authCompleted) return;

            const data = event.data || {};

            // Обработка успешной авторизации
            if (data.type === 'avito_oauth_success' && data.success) {
                this.authCompleted = true;
                this.stopPolling();
                this.stopWindowCheck();
                this.removePostMessageHandler();

                if (this.callbacks.onSuccess) {
                    this.callbacks.onSuccess();
                }

                this.cleanup();
                return;
            }

            // Обработка ошибки
            if (data.type === 'avito_oauth_error') {
                console.error('[Avito Auth] Ошибка OAuth (получено postMessage):', data.error);
                this.authCompleted = true;
                this.stopPolling();
                this.stopWindowCheck();
                this.removePostMessageHandler();

                if (this.callbacks.onError) {
                    this.callbacks.onError(data.error || 'Ошибка авторизации');
                }

                this.cleanup();
            }
        };

        window.addEventListener('message', this.messageHandler, false);
    }

    /**
     * Удаляет обработчик postMessage
     */
    private removePostMessageHandler(): void {
        if (this.messageHandler) {
            window.removeEventListener('message', this.messageHandler);
            this.messageHandler = null;
        }
    }

    /**
     * Запускает polling статуса авторизации
     */
    private startPolling(): void {
        this.pollingInterval = setInterval(async () => {
            if (this.authCompleted) {
                this.stopPolling();
                return;
            }

            try {
                const status = await getAvitoStatus();

                if (status.connected && !this.authCompleted) {
                    this.authCompleted = true;
                    this.stopPolling();
                    this.stopWindowCheck();
                    this.removePostMessageHandler();

                    if (this.callbacks.onSuccess) {
                        this.callbacks.onSuccess();
                    }

                    this.cleanup();
                }
            } catch (error) {
                console.error('[Avito Auth] Ошибка при polling:', error);
                // Продолжаем polling даже при ошибке
            }
        }, 2000); // Проверяем каждые 2 секунды
    }

    /**
     * Останавливает polling
     */
    private stopPolling(): void {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    /**
     * Останавливает проверку закрытия окна
     */
    private stopWindowCheck(): void {
        if (this.windowCheckInterval) {
            clearInterval(this.windowCheckInterval);
            this.windowCheckInterval = null;
        }
    }

    /**
     * Очистка ресурсов
     */
    private cleanup(): void {
        this.stopPolling();
        this.stopWindowCheck();
        this.removePostMessageHandler();

        if (this.authWindow && !this.authWindow.closed) {
            this.authWindow.close();
        }
        this.authWindow = null;
        this.authCompleted = false;
    }

    /**
     * Уничтожает сервис и очищает все ресурсы
     */
    destroy(): void {
        this.cleanup();
        this.callbacks = {};
    }
}

