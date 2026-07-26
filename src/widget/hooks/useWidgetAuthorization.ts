import {useEffect, useState} from 'react';
import {checkWidgetAvailability, requestWidgetExam} from "../widgetUtils";

export type WidgetAuthorizationState =
    | 'loading'
    | 'authorized'
    | 'nameInput'
    | 'disconnected'
    | 'invalidRequest'
    | 'forbiddenOrigin'
    | 'paymentRequired'
    | 'tooManyRequests'
    | 'botNotFound'
    | 'botStopped'
    | 'serverError'
    | 'networkError'
    | 'unknownError';

interface UseWidgetAuthorizationOptions {
    widgetCode: string;
    responderId: string | number;
    connected?: boolean;
    setToken: (token: string) => void;
    setConnected: (connected: boolean) => void;
}

const statusToState: Record<number, WidgetAuthorizationState> = {
    400: 'invalidRequest',
    402: 'paymentRequired',
    403: 'forbiddenOrigin',
    404: 'botNotFound',
    429: 'tooManyRequests',
    500: 'serverError',
    503: 'botStopped',
};

export function useWidgetAuthorization({
    widgetCode,
    responderId,
    connected,
    setToken,
    setConnected,
}: UseWidgetAuthorizationOptions) {
    const [state, setState] = useState<WidgetAuthorizationState>('loading');
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    useEffect(() => {
        let disposed = false;

        const checkConnection = async () => {
            try {
                await checkWidgetAvailability();
                if (!disposed) setConnected(true);
            } catch (error) {
                console.error('Widget availability check failed:', {
                    status: (error as {status?: number}).status,
                    message: (error as Error).message,
                });
                if (!disposed) {
                    setConnected(false);
                    setState('disconnected');
                }
            }
        };

        void checkConnection();
        const interval = window.setInterval(checkConnection, 5000);
        return () => {
            disposed = true;
            window.clearInterval(interval);
        };
    }, [setConnected]);

    useEffect(() => {
        if (!connected || setConnected == null) return;

        let disposed = false;
        const requestExam = async () => {
            try {
                const data = await requestWidgetExam({widgetCode, c: responderId});
                if (!disposed) {
                    setToken(data.token);
                    setState('loading');
                }
            } catch (error) {
                if (disposed) return;
                const status = (error as {status?: number}).status;
                setState(status ? (statusToState[status] || 'unknownError') : 'networkError');
            } finally {
                if (!disposed) setIsInitialLoading(false);
            }
        };

        void requestExam();
        return () => { disposed = true; };
    }, [connected, responderId, setConnected, setToken, widgetCode]);

    return {state, setState, isInitialLoading};
}
