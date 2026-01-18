const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();

const webhookRoutes = require('./routes/origin.routes');
const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT;

app.get('/health', (req, res) => {
    res.send('OK');
});

app.use('/webhook', webhookRoutes);

app.listen(PORT || 3000, () => {
    console.log(`server is running on http://localhost:${PORT || 3000}`);
});