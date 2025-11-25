FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .

# Собираем основное React приложение
RUN npm run build

# Собираем standalone виджет
RUN npm run build:widget

# Промежуточный этап для оптимизации статических файлов
FROM alpine:3.21 AS optimizer
RUN apk add --no-cache brotli gzip
COPY --from=build /app/build /build
# Сжимаем статические файлы для лучшей производительности
RUN find /build -type f -name "*.js" -o -name "*.css" -o -name "*.html" -o -name "*.svg" | xargs -P $(nproc) -I{} sh -c 'gzip -9 -k {} && brotli -Z {}' || true

# Используем более легкий базовый образ nginx
FROM nginx:alpine-slim AS prod

# Добавляем аргумент для хоста и преобразуем его в ENV в этапе prod
ARG HOST=info-bot.online
ENV HOST=$HOST

# Устанавливаем только необходимые пакеты и очищаем кеш
RUN apk add --no-cache --update --virtual .build-deps \
#        mariadb \
#        mariadb-client \
        supervisor \
        netcat-openbsd \
        gettext \
        certbot \
        openssl \
        && \
    rm -rf /var/cache/apk/*

RUN mkdir -p /var/log/supervisor
# Создаём директории для хранения данных MariaDB и для сокета mysqld
#RUN mkdir -p /var/lib/mysql /docker-entrypoint-initdb.d /run/mysqld /var/log/supervisor /var/log/mysql && \
#    chown -R mysql:mysql /var/lib/mysql /run/mysqld /var/log/mysql && \
#    chmod 777 /run/mysqld

# Создаем директории для приложений и логов
RUN mkdir -p /data /var/log/Marusia /var/www/html /opt/react-build

# Копируем дамп базы
#COPY _release/air.sql /docker-entrypoint-initdb.d/air.sql

# Копируем оптимизированную статику React в защищенную директорию
COPY --from=optimizer /build /opt/react-build

# Удаляем стандартную конфигурацию Nginx, чтобы избежать конфликтов
RUN rm /etc/nginx/conf.d/default.conf

# Создаем отдельную директорию для наших сертификатов
RUN mkdir -p /etc/ssl/custom

# Копируем конфигурационные файлы
#COPY _release/nginx.conf.template /etc/nginx/nginx.conf.template
COPY _release/nginx.conf.template /data/nginx.conf.template
COPY _release/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
# Копируем шаблон cfg.env для последующего создания конфигурации
COPY _release/cfg.env /etc/cfg.env.template
COPY _release/create-config.sh /usr/local/bin/create-config.sh
COPY _release/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
COPY _release/renew-certs.sh /usr/local/bin/renew-certs.sh
RUN chmod +x /usr/local/bin/create-config.sh /usr/local/bin/docker-entrypoint.sh /usr/local/bin/renew-certs.sh

# Копируем программы
COPY _release/Landing /data/Landing
COPY _release/Payment /data/Payment
COPY _release/Analytics /data/Analytics
COPY _release/TgBot /data/TgBot
COPY _release/TgUserBot /data/TgUserBot
COPY _release/WhatsBot /data/WhatsBot
COPY _release/Demo /data/Demo
COPY _release/Widget /data/Widget
COPY _release/Operator /data/Operator
COPY _release/TG-lead /data/TG-lead
# Копирую пока отключённые сервисы
RUN if [ -e "_release/Insta" ]; then cp -r _release/Insta /data/Insta; else echo "Warning: _release/Insta not found, skipping copy."; fi

# Только для оптимизации slim образа
COPY _release/host.pem /etc/ssl/custom/host.pem
COPY _release/host-key.pem /etc/ssl/custom/host-key.pem

# Копируем скрипт инициализации MariaDB
#COPY _release/init-mariadb.sh /init-mariadb.sh

# Устанавливаем права на исполнение для всех бинарных файлов
RUN #chmod +x /data/Landing /data/Payment /data/TgBot /data/TgUserBot /data/WhatsBot /init-mariadb.sh
RUN chmod +x /data/Landing /data/Payment /data/Analytics /data/TgBot /data/TgUserBot /data/WhatsBot /data/Demo /data/Widget /data/Operator /data/TG-lead
# Устанавливаем права на исполнение для файлов которых может не быть
RUN sh -c '[ -e /data/Insta ] && chmod +x /data/Insta || echo "Warning: /data/Insta not found, skipping chmod."'

# Объявляем volumes
VOLUME /data
VOLUME /var/log/Marusia
#VOLUME /var/lib/mysql
#VOLUME /var/log/mysql
VOLUME /var/www/html

# Уменьшаем размер образа (НЕ удаляем /opt/react-build!)
RUN rm -rf /var/cache/apk/* /var/tmp/*

EXPOSE 80 443

# Используем скрипт-обертку для замены переменных в конфигурации nginx перед запуском
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]