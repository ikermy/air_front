import React, {useEffect, useState, useRef} from 'react';
import { useTranslation } from 'react-i18next';
import imagePreloader from './utils/ImagePreloader';
import './LanguageSwitcher.css';

const flags = {
    ru: '/flags/ru.png',
    en: '/flags/en.png',
    es: '/flags/es.png'
};

// Константы для доступных языков
const AVAILABLE_LANGUAGES = ['ru', 'en', 'es'];
const DEFAULT_LANGUAGE = 'ru';

// Функция для извлечения основной части языка и проверки доступности
const getAvailableLanguage = (language) => {
    if (!language) return DEFAULT_LANGUAGE;

    // Извлекаем основную часть языка (например, 'es' из 'es-AR')
    const mainLanguage = language.split('-')[0].toLowerCase();

    // Проверяем, есть ли этот язык в доступных
    return AVAILABLE_LANGUAGES.includes(mainLanguage) ? mainLanguage : DEFAULT_LANGUAGE;
};

function LanguageSwitcher() {
    const { i18n } = useTranslation();
    const [menuOpen, setMenuOpen] = useState(false);
    const [imagesLoaded, setImagesLoaded] = useState(false);
    const switcherRef = useRef(null);

    // Предзагружаем изображения флагов при загрузке компонента
    useEffect(() => {
        const preloadFlags = async () => {
            try {
                await imagePreloader.preloadBatch(Object.values(flags));
                setImagesLoaded(true);
            } catch (error) {
                console.warn('Ошибка предзагрузки флагов:', error);
                // Даже если предзагрузка не удалась, показываем компонент
                setImagesLoaded(true);
            }
        };

        preloadFlags();
    }, []);

    // Загружаем язык из localStorage при загрузке компонента
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedLanguage = localStorage.getItem('language');
            if (savedLanguage) {
                i18n.changeLanguage(savedLanguage);
            }
        }
    }, [i18n]);

    // Обработчик клика вне компонента
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (switcherRef.current && !switcherRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
        if (typeof window !== 'undefined') {
            localStorage.setItem('language', lng);
        }
        setMenuOpen(false);
    };

    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
    };

    // Получаем актуальный язык для отображения
    const currentLanguage = getAvailableLanguage(i18n.language);

    return (
        <div className="language-switcher" ref={switcherRef}>
            {imagesLoaded && (
                <>
                    <img
                        src={flags[currentLanguage]}
                        alt={`${currentLanguage} flag`}
                        className="current-flag"
                        onClick={toggleMenu}
                    />
                    {menuOpen && (
                        <div className="flag-menu">
                            {Object.keys(flags).filter(lng => lng !== currentLanguage).map(lng => (
                                <button key={lng} onClick={() => changeLanguage(lng)}>
                                    <img src={flags[lng]} alt={`${lng} flag`} className="flag-icon" /> {lng.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default LanguageSwitcher;