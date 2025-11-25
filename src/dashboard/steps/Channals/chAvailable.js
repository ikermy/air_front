export async function chAvailable(URL) {
    try {
        const response = await fetch(`${URL}/available`, {
            method: 'GET',
        });
        return response.ok;
    } catch (error) {
        console.error('Ошибка при проверке доступности:', error);
        return false;
    }
}


