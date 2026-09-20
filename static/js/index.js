import { commands, loadUserPackages, installedPackages, runInstalledPackage } from './commands.js';
import { getCurrentUser } from './utils.js';

document.addEventListener('DOMContentLoaded', function () {
    const consoleInput = document.getElementById('consoleInput');
    const consoleOutput = document.getElementById('consoleOutput');

    if (!consoleInput || !consoleOutput) return;

    const commandHistory = [];
    let historyIndex = -1;

    const terminalInterface = {
        addLine: addLine,
        updatePromptName: updatePromptName,
        clearOutput: () => { consoleOutput.innerHTML = ''; },
        updatePromptPath: (path) => {
            const pathLabels = document.querySelectorAll('.console-path');
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

    fetch('/api/user-info/')
        .then(response => response.json())
        .then(data => {
            if (data.is_authenticated) {
                updatePromptName(data.username);
                loadUserPackages(terminalInterface);
            } else {
                updatePromptName('guest');
            }
        })
        .catch(() => console.error('Ошибка проверки сессии пользователя.'));

    function executeCommandLogic(commandName, args) {
        if (commands[commandName]) {
            const result = commands[commandName](args, terminalInterface);
            if (result === null) return;
            
            if (Array.isArray(result)) {
                result.forEach(line => addLine(line));
            } else {
                addLine(result);
            }
        } 
        else if (installedPackages.has(commandName)) {
            const result = runInstalledPackage(commandName, terminalInterface);
            if (result === null) return;

            if (Array.isArray(result)) {
                result.forEach(line => addLine(line));
            } else {
                addLine(result);
            }
        } 
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

    function handleTabCompletion() {
        const currentInput = consoleInput.value;
        const trimmedInput = currentInput.trimStart();

        if (!trimmedInput) return;

        // Собираем все доступные команды: базовые + установленные пакеты из Postgres (Set -> Array)
        const allCommands = [
            ...Object.keys(commands),
            ...Array.from(installedPackages)
        ];

        // Фильтруем совпадения
        const matches = allCommands.filter(cmd => cmd.startsWith(trimmedInput.toLowerCase()));

        if (matches.length === 1) {
            // Если совпадение одно — дополняем строку и ставим пробел
            consoleInput.value = matches[0] + ' ';
        } else if (matches.length > 1) {
            // Если вариантов несколько — выводим prompt и список под ним
            const currentUser = getCurrentUser();
            addLine(currentUser + '@console-website:~$ ' + currentInput, 'prompt-echo');
            addLine(matches.join('   '), 'info');
        }
    }

    window.addEventListener('executeSubCommand', function(e) {
        const { command, args } = e.detail;
        executeCommandLogic(command, args);
    });

    consoleInput.addEventListener('keydown', function (e) {
        if (e.key === 'Tab') {
            e.preventDefault(); // Предотвращаем переключение фокуса с поля ввода
            handleTabCompletion();
            return;
        }

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