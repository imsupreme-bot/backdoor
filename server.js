const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve backdoor.js as static file
app.get('/backdoor.js', (req, res) => {
    res.sendFile(__dirname + '/backdoor.js');
});

// Root also serves backdoor.js
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/backdoor.js');
});

// Health check
app.get('/health', (req, res) => {
    res.send('OK');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📄 /backdoor.js`);
});
