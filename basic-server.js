const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Serve static files from current directory
app.use(express.static(__dirname));

// Serve files from src directory
app.use('/src', express.static(path.join(__dirname, 'src')));

// Serve index.html for all routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Server running at:
    Local:   http://localhost:${PORT}/
    Network: http://192.168.18.9:${PORT}/\n`);
});