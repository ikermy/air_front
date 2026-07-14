import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector'

// Базовый язык загружается сразу (русский или английский)
import translationRu from './locales/ru/translation.json';
import translationEn from './locales/en/translation.json';

// Динамическая загрузка дополнительных языков
const loadLanguageAsync = async (lng) => {
    try {
        const translation = await import(`./locales/${lng}/translation.json`);
        i18n.addResourceBundle(lng, 'translation', translation.default, true, true);
        return translation.default;
    } catch (error) {
        console.warn(`Failed to load language: ${lng}`, error);
        return null;
    }
};

const resources = {
    ru: {
        translation: translationRu
    },
    en: {
        translation: translationEn
    }
    // Другие языки будут загружены по требованию
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        debug: false, // Отключаем дебаг в продакшене
        detection: {
            order: ['querystring', 'cookie', 'localStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],
            caches: ['cookie', 'localStorage']
        },
        resources,
        fallbackLng: 'en',
        keySeparator: false,
        interpolation: {
            escapeValue: false
        }
    })
    .then(() => {
        // console.log('i18next initialized');
    })
    .catch(err => {
        console.error('i18next initialization failed', err);
    });

// Обработчик смены языка с динамической загрузкой
i18n.on('languageChanged', async (lng) => {
    // Если язык еще не загружен, загружаем его
    if (!i18n.hasResourceBundle(lng, 'translation')) {
        await loadLanguageAsync(lng);
    }
});

export default i18n;
export { loadLanguageAsync };

