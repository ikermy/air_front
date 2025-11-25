#!/bin/bash
# Скрипт для ручного обновления Let's Encrypt сертификатов

CONTAINER_NAME="Marusia"

echo "Ручное обновление сертификатов Let's Encrypt"
echo "============================================="

# Проверяем, запущен ли контейнер
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo "Контейнер $CONTAINER_NAME не запущен!"
    exit 1
fi

# Проверяем, есть ли файл domain.txt
if [ ! -f "./domain.txt" ]; then
    echo "Файл domain.txt не найден. Сертификат создан самоподписанным."
    echo "Обновление не требуется."
    exit 0
fi

DOMAIN=$(cat ./domain.txt)
echo "Домен: $DOMAIN"

# Запускаем скрипт обновления внутри контейнера
echo "Запускаю обновление сертификатов..."
docker exec "$CONTAINER_NAME" /usr/local/bin/renew-certs.sh

echo "Обновление завершено."
echo "Проверьте логи: docker exec $CONTAINER_NAME tail -20 /var/log/cert-renewal.log"
