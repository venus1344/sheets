const express = require('express');
const bodyParser = require('body-parser');
const basicAuth = require('express-basic-auth');
require('dotenv').config();

const { createBullBoard } = require('@bull-board/api');
const { BullAdapter } = require('@bull-board/api/bullAdapter');
const { ExpressAdapter } = require('@bull-board/express');

const userRoutes = require('./routes/user.routes');
const incidentRoutes = require('./routes/incident.routes');
const usersQueue = require('./queues/sheets.queue');
const incidentsQueue = require('./queues/incidents.queue');

// Start the queue processors
require('./queues/processor');
require('./queues/incidents.processor');

// Bull Board setup
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
    queues: [
        new BullAdapter(usersQueue, { readOnlyMode: false }),
        new BullAdapter(incidentsQueue, { readOnlyMode: false })
    ],
    serverAdapter
});

const app = express();
app.use(bodyParser.json());

// Mount Bull Board dashboard with basic auth
app.use(
    '/admin/queues',
    basicAuth({
        users: { [process.env.ADMIN_USER || 'admin']: process.env.ADMIN_PASSWORD || 'admin' },
        challenge: true,
        realm: 'Bull Board'
    }),
    serverAdapter.getRouter()
);

const PORT = process.env.PORT;

app.get('/health', (req, res) => {
    res.send('OK');
});

// Webhook routes
app.use('/webhook/users', userRoutes);
app.use('/webhook/incidents', incidentRoutes);

const server = app.listen(PORT || 3000, () => {
    console.log(`Server is running on http://localhost:${PORT || 3000}`);
    console.log(`Bull Board dashboard: http://localhost:${PORT || 3000}/admin/queues`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing queues...');
    await Promise.all([usersQueue.close(), incidentsQueue.close()]);
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});