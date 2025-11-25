export function getOrSetUserId() {
    // Пытаемся прочитать UserId из localStorage
    let userId = localStorage.getItem('userId');

    // Если UserId не найден, генерируем новый
    if (!userId) {
        const timestamp = Date.now(); // Текущая временная метка
        const randomPart = Math.floor(Math.random() * 1000000); // Случайное число от 0 до 999999
        userId = `${timestamp}${randomPart}`; // Создаём уникальный ID
        localStorage.setItem('userId', userId); // Сохраняем в localStorage
    }

    return parseInt(userId, 10); // Возвращаем UserId
}