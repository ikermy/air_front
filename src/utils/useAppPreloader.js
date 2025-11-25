import { useEffect } from 'react';
import imagePreloader from './ImagePreloader';

/**
 * Хук для предзагрузки критически важных изображений приложения
 */
export const useAppPreloader = () => {
    useEffect(() => {
        const preloadCriticalImages = async () => {
            const criticalImages = [
                // Флаги для переключателя языков
                '/flags/ru.png',
                '/flags/en.png',
                '/flags/es.png',
                // Можно добавить другие критически важные изображения
                '/landing/chan_l.png',
                '/landing/chan_d.png',
                '/landing/dialogs_l.png',
                '/landing/dialogs_d.png'
            ];

            try {
                await imagePreloader.preloadBatch(criticalImages);
                console.log('Критически важные изображения предзагружены');
            } catch (error) {
                console.warn('Ошибка предзагрузки критических изображений:', error);
            }
        };

        preloadCriticalImages();
    }, []);
};

export default useAppPreloader;
