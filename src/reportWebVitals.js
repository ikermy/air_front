// Функция для форматирования и вывода метрик
const logWebVitals = (metric) => {
  const { name, value, rating, delta, id } = metric;

  // Цветовое кодирование в зависимости от рейтинга
  const colors = {
    good: '#0CCE6B',
    'needs-improvement': '#FFA400',
    poor: '#FF4E42'
  };

  // Для production можно отправлять в аналитику
  if (process.env.NODE_ENV === 'production') {
    // Здесь можно добавить отправку в Google Analytics, Sentry и т.д.
    // Example:
    // window.gtag?.('event', name, {
    //   value: Math.round(value),
    //   metric_rating: rating,
    //   metric_delta: delta
    // });
  }
};

const reportWebVitals = (onPerfEntry) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ onCLS, onFCP, onLCP, onTTFB, onINP }) => {
      onCLS(onPerfEntry);
      onFCP(onPerfEntry);
      onLCP(onPerfEntry);
      onTTFB(onPerfEntry);
      onINP(onPerfEntry);
    }).catch((error) => {
      console.warn('Web Vitals не удалось загрузить:', error);
    });
  }
};

// Экспортируем обе функции
export default reportWebVitals;
export { logWebVitals };
