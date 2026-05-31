import { getCookie, getCurrentUser } from './utils.js';

const packageRepository = {
    cmatrix: {
        description: 'Matrix digital rain effect',
        run: (terminal) => {
            terminal.addLine('Launching cmatrix (Press ESC to exit)...', 'info');
            startCMatrix(terminal);
            return null;
        }
    },
    neofetch: {
        description: 'Shows system information',
        run: (terminal) => {
            return [
                'neofetch 7.1.0',
                'OS: Console Website v1.5',
                'Kernel: JavaScript 1.0',
                'Uptime: ' + new Date().toLocaleTimeString(),
                'Packages: ' + installedPackages.size,
                'Shell: Web Terminal',
            ];
        }
    }
};

const fileSystem = {
    '~': {
        'about.txt': 'Console Website v1.5. Developed with Django and JS.',
        'contacts.txt': 'Email: clashingtimarcoc@gmail.com\nGitHub: https://github.com/Timofey6400',
        'projects': {
            'terminal.js': '// Main terminal logic\nconsole.log("System active.");',
            'api.py': '# Django Rest API\nprint("Backend running")'
        }
    }
};

let currentDirectory = '~';

// !!!
export const installedPackages = new Set();

function getDir(path) {
    if (path === '~') return fileSystem['~'];
    
    const parts = path.split('/');
    let current = fileSystem['~'];
    
    for (let i = 1; i < parts.length; i++) {
        if (current[parts[i]] && typeof current[parts[i]] === 'object') {
            current = current[parts[i]];
        } else {
            return fileSystem['~'];
        }
    }
    return current;
}

export function runInstalledPackage(pkgName, terminal) {
    if (packageRepository[pkgName]) {
        return packageRepository[pkgName].run(terminal);
    }
    return `E: Package ${pkgName} is corrupted.`;
}

// Downloading packages from Django Backend
export function loadUserPackages(terminal) {
    const currentUser = getCurrentUser();
    if (currentUser === 'guest') {
        installedPackages.clear();
        return;
    }

    fetch('/api/get-packages/')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                installedPackages.clear();
                data.packages.forEach(pkg => installedPackages.add(pkg));
                if (terminal && data.packages.length > 0) {
                    terminal.addLine(`[Cloud] Restored profile packages: ${data.packages.join(', ')}`, 'success');
                }
            }
        })
        .catch(() => console.log('Error synchronizing packages with Django.'));
}

export const commands = {
    help: function() {
        return [
            'AVAILABLE COMMANDS:',
            '  help              - Show this message',
            '  about             - Info about site',
            '  date              - Current time',
            '  clear             - Clear terminal screen',
            '  whoami            - Show current user',
            '  register          - Create account [user] [password]',
            '  login             - Login to account [user] [password]',
            '  exit --account    - Logout from system',
            '  ls                - List files in current directory',
            '  cd [dir]          - Change directory',
            '  cat [file]        - Read file content',
            '  apt install [pkg] - Install packages (cmatrix, neofetch)',
            '  sudo [command]    - Run command with root privileges'
        ];
    },

    about: function() {
        return 'Console Website v1.5. Built with Django + JS Modules.';
    },

    date: function() {
        return new Date().toLocaleString();
    },

    clear: function(args, terminal) {
        terminal.clearOutput();
        return null;
    },

    whoami: function() {
        return getCurrentUser();
    },

    register: function (args, terminal) {
        const currentUser = getCurrentUser();
        if (currentUser !== 'guest') return `You are already logged in as ${currentUser}.`;
        if (args.length < 2) return 'Usage: register [username] [password]';

        const username = String(args[0]);
        const password = String(args[1]);

        if (password.length < 6) return 'Error: Password must be at least 6 characters long.';

        fetch('/api/register/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
            body: JSON.stringify({ username, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                terminal.addLine('Registration successful! Welcome, ' + data.username, 'success');
                terminal.updatePromptName(data.username);
                loadUserPackages(terminal);
            } else {
                terminal.addLine('Error: ' + data.message, 'error');
            }
        })
        .catch(() => terminal.addLine('Server error during registration.', 'error'));

        return 'Processing registration...';
    },

    login: function (args, terminal) {
        const currentUser = getCurrentUser();
        if (currentUser !== 'guest') return `You are already logged in as ${currentUser}.`;
        if (args.length < 2) return 'Usage: login [username] [password]';
        
        const [username, password] = args;

        fetch('/api/login/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
            body: JSON.stringify({ username, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                terminal.addLine('Logged in successfully! Welcome, ' + data.username, 'success');
                terminal.updatePromptName(data.username);
                loadUserPackages(terminal); 
            } else {
                terminal.addLine('Login failed: ' + data.message, 'error');
            }
        })
        .catch(() => terminal.addLine('Server error during authentication.', 'error'));

        return 'Authenticating...';
    },

    exit: function (args, terminal) { 
        const currentUser = getCurrentUser();
        if (currentUser === 'guest') return 'You are not logged in.';

        if (args.includes('--account')) {
            fetch('/api/logout/', {
                method: 'POST',
                headers: { 'X-CSRFToken': getCookie('csrftoken') }
            })
            .then(response => {
                if (response.ok) {
                    terminal.addLine('Logout successful. Switched to guest.', 'info');
                    terminal.updatePromptName('guest');
                    installedPackages.clear();
                }
            });
            return 'Logging out...';
        }
        return 'Usage: exit --account';
    },

    ls: function() {
        let dir = getDir(currentDirectory);
        return Object.keys(dir).map(item => 
            typeof dir[item] === 'object' ? `\x1b[1;34m${item}/\x1b[0m` : item
        ).join('   ');
    },

cd: function(args, terminal) {
        const target = args[0];
        
        if (!target || target === '~' || target === '/') {
            currentDirectory = '~';
            if (terminal.updatePromptPath) terminal.updatePromptPath('~');
            return null;
        }

        if (target === '..') {
            if (currentDirectory.includes('/')) {
                currentDirectory = currentDirectory.substring(0, currentDirectory.lastIndexOf('/'));
            } else {
                currentDirectory = '~';
            }
            if (terminal.updatePromptPath) terminal.updatePromptPath(currentDirectory);
            return null;
        }

        let currentDirContent = getDir(currentDirectory);
        if (currentDirContent[target] && typeof currentDirContent[target] === 'object') {
            currentDirectory = currentDirectory === '~' ? `~/${target}` : `${currentDirectory}/${target}`;
            if (terminal.updatePromptPath) terminal.updatePromptPath(currentDirectory);
            return null;
        }

        return `cd: no such file or directory: ${target}`;
    },

    cat: function(args) {
        if (!args[0]) return 'Usage: cat [file]';
        let dir = getDir(currentDirectory);
        
        if (!dir[args[0]]) return `cat: ${args[0]}: No such file or directory`;
        if (typeof dir[args[0]] === 'object') return `cat: ${args[0]}: Is a directory`;
        
        return dir[args[0]];
    },

    sudo: function (args, terminal) {
        const currentUser = getCurrentUser();
        
        if (args.includes('-s')) {
            if (currentUser === 'guest') return 'sudo: guest is not in the sudoers file. This incident will be reported.';
            return `User ${currentUser} has ROOT access privileges: ALLOWED.`;
        }
        if (args.length === 0) {
            return 'Usage:\n  sudo [command]       - run command as root\n  sudo -s              - check sudo status';
        }
        if (currentUser === 'guest') return 'sudo: guest is not allowed to run root commands.';

        const subCommand = args[0];
        const subArgs = args.slice(1);

        setTimeout(() => {
            terminal.addLine(`[sudo] password for ${currentUser}: *******`, 'info');
            setTimeout(() => {
                terminal.addLine('Access granted.', 'success');
                const event = new CustomEvent('executeSubCommand', { detail: { command: subCommand, args: subArgs } });
                window.dispatchEvent(event);
            }, 800);
        }, 300);

        return 'Initializing root privileges...';
    },

    apt: function(args, terminal) {
        if (args[0] !== 'install' || !args[1]) return 'Usage: apt install [package]';
        const pkg = args[1].toLowerCase();

        if (!packageRepository[pkg]) return `E: Package ${pkg} not found`;
        if (installedPackages.has(pkg)) return `${pkg} is already installed.`;

        terminal.addLine(`Reading package lists... Done`, 'info');
        terminal.addLine(`Building dependency tree... Done`, 'info');
        
        let progress = 0;
        const interval = setInterval(() => {
            progress += 25;
            terminal.addLine(`Fetching ${pkg}... [${'#'.repeat(progress/10)}] ${progress}%`);
            
            if (progress >= 100) {
                clearInterval(interval);
                const currentUser = getCurrentUser();
                
                if (currentUser === 'guest') {
                    installedPackages.add(pkg);
                    terminal.addLine(`Setting up ${pkg} ... Done`, 'success');
                    terminal.addLine(`Successfully installed! (Temporary Demo Mode for guest)`, 'info');
                } else {
                    fetch('/api/install-package/', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
                        body: JSON.stringify({ package: pkg })
                    })
                    .then(res => res.json())
                    .then(data => {
                        if (data.status === 'success') {
                            installedPackages.add(pkg);
                            terminal.addLine(`Setting up ${pkg} ... Done`, 'success');
                            terminal.addLine(`Successfully installed in your cloud profile!`, 'success');
                        } else {
                            terminal.addLine(`Backend error: ${data.message}`, 'error');
                        }
                    })
                    .catch(() => terminal.addLine('Server error while saving package to cloud.', 'error'));
                }
            }
        }, 300);
        return 'Selecting previously unselected package...';
    }
};

function startCMatrix(terminal) {
    const canvas = document.createElement('canvas');
    canvas.id = 'matrixCanvas';
    Object.assign(canvas.style, {
        position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
        background: '#000', zIndex: '999999', display: 'block'
    });
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZコンニチハ'.split('');
    const fontSize = 16;
    const columns = Math.floor(canvas.width / fontSize);
    const drops = Array(columns).fill(1);

    const draw = () => {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#0f0';
        ctx.font = fontSize + 'px monospace';
        drops.forEach((y, i) => {
            const text = alphabet[Math.floor(Math.random() * alphabet.length)];
            ctx.fillText(text, i * fontSize, y * fontSize);
            if (y * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
            drops[i]++;
        });
    };

    const inst = setInterval(draw, 30);
    
    const exit = (e) => {
        if (e.key === 'F11') return;
        if (e.key !== 'Escape') return; 

        e.preventDefault();
        e.stopPropagation();
        
        clearInterval(inst);
        canvas.remove();
        window.removeEventListener('keyup', exit);
        terminal.addLine('cmatrix terminated.', 'info');
        
        const inputEl = document.getElementById('consoleInput');
        if (inputEl) {
            setTimeout(() => inputEl.focus(), 50);
        }
    };
    
    setTimeout(() => window.addEventListener('keyup', exit), 100);
}