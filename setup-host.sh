#!/bin/bash

# Скрипт для настройки HOST и генерации SSL-сертификатов

read -p "Введите IP-адрес или имя хоста: " HOST_INPUT
read -p "Вы хотите выпустить сертификат для IP (1) или имени хоста (2)? Введите 1 или 2: " CERT_TYPE

# Функция для установки Certbot
install_certbot() {
    echo "Установка Certbot..."
    if command -v apt-get >/dev/null 2>&1; then
        # Debian/Ubuntu
        apt-get update
        apt-get install -y certbot
    elif command -v yum >/dev/null 2>&1; then
        # CentOS/RHEL
        yum install -y epel-release
        yum install -y certbot
    elif command -v dnf >/dev/null 2>&1; then
        # Fedora
        dnf install -y certbot
    else
        echo "Не удалось определить менеджер пакетов. Установите Certbot вручную."
        exit 1
    fi
}

# Функция для получения Let's Encrypt сертификата
get_letsencrypt_cert() {
    local domain=$1

    echo "Получение SSL-сертификата от Let's Encrypt для домена: $domain"

    # Проверяем, установлен ли Certbot
    if ! command -v certbot >/dev/null 2>&1; then
        echo "Certbot не найден. Устанавливаем..."
        install_certbot
    fi

    # Устанавливаем необходимые пакеты для работы с фаерволом
    echo "Установка необходимых пакетов..."
    if command -v apt-get >/dev/null 2>&1; then
        apt-get update
        apt-get install -y ufw lsof net-tools
    elif command -v yum >/dev/null 2>&1; then
        yum install -y ufw lsof net-tools
    elif command -v dnf >/dev/null 2>&1; then
        dnf install -y ufw lsof net-tools
    fi

    # Проверяем, что порт 80 доступен
    echo "Проверка доступности порта 80..."
    if netstat -tlnp | grep -q ":80 "; then
        echo "⚠️  Порт 80 уже используется:"
        netstat -tlnp | grep ":80 "
        echo "Освобождаем порт 80..."
    fi

    # Останавливаем контейнер если он запущен
    echo "Останавливаем контейнер для получения сертификата..."
    docker compose -f prod.yml down 2>/dev/null || true

    # Дополнительная проверка - убиваем процессы на порту 80
    if command -v lsof >/dev/null 2>&1; then
        lsof -ti:80 | xargs kill -9 2>/dev/null || true
    fi

    # Проверяем и настраиваем фаерволл
    echo "Настройка фаерволла для Let's Encrypt..."
    if command -v ufw >/dev/null 2>&1; then
        echo "Статус UFW:"
        ufw status
        echo "Открываем порты 80 и 443..."
        ufw allow 80/tcp
        ufw allow 443/tcp
        echo "Включаем UFW (если не включен)..."
        ufw --force enable
    else
        echo "⚠️  UFW не найден, проверьте фаерволл вручную"
    fi

    # Проверяем iptables
    if command -v iptables >/dev/null 2>&1; then
        echo "Проверка iptables для портов 80 и 443..."
        iptables -L INPUT | grep -i "80\|443\|http" || echo "Правила для портов 80/443 не найдены"
    fi

    # Тестируем доступность домена
    echo "Проверка DNS разрешения для $domain..."
    RESOLVED_IP=$(dig +short $domain 2>/dev/null | tail -n1)
    if [ -n "$RESOLVED_IP" ]; then
        echo "✅ Домен $domain разрешается в IP: $RESOLVED_IP"
    else
        echo "⚠️  Домен $domain не разрешается"
    fi

    # Получаем сертификат в standalone режиме
    echo "Запуск certbot для получения сертификата..."
    certbot certonly --standalone \
        --preferred-challenges http \
        --email admin@${domain} \
        --agree-tos \
        --no-eff-email \
        --verbose \
        -d ${domain}

    if [ $? -eq 0 ]; then
        echo "✅ Сертификат успешно получен!"

        # Копируем сертификаты в рабочую директорию
        cp /etc/letsencrypt/live/${domain}/fullchain.pem ./host.pem
        cp /etc/letsencrypt/live/${domain}/privkey.pem ./host-key.pem

        # Создаем host.crt из host.pem
        cp ./host.pem ./host.crt

        echo "Сертификаты скопированы в рабочую директорию"

        # Убеждаемся, что domain.txt не существует как директория
        if [ -d "./domain.txt" ]; then
            echo "Удаляю некорректную директорию domain.txt"
            rm -rf ./domain.txt
        fi

        # Создаем файл с доменом для использования в контейнере
        echo "$domain" > ./domain.txt

        # Проверяем, что файл создан правильно
        if [ -f "./domain.txt" ]; then
            echo "Файл domain.txt создан: $(cat ./domain.txt)"
        else
            echo "⚠️  Не удалось создать файл domain.txt"
        fi

        return 0
    else
        echo "❌ Ошибка при получении сертификата от Let's Encrypt!"
        echo "Возможные причины:"
        echo "1. Порт 80 заблокирован фаерволом"
        echo "2. DNS запись не указывает на этот сервер"
        echo "3. Провайдер блокирует входящие соединения"
        echo ""
        echo "Для диагностики выполните:"
        echo "  ufw status"
        echo "  netstat -tlnp | grep :80"
        echo "  dig +short $domain"
        return 1
    fi
}

# Функция для создания самоподписанного сертификата
create_self_signed_cert() {
    local host=$1
    local is_ip=$2

    echo "Генерируются самоподписанные SSL сертификаты..."

    if [ "$is_ip" = "true" ]; then
        openssl req -x509 -nodes -days 1100 -newkey rsa:2048 \
            -keyout host-key.pem -out host.pem \
            -subj "/CN=$host" \
            -addext "subjectAltName=IP:$host"
    else
        openssl req -x509 -nodes -days 1100 -newkey rsa:2048 \
            -keyout host-key.pem -out host.pem \
            -subj "/CN=$host" \
            -addext "subjectAltName=DNS:$host"
    fi

    # Создание host.crt из host.pem
    cp host.pem host.crt
    echo "Самоподписанные сертификаты созданы."
}

# Основная логика создания сертификатов
if [ "$CERT_TYPE" -eq 1 ]; then
    # IP-адрес - можно только самоподписанный сертификат
    echo "Для IP-адреса можно создать только самоподписанный сертификат"
    create_self_signed_cert "$HOST_INPUT" "true"

elif [ "$CERT_TYPE" -eq 2 ]; then
    # Имя хоста - пытаемся получить Let's Encrypt сертификат
    echo "Получение сертификата от Let's Encrypt для домена: $HOST_INPUT"

    # Проверяем, что домен действительно указывает на этот сервер
    echo "Проверка DNS записи для $HOST_INPUT..."
    RESOLVED_IP=$(dig +short $HOST_INPUT 2>/dev/null | tail -n1)

    if [ -z "$RESOLVED_IP" ]; then
        echo "Предупреждение: Не удалось разрешить домен $HOST_INPUT"
        echo "Убедитесь, что DNS запись настроена правильно"
        read -p "Продолжить получение сертификата от Let's Encrypt? (y/n): " CONTINUE
        if [ "$CONTINUE" != "y" ]; then
            echo "Создаю самоподписанный сертификат..."
            create_self_signed_cert "$HOST_INPUT" "false"
        else
            # Пытаемся получить сертификат от Let's Encrypt
            if ! get_letsencrypt_cert "$HOST_INPUT"; then
                echo "Создаю самоподписанный сертификат как резервный вариант..."
                create_self_signed_cert "$HOST_INPUT" "false"
            fi
        fi
    else
        echo "Домен $HOST_INPUT разрешается в IP: $RESOLVED_IP"
        # Пытаемся получить сертификат от Let's Encrypt
        if ! get_letsencrypt_cert "$HOST_INPUT"; then
            echo "Создаю самоподписанный сертификат как резервный вариант..."
            create_self_signed_cert "$HOST_INPUT" "false"
        fi
    fi
else
    echo "Ошибка: Некорректный выбор. Сертификат не создан."
    exit 1
fi

# Проверка наличия созданных сертификатов
if [ ! -f "host.pem" ] || [ ! -f "host-key.pem" ]; then
    echo "Ошибка: Сертификаты не были созданы!"
    exit 1
fi

echo "Сертификаты готовы:"
echo "- host.pem (сертификат)"
echo "- host-key.pem (приватный ключ)"
echo "- host.crt (копия сертификата)"

# Замена HOST в prod.yml
if grep -q "HOST=" prod.yml; then
    sed -i.bak "s|HOST=.*|HOST=$HOST_INPUT|" prod.yml
    echo "HOST обновлён в prod.yml."
else
    echo "Строка HOST= не найдена в prod.yml."
fi

# Запуск контейнера с проверкой наличия docker
echo "Проверка наличия Docker..."
if command -v docker >/dev/null 2>&1; then
    echo "Docker найден: $(which docker)"
    echo "Версия Docker: $(docker --version)"
else
    echo "Docker не найден. Пытаюсь установить..."
    apt update && apt install -y docker.io
    usermod -aG docker $(whoami)
    echo "Открываю порты 443, 8081..."
    for port in 443 8081; do
        ufw allow ${port}/tcp || echo "Не удалось открыть порт $port через ufw. Проверьте настройки вручную."
    done
    echo "Docker установлен. Перезапустите терминал, если возникнут проблемы с правами."
    # Проверяем повторно
    if ! command -v docker >/dev/null 2>&1; then
        echo "Ошибка: Docker не удалось установить автоматически. Установите вручную и повторите попытку."
        exit 1
    fi
fi

# Проверка и загрузка Docker образа из tar файла
if [ -f "marusia-prod_img.tar" ]; then
    echo "Загрузка Docker образа из marusia-prod_img.tar..."
    docker load -i marusia-prod_img.tar
    if [ $? -ne 0 ]; then
        echo "Ошибка при загрузке Docker образа из tar файла!"
        exit 1
    fi
    echo "Docker образ успешно загружен."
else
    echo "Файл marusia-prod_img.tar не найден. Пытаюсь собрать образ из Dockerfile..."
    if [ -f "Dockerfile" ]; then
        docker build -t marusia-prod_img .
        if [ $? -ne 0 ]; then
            echo "Ошибка при сборке Docker образа!"
            exit 1
        fi
    else
        echo "Ошибка: Ни marusia-prod_img.tar, ни Dockerfile не найдены!"
        exit 1
    fi
fi

echo "Запуск контейнера..."
docker compose -f prod.yml up -d

echo ""
echo "=== Настройка завершена ==="
echo "HOST: $HOST_INPUT"
if [ "$CERT_TYPE" -eq 2 ] && [ -f "./domain.txt" ]; then
    echo "Сертификат: Let's Encrypt"
    echo "Домен: $(cat ./domain.txt)"
    echo "Автоматическое обновление настроено внутри контейнера"
else
    echo "Сертификат: Самоподписанный"
fi
echo "=========================="
