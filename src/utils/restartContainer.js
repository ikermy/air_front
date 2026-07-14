import { authFetch } from './easyUtils';

// Функция для перезапуска контейнера (использует authFetch для автоматизации токенов)
export async function restartContainer() {
    return authFetch(`/v1/api/restart-container`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    });
}
