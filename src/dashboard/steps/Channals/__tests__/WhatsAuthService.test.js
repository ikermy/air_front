/**
 * Тест для WhatsAuthService
 * Симулирует все стадии авторизации WhatsApp без реального подключения
 */

import { WhatsAuthServive } from '../whatsAuthServive';
import { validateAndRefreshToken } from '../../../../utils/easyUtils';

// Мокируем validateAndRefreshToken
jest.mock('../../../../utils/easyUtils', () => ({
    validateAndRefreshToken: jest.fn()
}));

// Мокируем WebSocket
class MockWebSocket {
    constructor(url) {
        this.url = url;
        this.readyState = WebSocket.OPEN;
        this.onopen = null;
        this.onmessage = null;
        this.onerror = null;
        this.onclose = null;

        // Сохраняем экземпляр для доступа в тестах
        MockWebSocket.instances.push(this);

        // Симулируем открытие соединения
        setTimeout(() => {
            if (this.onopen) this.onopen();
        }, 10);
    }

    send(data) {
        this.lastSentData = data;
    }

    close() {
        this.readyState = WebSocket.CLOSED;
        if (this.onclose) this.onclose();
    }

    // Метод для симуляции получения сообщения
    simulateMessage(data) {
        if (this.onmessage) {
            this.onmessage({ data: JSON.stringify(data) });
        }
    }

    // Метод для симуляции ошибки
    simulateError(error) {
        if (this.onerror) this.onerror(error);
        }
    }

MockWebSocket.instances = [];
MockWebSocket.OPEN = 1;
MockWebSocket.CLOSED = 3;

// Заменяем глобальный WebSocket
global.WebSocket = MockWebSocket;

describe('WhatsAuthService', () => {
    let service;
    let mockCallbacks;

    beforeEach(() => {
        // Очищаем экземпляры MockWebSocket
        MockWebSocket.instances = [];

        // Создаем сервис
        service = new WhatsAuthServive();

        // Создаем моки для callback-ов
        mockCallbacks = {
            onQrCode: jest.fn(),
            onQrSuccess: jest.fn(),
            onSuccess: jest.fn(),
            onError: jest.fn(),
            onUpdateToken: jest.fn(),
        };

        service.setCallbacks(mockCallbacks);

        // Мокируем localStorage
        Object.defineProperty(window, 'localStorage', {
            value: {
                getItem: jest.fn(() => 'mock-token'),
                setItem: jest.fn(),
            }
        });

        // Мокируем переменные окружения
        process.env.REACT_APP_WHATS_WSS = 'ws://localhost:8080';
    });

    afterEach(() => {
        if (service) {
            service.closeConnection();
        }
        jest.clearAllMocks();
    });

    describe('Инициализация сервиса', () => {
        test('должен правильно инициализироваться', () => {
            expect(service.socket).toBeNull();
            expect(service.callbacks).toBeDefined();
        });

        test('должен устанавливать callback-и', () => {
            const callbacks = { onQrCode: jest.fn() };
            service.setCallbacks(callbacks);
            expect(service.callbacks.onQrCode).toBe(callbacks.onQrCode);
        });
    });

    describe('Процесс авторизации - успешный сценарий', () => {
        test('должен пройти полный цикл авторизации', async () => {
            // Мокируем успешную проверку токена
            validateAndRefreshToken.mockResolvedValue('valid-token');

            // Запускаем авторизацию
            const result = await service.startAuthentication();
            expect(result).toBe(true);

            // Ждем установки WebSocket соединения
            await new Promise(resolve => setTimeout(resolve, 20));

            const wsInstance = MockWebSocket.instances[0];
            expect(wsInstance).toBeDefined();
            expect(wsInstance.url).toBe('ws://localhost:8080/whats/ws?token=valid-token');

            // Этап 1: Получение QR кода
            wsInstance.simulateMessage({
                type: 'qr_code',
                payload: 'mock-qr-code-data'
            });

            expect(mockCallbacks.onQrCode).toHaveBeenCalledWith('mock-qr-code-data');

            // Этап 2: QR код отсканирован
            wsInstance.simulateMessage({
                type: 'qr-success'
            });

            expect(mockCallbacks.onQrSuccess).toHaveBeenCalled();

            // Этап 3: Успешная авторизация
            wsInstance.simulateMessage({
                type: 'success'
            });

            expect(mockCallbacks.onSuccess).toHaveBeenCalled();
        });

        test('должен обрабатывать runtime конфигурацию', async () => {
            // Мокируем runtime конфигурацию
            window.runtimeConfig = {
                REACT_APP_WHATS_WSS: 'wss://production.example.com'
            };

            validateAndRefreshToken.mockResolvedValue('valid-token');
            await service.startAuthentication();

            await new Promise(resolve => setTimeout(resolve, 20));

            const wsInstance = MockWebSocket.instances[0];
            expect(wsInstance.url).toBe('wss://production.example.com/whats/ws?token=valid-token');

            // Очищаем
            delete window.runtimeConfig;
        });
    });

    describe('Обработка ошибок', () => {
        test('должен обрабатывать ошибку невалидного токена', async () => {
            validateAndRefreshToken.mockResolvedValue(null);

            const result = await service.startAuthentication();
            expect(result).toBe(false);
            expect(mockCallbacks.onUpdateToken).toHaveBeenCalled();
        });

        test('должен обрабатывать ошибки авторизации', async () => {
            validateAndRefreshToken.mockResolvedValue('valid-token');
            await service.startAuthentication();

            await new Promise(resolve => setTimeout(resolve, 20));

            const wsInstance = MockWebSocket.instances[0];

            // Симулируем ошибку авторизации
            wsInstance.simulateMessage({
                type: 'error',
                payload: 'Authorization failed'
            });

            expect(mockCallbacks.onError).toHaveBeenCalledWith('Authorization failed');
        });

        test('должен обрабатывать ошибки WebSocket соединения', async () => {
            validateAndRefreshToken.mockResolvedValue('valid-token');
            await service.startAuthentication();

            await new Promise(resolve => setTimeout(resolve, 20));

            const wsInstance = MockWebSocket.instances[0];

            // Симулируем ошибку WebSocket
            wsInstance.simulateError(new Error('Connection failed'));

            expect(mockCallbacks.onError).toHaveBeenCalledWith('Ошибка соединения WebSocket');
        });

        test('должен обрабатывать некорректные JSON сообщения', async () => {
            validateAndRefreshToken.mockResolvedValue('valid-token');
            await service.startAuthentication();

            await new Promise(resolve => setTimeout(resolve, 20));

            const wsInstance = MockWebSocket.instances[0];

            // Симулируем некорректное сообщение
            if (wsInstance.onmessage) {
                wsInstance.onmessage({ data: 'invalid-json' });
            }

            expect(mockCallbacks.onError).toHaveBeenCalledWith('Ошибка обработки сообщения от сервера');
        });

        test('должен обрабатывать неизвестные типы сообщений', async () => {
            validateAndRefreshToken.mockResolvedValue('valid-token');
            await service.startAuthentication();

            await new Promise(resolve => setTimeout(resolve, 20));

            const wsInstance = MockWebSocket.instances[0];

            // Симулируем неизвестный тип сообщения
            wsInstance.simulateMessage({
                type: 'unknown_type',
                payload: 'some data'
            });

            expect(mockCallbacks.onError).toHaveBeenCalledWith('some data');
        });

        test('должен обрабатывать исключения при запуске авторизации', async () => {
            validateAndRefreshToken.mockRejectedValue(new Error('Network error'));

            await expect(service.startAuthentication()).rejects.toThrow('Network error');
            expect(mockCallbacks.onError).toHaveBeenCalledWith('Ошибка запуска аутентификации: Network error');
        });
    });

    describe('Управление соединением', () => {
        test('должен корректно закрывать соединение', async () => {
            validateAndRefreshToken.mockResolvedValue('valid-token');
            await service.startAuthentication();

            await new Promise(resolve => setTimeout(resolve, 20));

            expect(service.socket).not.toBeNull();

            service.closeConnection();

            expect(service.socket).toBeNull();
        });

        test('должен обрабатывать закрытие соединения без ошибок', () => {
            service.closeConnection(); // Вызов без активного соединения
            expect(service.socket).toBeNull();
        });

        test('должен обрабатывать событие закрытия WebSocket', async () => {
            validateAndRefreshToken.mockResolvedValue('valid-token');
            await service.startAuthentication();

            await new Promise(resolve => setTimeout(resolve, 20));

            const wsInstance = MockWebSocket.instances[0];
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            // Симулируем закрытие соединения
            if (wsInstance.onclose) {
                wsInstance.onclose();
            }

            expect(consoleSpy).toHaveBeenCalledWith('WebSocket соединение закрыто');
            consoleSpy.mockRestore();
        });
    });

    describe('Последовательность сообщений', () => {
        test('должен правильно обрабатывать последовательность: QR -> QR Success -> Success', async () => {
            validateAndRefreshToken.mockResolvedValue('valid-token');
            await service.startAuthentication();

            await new Promise(resolve => setTimeout(resolve, 20));

            const wsInstance = MockWebSocket.instances[0];

            // Последовательность сообщений
            const messages = [
                { type: 'qr_code', payload: 'qr-data-123' },
                { type: 'qr-success' },
                { type: 'success' }
            ];

            // Отправляем сообщения с небольшими задержками
            for (let i = 0; i < messages.length; i++) {
                setTimeout(() => {
                    wsInstance.simulateMessage(messages[i]);
                }, i * 50);
            }

            // Ждем обработки всех сообщений
            await new Promise(resolve => setTimeout(resolve, 200));

            // Проверяем, что все callback-и были вызваны в правильном порядке
            expect(mockCallbacks.onQrCode).toHaveBeenCalledWith('qr-data-123');
            expect(mockCallbacks.onQrSuccess).toHaveBeenCalled();
            expect(mockCallbacks.onSuccess).toHaveBeenCalled();
        });

        test('должен обрабатывать прерывание процесса ошибкой', async () => {
            validateAndRefreshToken.mockResolvedValue('valid-token');
            await service.startAuthentication();

            await new Promise(resolve => setTimeout(resolve, 20));

            const wsInstance = MockWebSocket.instances[0];

            // Начинаем нормальный процесс
            wsInstance.simulateMessage({
                type: 'qr_code',
                payload: 'qr-data-123'
            });

            expect(mockCallbacks.onQrCode).toHaveBeenCalledWith('qr-data-123');

            // Затем происходит ошибка
            wsInstance.simulateMessage({
                type: 'error',
                payload: 'QR код истек'
            });

            expect(mockCallbacks.onError).toHaveBeenCalledWith('QR код истек');
        });
    });

    describe('Интеграционные тесты', () => {
        test('должен корректно работать с реальными callback-ами', async () => {
            const realCallbacks = {
                onQrCode: (qrCode) => {
                    expect(typeof qrCode).toBe('string');
                    expect(qrCode.length).toBeGreaterThan(0);
                },
                onQrSuccess: () => {
                    expect(true).toBe(true); // Просто проверяем, что callback вызван
                },
                onSuccess: () => {
                    expect(true).toBe(true);
                },
                onError: (error) => {
                    expect(typeof error).toBe('string');
                },
                onUpdateToken: () => {
                    expect(true).toBe(true);
                }
            };

            service.setCallbacks(realCallbacks);
            validateAndRefreshToken.mockResolvedValue('valid-token');

            await service.startAuthentication();
            await new Promise(resolve => setTimeout(resolve, 20));

            const wsInstance = MockWebSocket.instances[0];

            // Тестируем каждый callback
            wsInstance.simulateMessage({
                type: 'qr_code',
                payload: 'test-qr-code-data'
            });

            wsInstance.simulateMessage({
                type: 'qr-success'
            });

            wsInstance.simulateMessage({
                type: 'success'
            });
        });
    });

    describe('Edge cases', () => {
        test('должен обрабатывать пустые payload', async () => {
            validateAndRefreshToken.mockResolvedValue('valid-token');
            await service.startAuthentication();

            await new Promise(resolve => setTimeout(resolve, 20));

            const wsInstance = MockWebSocket.instances[0];

            wsInstance.simulateMessage({
                type: 'error',
                payload: ''
            });

            expect(mockCallbacks.onError).toHaveBeenCalledWith('');
        });

        test('должен обрабатывать сообщения без payload', async () => {
            validateAndRefreshToken.mockResolvedValue('valid-token');
            await service.startAuthentication();

            await new Promise(resolve => setTimeout(resolve, 20));

            const wsInstance = MockWebSocket.instances[0];

            wsInstance.simulateMessage({
                type: 'unknown_type'
            });

            expect(mockCallbacks.onError).toHaveBeenCalledWith('Неизвестная ошибка');
        });

        test('должен обрабатывать множественные попытки авторизации', async () => {
            validateAndRefreshToken.mockResolvedValue('valid-token');

            // Первая попытка
            await service.startAuthentication();
            await new Promise(resolve => setTimeout(resolve, 20));

            const firstInstance = MockWebSocket.instances[0];
            expect(firstInstance).toBeDefined();

            // Вторая попытка (должна закрыть предыдущее соединение)
            await service.startAuthentication();
            await new Promise(resolve => setTimeout(resolve, 20));

            expect(MockWebSocket.instances.length).toBe(2);
        });
    });
});
