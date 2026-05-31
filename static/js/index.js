import { commands, loadUserPackages, installedPackages, runInstalledPackage } from './commands.js';
import { getCurrentUser } from './utils.js';

document.addEventListener('DOMContentLoaded', function () {
    const consoleInput = document.getElementById('consoleInput');
    const consoleOutput = document.getElementById('consoleOutput');

    if (!consoleInput || !consoleOutput) return;

    const commandHistory = [];
    let historyIndex = -1;

    // Объект интерфейса терминала
    const terminalInterface = {
        addLine: addLine,
        updatePromptName: updatePromptName,
        clearOutput: () => { consoleOutput.innerHTML = ''; },
            updatePromptPath: (path) => {
        const pathLabels = document.querySelectorAll('.console-path'); // убедись, что в HTML у тильды ~ есть такой класс
        pathLabels.forEach(el => el.textContent = path);
    }
    };

    function updatePromptName(name) {
        const userLabels = document.querySelectorAll('.console-user');
        userLabels.forEach(el => el.textContent = name);
    }

    function addLine(text, cls) {
        const line = document.createElement('div');
        line.classList.add('console-line');
        if (cls) line.classList.add(cls);
        line.textContent = text;
        consoleOutput.appendChild(line);
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }

    // Проверка сессии при загрузке страницы и цепочечный вызов пакетов
    fetch('/api/user-info/')
        .then(response => response.json())
        .then(data => {
            if (data.is_authenticated) {
                updatePromptName(data.username);
                // Загружаем пакеты только убедившись, что пользователь авторизован
                loadUserPackages(terminalInterface);
            } else {
                updatePromptName('guest');
            }
        })
        .catch(() => console.error('Ошибка проверки сессии пользователя.'));

    // Единый обработчик логики команд
    function executeCommandLogic(commandName, args) {
        // 1. Ищем в базовых командах системы (help, ls, cd, apt...)
        if (commands[commandName]) {
            const result = commands[commandName](args, terminalInterface);
            if (result === null) return;
            
            if (Array.isArray(result)) {
                result.forEach(line => addLine(line));
            } else {
                addLine(result);
            }
        } 
        // 2. Ищем в установленных через куды пакетах (cmatrix, neofetch...)
        else if (installedPackages.has(commandName)) {
            const result = runInstalledPackage(commandName, terminalInterface);
            if (result === null) return;

            if (Array.isArray(result)) {
                result.forEach(line => addLine(line));
            } else {
                addLine(result);
            }
        } 
        // 3. Если команда не найдена вообще
        else {
            addLine('Command not found: ' + commandName, 'error');
        }
    }

    function processCommand(input) {
        const trimmed = input.trim();
        const currentUser = getCurrentUser();
        
        addLine(currentUser + '@console-website:~$ ' + trimmed, 'prompt-echo');
        if (trimmed === '') return;

        const parts = trimmed.split(/\s+/);
        const commandName = parts[0].toLowerCase();
        const args = parts.slice(1);

        commandHistory.push(trimmed);
        historyIndex = commandHistory.length;

        executeCommandLogic(commandName, args);
    }

    // Слушатель для выполнения команд через sudo
    window.addEventListener('executeSubCommand', function(e) {
        const { command, args } = e.detail;
        executeCommandLogic(command, args);
    });

    // Слушатели клавиатуры
    consoleInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            const value = consoleInput.value;
            consoleInput.value = '';
            processCommand(value);
        }
        if (e.key === 'ArrowUp' && historyIndex > 0) {
            historyIndex--;
            consoleInput.value = commandHistory[historyIndex];
        }
        if (e.key === 'ArrowDown') {
            if (historyIndex < commandHistory.length - 1) {
                historyIndex++;
                consoleInput.value = commandHistory[historyIndex];
            } else {
                historyIndex = commandHistory.length;
                consoleInput.value = '';
            }
        }
    });

    document.getElementById('consoleBody').addEventListener('click', () => consoleInput.focus());
});