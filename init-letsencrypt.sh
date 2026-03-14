#!/bin/bash

# Скрипт первоначальной генерации SSL-сертификатов для Nginx.
# Убедитесь, что вы уже заполнили домен в nginx/nginx.prod.conf (поиском и заменой example.com)
# И запустили сервер (A-запись домена должна смотреть на IP сервера).

domains=(example.com)
rsa_key_size=4096
data_path="./certbot"
email="your-email@example.com" # Укажите свой актуальный email
staging=0 # Задайте 1 если вы просто тестируете генерацию, чтобы не поймать лимит Let's Encrypt

if [ -d "$data_path" ]; then
  read -p "Папка с сертификатами уже существует. Продолжить и переписать сертификаты? (y/N) " decision
  if [ "$decision" != "Y" ] && [ "$decision" != "y" ]; then
    exit
  fi
fi

if [ ! -e "$data_path/conf/options-ssl-nginx.conf" ] || [ ! -e "$data_path/conf/ssl-dhparams.pem" ]; then
  echo ">>> Загрузка рекомендуемых настроек TLS..."
  mkdir -p "$data_path/conf"
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > "$data_path/conf/options-ssl-nginx.conf"
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > "$data_path/conf/ssl-dhparams.pem"
  echo ">>> Настройки загружены."
fi

echo ">>> Генерация заглушки dummy-сертификата (чтобы Nginx смог запуститься)..."
path="/etc/letsencrypt/live/$domains"
mkdir -p "$data_path/conf/live/$domains"
docker compose -f docker-compose.prod.yml run --rm --entrypoint "\
  openssl req -x509 -nodes -newkey rsa:$rsa_key_size -days 1\
    -keyout '$path/privkey.pem' \
    -out '$path/fullchain.pem' \
    -subj '/CN=localhost'" certbot
echo

echo ">>> Запуск Nginx..."
docker compose -f docker-compose.prod.yml up --force-recreate -d frontend
echo

echo ">>> Удаление dummy-сертификата..."
docker compose -f docker-compose.prod.yml run --rm --entrypoint "\
  rm -Rf /etc/letsencrypt/live/$domains && \
  rm -Rf /etc/letsencrypt/archive/$domains && \
  rm -Rf /etc/letsencrypt/renewal/$domains.conf" certbot
echo

echo ">>> Запрос настоящего сертификата Let's Encrypt..."
domain_args=""
for domain in "${domains[@]}"; do
  domain_args="$domain_args -d $domain"
done

email_arg="--email $email"

if [ $staging != "0" ]; then staging_arg="--staging"; fi

docker compose -f docker-compose.prod.yml run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    $staging_arg \
    $email_arg \
    $domain_args \
    --rsa-key-size $rsa_key_size \
    --agree-tos \
    --force-renewal" certbot
echo

echo ">>> Перезапуск Nginx с новым сертификатом..."
docker compose -f docker-compose.prod.yml exec frontend nginx -s reload
