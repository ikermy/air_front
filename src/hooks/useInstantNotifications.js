import { useEffect } from 'react';
import { instantNotificationService } from '../service/instantNotificationService';
import { showInstantNotification } from '../dashboard/hotification/showNotification';

export const useInstantNotifications = () => {
    useEffect(() => {
        const handleMessage = (message) => {
            showInstantNotification(
                message.title || 'Уведомление',
                message.Msg || message.message
            );
        };

        instantNotificationService.addListener(handleMessage);
        instantNotificationService.connect().then(r => {});

        return () => {
            instantNotificationService.removeListener(handleMessage);
            instantNotificationService.disconnect();
        };
    }, []);
};
