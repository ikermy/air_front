import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector'

// Импорт языковых файлов
import translationRu from './locales/ru/translation.json';
import translationEn from './locales/en/translation.json';
import translationEs from './locales/es/translation.json';

const resources = {
    ru: {
        translation: translationRu
    },
    en: {
        translation: translationEn
    },
    es: {
        translation: translationEs
    }
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        debug: true,
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
