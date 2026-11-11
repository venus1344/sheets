const crypto = require('crypto');
const express = require('express');
const bodyParser = require('body-parser');
const basicAuth = require('express-basic-auth');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { createBullBoard } = require('@bull-board/api');
const { BullAdapter } = require('@bull-board/api/bullAdapter');
const { ExpressAdapter } = require('@bull-board/express');

const userRoutes = require('./routes/user.routes');
const incidentRoutes = require('./routes/incident.routes');
const { flushNotifications } = require('./utils/notifications');
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

// Trust reverse proxy (nginx/Apache)
app.set('trust proxy', 1);

// Security headers - relaxed for Bull Board static assets
app.use(helmet({
    contentSecurityPolicy: false,  // Bull Board needs inline scripts
    crossOriginEmbedderPolicy: false
}));

// Internal clients (Airflow) may skip the shared rate limit by sending the shared
// secret in X-Client-Id. Leave INTERNAL_CLIENT_ID unset to disable the bypass.
const INTERNAL_CLIENT_ID = process.env.INTERNAL_CLIENT_ID;

const isTrustedClient = (req) => {
    if (!INTERNAL_CLIENT_ID) return false;

    const provided = req.headers['x-client-id'];
    if (typeof provided !== 'string') return false;

    // Constant-time compare so the secret cannot be guessed byte by byte.
    const providedBuf = Buffer.from(provided);
    const expectedBuf = Buffer.from(INTERNAL_CLIENT_ID);
    return (
        providedBuf.length === expectedBuf.length &&
        crypto.timingSafeEqual(providedBuf, expectedBuf)
    );
};

const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    skip: isTrustedClient,
    message: { error: 'Too many requests, please try again later' },
});
app.use(limiter);

app.use(bodyParser.json({ limit: '10kb' }));

// Mount Bull Board dashboard with basic auth
app.use(
    '/admin/queues',
//    basicAuth({
  //      users: { [process.env.ADMIN_USER || 'admin']: process.env.ADMIN_PASSWORD || 'admin' },
//	users: {['admin']:'admin'},
    //  challenge: true,
      //  realm: 'Bull Board'
 //   }),
    serverAdapter.getRouter()
);

const PORT = process.env.PORT;

app.get('/health', (req, res) => {
    res.send('OK');
});

// Webhook routes
app.use('/webhook/users', userRoutes);
app.use('/webhook/incidents', incidentRoutes);

const server = app.listen(PORT || 3000, async () => {
    console.log(`Server is running on http://localhost:${PORT || 3000}`);
    console.log(`Bull Board dashboard: http://localhost:${PORT || 3000}/admin/queues`);

    // Resume any paused queues on startup
    try {
        await usersQueue.resume();
        await incidentsQueue.resume();
        console.log('Queues resumed successfully');
    } catch (err) {
        console.error('Error resuming queues:', err.message);
    }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing queues...');
    // Send any batched failure alerts before the process exits.
    await flushNotifications();
    await Promise.all([usersQueue.close(), incidentsQueue.close()]);
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
