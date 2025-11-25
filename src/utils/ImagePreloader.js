// Глобальная утилита для предзагрузки изображений
class ImagePreloader {
    constructor() {
        this.cache = new Map();
        this.preloadPromises = new Map();
    }

    /**
     * Предзагружает изображение и возвращает Promise
     * @param {string} src - URL изображения
     * @returns {Promise<HTMLImageElement>}
     */
    preload(src) {
        // Если изображение уже загружено, возвращаем его из кэша
        if (this.cache.has(src)) {
            return Promise.resolve(this.cache.get(src));
        }

        // Если уже идет загрузка, возвращаем существующий Promise
        if (this.preloadPromises.has(src)) {
            return this.preloadPromises.get(src);
        }

        const promise = new Promise((resolve, reject) => {
            const img = new Image();

            img.onload = () => {
                this.cache.set(src, img);
                this.preloadPromises.delete(src);
                resolve(img);
            };

            img.onerror = () => {
                this.preloadPromises.delete(src);
                reject(new Error(`Failed to load image: ${src}`));
            };

            img.src = src;
        });

        this.preloadPromises.set(src, promise);
        return promise;
    }

    /**
     * Предзагружает массив изображений
     * @param {string[]} sources - Массив URL изображений
     * @returns {Promise<HTMLImageElement[]>}
     */
    preloadBatch(sources) {
        return Promise.all(sources.map(src => this.preload(src)));
    }

    /**
     * Проверяет, загружено ли изображение
     * @param {string} src - URL изображения
     * @returns {boolean}
     */
    isLoaded(src) {
        return this.cache.has(src);
    }

    /**
     * Получает загруженное изображение из кэша
     * @param {string} src - URL изображения
     * @returns {HTMLImageElement|null}
     */
    getFromCache(src) {
        return this.cache.get(src) || null;
    }

    /**
     * Очищает кэш
     */
    clearCache() {
        this.cache.clear();
        this.preloadPromises.clear();
    }
}

// Создаем глобальный экземпляр
const imagePreloader = new ImagePreloader();

export default imagePreloader;
