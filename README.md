# password-gate

Регистрация и вход с проверкой пароля на Python (Brython).

## Структура

- `html/index.html` - разметка страницы
- `style/style.css` - оформление, светлая и тёмная тема
- `script/password_check.py` - проверка пароля на Python, 4 уровня, принимается только 4-й
- `js/app.js` - регистрация, вход, 5 попыток, блокировка на 2 часа, reset, localStorage

## Запуск

Brython подгружает `.py` файл через запрос, поэтому двойной клик по `index.html` не сработает. Нужен локальный сервер. Из корня проекта:

    python -m http.server 8000

Открыть: http://localhost:8000/html/

Нужен интернет: Brython и шрифты грузятся с CDN.
