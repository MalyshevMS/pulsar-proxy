# pulsar-proxy
Простой WebSocket ↔ TCP прокси для Pulsar сервера.

## Требования
- Node.js (>=14)
- npm
- Для тестирования WSS: `openssl` (для self-signed) или валидный сертификат (Let’s Encrypt)

## Установка

```bash
npm install
```

## Запуск

- Запустить без TLS (WS):

```bash
npm run proxy
# или
node proxy.js
```

- Запустить с TLS (WSS):

```bash
# указать ключ/сертификат или положить key.pem/cert.pem рядом с proxy.js
node proxy.js --tls --key ./key.pem --cert ./cert.pem
# или
npm run proxy:wss
```

Параметры:
- `--tls` / `--wss` — включить TLS (WSS)
- `--key` — путь к приватному ключу
- `--cert` — путь к сертификату
- Можно также задать переменные окружения `WSS=1`, `WSS_KEY`, `WSS_CERT`.

## Локальное тестирование

1) Сгенерировать self-signed сертификат (только для локального теста):

```bash
openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 365 -subj "/CN=localhost"
```

2) Запустить прокси с TLS:

```bash
node proxy.js --tls --key ./key.pem --cert ./cert.pem
```

3) Простой тестовый WebSocket-клиент на Node.js (с пропуском проверки сертификата):

Сохраните как `test-client.js` и запустите `node test-client.js`:

```js
const WebSocket = require('ws');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const url = process.argv[2] || 'wss://localhost:8080';
const ws = new WebSocket(url);
ws.on('open', () => { console.log('connected'); ws.send('hello'); });
ws.on('message', (m) => console.log('recv:', m.toString()));
ws.on('error', (e) => console.error('error:', e));
```

Альтернатива: `websocat` (с пропуском проверки сертификата):

```bash
websocat -k wss://localhost:8080
```

> Замечание: браузеры обычно не позволяют подключаться к self-signed сертификатам без ручного доверия. Для браузерного теста используйте валидный сертификат.

## Запуск на реальном сервере

Рассмотрите два подхода:

- Прямой запуск `proxy.js` с TLS (у вас уже есть valid cert):

1. Получите сертификат (например, с помощью Certbot / Let’s Encrypt):

```bash
sudo apt update
sudo apt install certbot
sudo certbot certonly --standalone -d your.domain.tld
# сертификаты будут в /etc/letsencrypt/live/your.domain.tld/
```

2. Запустите прокси, используя пути к сертификатам:

```bash
node /path/to/proxy.js --tls --key /etc/letsencrypt/live/your.domain.tld/privkey.pem \
	--cert /etc/letsencrypt/live/your.domain.tld/fullchain.pem
```

3. Рекомендуется запустить как systemd-сервис (пример):

```ini
[Unit]
Description=pulsar-proxy
After=network.target

[Service]
User=proxyuser
WorkingDirectory=/path/to/your/repo
ExecStart=/usr/bin/node /path/to/your/repo/proxy.js --tls --key /etc/letsencrypt/live/your.domain.tld/privkey.pem --cert /etc/letsencrypt/live/your.domain.tld/fullchain.pem
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

После создания файла `/etc/systemd/system/pulsar-proxy.service`:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now pulsar-proxy
sudo journalctl -u pulsar-proxy -f
```

- Альтернатива (рекомендуемая для продакшена): использовать reverse-proxy (nginx) для TLS и проксирования WS -> локальный HTTP порт. Это упрощает управление сертификатами и повышает безопасность.

## Рекомендации по безопасности
- Не запускать процесс от root — используйте отдельного пользователя.
- Ограничьте права доступа к приватному ключу (chmod 600).
- Логи и ротация логов: настройте `logrotate` для `proxy.log`.

Если нужно, я добавлю пример `nginx` конфигурации или создам `systemd` юнит в репозитории. 
