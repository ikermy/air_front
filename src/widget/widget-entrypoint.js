import React from 'react';
import ReactDOM from 'react-dom/client';
import { Widget } from './Widget';
import '../App.css'; // Общие стили приложения - ПЕРВЫМИ для CSS переменных
import './Widget.css'; // Добавляем стили виджета
import '../dialog/ChatWindow.css'; // Добавляем стили чата для standalone виджета
import './chat/ChatWidget.css'; // Добавляем стили чата для standalone виджета

// Создаем и добавляем CSS переменные для standalone виджета
const injectWidgetCSS = () => {
  // ВАЖНО: Устанавливаем класс темы на body для корректной работы CSS переменных
  if (document.body && !document.body.classList.contains('light') && !document.body.classList.contains('dark')) {
    document.body.classList.add('light'); // Устанавливаем светлую тему по умолчанию
  }
};

// Инжектируем CSS переменные сразу
injectWidgetCSS();

// ВАЖНО: Устанавливаем конфигурацию СРАЗУ после импортов
// Более надежная установка process
(function() {
  if (typeof window !== 'undefined') {
    if (!window.process) {
      window.process = {};
    }
    if (!window.process.env) {
      window.process.env = {};
    }
    window.process.env.NODE_ENV = 'production';
  }
})();

// Устанавливаем runtime конфигурацию для standalone виджета
// Виджет работает через Landing API (не через отдельный порт)
const LAND_URL = 'https://info-bot.online:8080';

// Принудительно устанавливаем конфигурацию в несколько мест
window.runtimeConfig = window.runtimeConfig || {};
window.runtimeConfig.REACT_APP_LAND = LAND_URL;

if (typeof window.process === 'undefined') {
  window.process = { env: {} };
}
window.process.env = window.process.env || {};
window.process.env.REACT_APP_LAND = LAND_URL;

console.log('Standalone Widget uses Landing API:', LAND_URL);

// Устанавливаем базовый путь для статических файлов виджета
// Это важно для правильной загрузки aperture.svg и других ресурсов
if (typeof window !== 'undefined' && !window.WIDGET_STATIC_BASE) {
  const currentHost = window.location.hostname;
  const currentProtocol = window.location.protocol;

  if (currentProtocol === 'file:') {
    // Для файлового протокола используем относительный путь
    window.WIDGET_STATIC_BASE = './build/widget/';
  } else if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
    window.WIDGET_STATIC_BASE = './build/widget/';
  } else {
    window.WIDGET_STATIC_BASE = '/widget/';
  }

  console.log('WIDGET_STATIC_BASE установлен:', window.WIDGET_STATIC_BASE);
}

// Переопределяем process.env для модулей, которые используют его
if (typeof process !== 'undefined' && process.env) {
  process.env.REACT_APP_LAND = LAND_URL;
}

console.log('Landing API URL configured globally:', LAND_URL);
console.log('window.runtimeConfig:', window.runtimeConfig);
console.log('Full React Widget: Инициализация начата...');

// Создаем API объект для полноценного React виджета
const MarusyaWidgetAPI = {
  init: function(options = {}) {
    console.log('MarusyaWidget.init called with options:', options);

    const examKey = options.examKey;

    if (!examKey) {
      console.error('Marusya Widget: examKey is required for initialization');
      return null;
    }

    console.log('Creating full React widget with examKey:', examKey);

    // Создаем контейнер для виджета
    let widgetContainer = document.getElementById('marusya-widget-container');
    if (!widgetContainer) {
      widgetContainer = document.createElement('div');
      widgetContainer.id = 'marusya-widget-container';
      document.body.appendChild(widgetContainer);
    }

    try {
      // Создаем React root для React 18+
      const root = ReactDOM.createRoot(widgetContainer);

      // Создаем обертку для передачи всех параметров в Widget компонент
      const WidgetWrapper = () => {
        return React.createElement(Widget, {
          examKey,
          buttonPosition: options.buttonPosition || {},
          buttonSize: options.buttonSize || {},
          buttonStyle: options.buttonStyle || {},
          colors: options.colors || {}
        });
      };

      // Рендерим полноценный React виджет с новым API
      root.render(React.createElement(WidgetWrapper));

      return {
        destroy: () => {
          root.unmount();
          if (widgetContainer.parentNode) {
            widgetContainer.parentNode.removeChild(widgetContainer);
          }
        },
        container: widgetContainer,
        root: root
      };
    } catch (error) {
      console.error('Failed to initialize full React Widget:', error);
      return null;
    }
  },

  destroy: function() {
    console.log('MarusyaWidget.destroy called');
    const widgetContainer = document.getElementById('marusya-widget-container');
    if (widgetContainer) {
      if (widgetContainer.parentNode) {
        widgetContainer.parentNode.removeChild(widgetContainer);
      }
    }
  }
};

// Устанавливаем API в window СРАЗУ
window.MarusyaWidget = MarusyaWidgetAPI;
// Автоматическая инициализация
function autoInit() {
  const examKeyMeta = document.querySelector('meta[name="marusya-exam-key"]');
  const scriptTag = document.querySelector('script[src*="marusya-widget"]');

  let examKey = null;

  if (examKeyMeta) {
    examKey = examKeyMeta.getAttribute('content');
  } else if (scriptTag) {
    examKey = scriptTag.getAttribute('data-exam-key');
  }

  if (examKey) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        MarusyaWidgetAPI.init({ examKey });
      });
    } else {
      MarusyaWidgetAPI.init({ examKey });
    }
  } else {
    console.warn('Full React Widget: data-exam-key attribute is required for auto-initialization');
  }
}

// Запускаем автоинициализацию
autoInit();

// Экспортируем API для webpack
export default MarusyaWidgetAPI;