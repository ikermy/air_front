export function getOrSetUserId() {
    if (typeof window === 'undefined') return 0;

    // Пытаемся прочитать UserId из localStorage
    let userId = localStorage.getItem('userId');

    // Если UserId не найден, генерируем новый
    if (!userId) {
        const timestamp = Date.now(); // Текущая временная метка
        const randomPart = Math.floor(Math.random() * 10000000000); // Случайное число от 0 до 9999999999
        userId = `${timestamp}${randomPart}`; // Создаём уникальный ID
        localStorage.setItem('userId', userId); // Сохраняем в localStorage
    }

    return parseInt(userId, 10); // Возвращаем UserId
}