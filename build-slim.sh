#!/bin/bash

echo "Building slim image..."

# Отключаем HTTP пробинг полностью и принудительно включаем все необходимые файлы
docker-slim build \
  --http-probe=false \
  --include-path /usr/share/nginx/html \
  --include-path /data \
  --include-path /etc/ssl/custom \
  --include-path /etc/supervisor \
  --include-path /usr/local/bin \
  --include-path /usr/bin/supervisord \
  --include-path /usr/sbin/nginx \
  --include-path /etc/nginx \
  --include-exe /data/Landing \
  --include-exe /usr/bin/supervisord \
  --include-exe /usr/sbin/nginx \
  --include-exe /usr/local/bin/docker-entrypoint.sh \
  --keep-perms \
  --preserve-path /data/Landing \
  --preserve-path /data/cfg.env \
  --include-exe /usr/bin/python3 \
  --include-path /usr/lib/python3 \
  reposter_image

echo "Slim image built successfully as reposter_image.slim"
