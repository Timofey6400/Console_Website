// utils.js

// Функция для получения CSRF-токена
export function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Разбор флагов и параметров
export function parseArgs(argsArray) {
    const flags = argsArray.filter(arg => arg.startsWith('-'));
    const params = argsArray.filter(arg => !arg.startsWith('-'));
    return { flags, params };
}

// Быстрое получение текущего юзера из DOM
export function getCurrentUser() {
    const el = document.querySelector('.console-user');
    return el ? el.textContent : 'guest';
}