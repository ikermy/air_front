#!/bin/bash

echo "Building optimized slim image..."

# Основные параметры для docker-slim
docker-slim build \
  --http-probe=false \
  --continue-after=10 \
  --show-clogs \
  --show-blogs \
  --remove-file-artifacts \
  --include-path /var/www/html \
  --include-path /data \
  --include-path /etc/ssl/custom \
  --include-path /etc/supervisor \
  --include-path /usr/local/bin \
  --include-path /run/mysqld \
  --include-path /var/log \
  --include-path /etc/nginx \
  --include-path /etc/my.cnf \
  --include-path /etc/mysql \
  --include-path /etc/cfg.env.template \
  --include-path /docker-entrypoint-initdb.d \
  --include-path /usr/share/mysql \
  --include-path /usr/share/mariadb \
  --include-path /usr/lib/mysql \
  --include-path /usr/lib/mariadb \
  --include-path /usr/lib/x86_64-linux-gnu/mariadb \
  --include-path /usr/lib/x86_64-linux-gnu/libmariadb \
  --include-path /lib/x86_64-linux-gnu/libedit.so.2 \
  --include-path /lib/x86_64-linux-gnu/libncurses.so.6 \
  --include-path /lib/x86_64-linux-gnu/libtinfo.so.6 \
  --include-path /lib/x86_64-linux-gnu/libssl.so.3 \
  --include-path /lib/x86_64-linux-gnu/libcrypto.so.3 \
  --include-path /lib/x86_64-linux-gnu/libz.so.1 \
  --include-path /lib/x86_64-linux-gnu/libstdc++.so.6 \
  --include-path /lib/x86_64-linux-gnu/libgcc_s.so.1 \
  --include-path /lib/x86_64-linux-gnu/libc.so.6 \
  --include-path /lib64/ld-linux-x86-64.so.2 \
  --include-path /lib/x86_64-linux-gnu/libbsd.so.0 \
  --include-path /lib/x86_64-linux-gnu/libm.so.6 \
  --include-path /lib/x86_64-linux-gnu/libmd.so.0 \
  --include-exe /usr/bin/supervisord \
  --include-exe /usr/sbin/nginx \
  --include-exe /usr/bin/mysqld \
  --include-exe /usr/sbin/mysqld \
  --include-exe /usr/bin/mariadbd \
  --include-exe /usr/sbin/mariadbd \
  --include-exe /usr/libexec/mariadbd \
  --include-exe /usr/bin/mariadb \
  --include-exe /usr/bin/mysql \
  --include-exe /usr/bin/mysqladmin \
  --include-exe /usr/bin/mariadb-admin \
  --include-exe /usr/bin/mariadb-install-db \
  --include-exe /usr/sbin/mariadb-install-db \
  --include-exe /usr/bin/mariadb-dump \
  --include-exe /usr/bin/mysqldump \
  --include-exe /usr/bin/mariadb-check \
  --include-exe /usr/bin/mariadb-upgrade \
  --include-exe /data/Landing \
  --include-exe /data/WhatsBot \
  --include-exe /data/TgBot \
  --include-exe /data/TgUserBot \
  --include-exe /data/Widget \
  --include-exe /data/CRM \
  --include-exe /data/Operator \
  --include-exe /usr/local/bin/docker-entrypoint.sh \
  --include-exe /usr/local/bin/create-config.sh \
  --include-exe /init-mariadb.sh \
  --include-exe /bin/sh \
  --include-exe /bin/bash \
  --include-exe /usr/bin/envsubst \
  --include-exe /usr/bin/sed \
  --include-exe /bin/cat \
  --include-exe /usr/bin/nc \
  --include-exe /usr/bin/head \
  --include-exe /bin/echo \
  --include-exe /bin/mkdir \
  --include-exe /bin/cp \
  --include-exe /bin/sleep \
  --include-exe /bin/grep \
  --include-exe /bin/chmod \
  --include-exe /usr/bin/test \
  --include-exe /usr/bin/[ \
  --include-exe /usr/bin/du \
  --include-exe /usr/bin/which \
  --include-exe /bin/ls \
  --include-exe /usr/bin/ls \
  --include-exe /usr/bin/cut \
  --include-exe /usr/bin/top \
  --include-exe /bin/top \
  --keep-perms \
  --preserve-path /data \
  --preserve-path /var/log \
  --preserve-path /run/mysqld \
  --preserve-path /etc/ssl/custom \
  --preserve-path /etc \
  --preserve-path /bin \
  --preserve-path /usr/bin \
  --preserve-path /usr/share/mysql \
  --preserve-path /usr/share/mariadb \
  --mount /var/log/Marusia:/var/log/Marusia \
  --tag marusia-sale_slim \
  marusia-sale

if [ $? -eq 0 ]; then
    echo "✅ Slim-образ успешно создан: marusia-sale_slim"

    # Показываем сравнение размеров
    echo ""
    echo "Исходный образ:"
    docker images marusia-sale --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
    echo "Оптимизированный образ:"
    docker images marusia-sale_slim --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
    echo ""

    # Сохраняем образ в tar-файл
    echo "Сохранение образа в marusia-sale.tar..."
    docker save -o marusia-sale.tar marusia-sale_slim:latest

    if [ $? -eq 0 ]; then
        TAR_SIZE=$(du -h marusia-sale.tar | cut -f1)
        echo "✅ Образ сохранён: marusia-sale.tar (${TAR_SIZE})"
        echo ""
        echo "Готово! Теперь можно развернуть образ на сервере:"
        echo "  1. Скопируйте marusia-sale.tar на сервер"
        echo "  2. Запустите: bash setup.sh"
    else
        echo "❌ Ошибка при сохранении образа в tar-файл"
        exit 1
    fi
else
    echo "❌ Ошибка при создании slim-образа"
    exit 1
fi
