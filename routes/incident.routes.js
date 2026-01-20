const express = require('express');
const IncidentController = require('../controllers/incident.controller');
const { apiKeyAuth } = require('../middleware/auth');
const { validateIncidentPayload } = require('../middleware/validate');
const router = express.Router();

router.use(apiKeyAuth);

// Incident log webhook
router.post('/', validateIncidentPayload, async (req, res) => {
    const result = await IncidentController.processIncident(req.body);
    res.json(result);
});

// Retry failed incident updates
router.post('/retry', async (req, res) => {
    const results = await IncidentController.retryFailed();
    res.json(results);
});

// Get incident update statuses
router.get('/status', (req, res) => {
    const updates = IncidentController.getStatus();
    res.json(updates);
});

module.exports = router;
