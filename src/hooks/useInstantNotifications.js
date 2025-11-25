import { useEffect } from 'react';
import { instantNotificationService } from '../service/instantNotificationService';
import { showInstantNotification } from '../dashboard/hotification/showNotification';

export const useInstantNotifications = (token) => {
    useEffect(() => {
        if (!token) {
            return;
        }

        const handleMessage = (message) => {
            showInstantNotification(
                message.title || 'Уведомление',
                message.Msg || message.message
            );
        };

        instantNotificationService.addListener(handleMessage);
        instantNotificationService.connect(token);

        return () => {
            instantNotificationService.removeListener(handleMessage);
            instantNotificationService.disconnect();
        };
    }, [token]);
};
