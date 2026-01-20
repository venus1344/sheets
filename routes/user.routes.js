const express = require('express');
const UserController = require('../controllers/user.controller');
const { apiKeyAuth } = require('../middleware/auth');
const { validateUserPayload } = require('../middleware/validate');
const router = express.Router();

router.use(apiKeyAuth);

// User data webhook
router.post('/', validateUserPayload, async (req, res) => {
    const result = await UserController.processUserUpdate(req.body);
    res.json(result);
});

// Retry failed user updates
router.post('/retry', async (req, res) => {
    const results = await UserController.retryFailed();
    res.json(results);
});

// Get user update statuses
router.get('/status', (req, res) => {
    const updates = UserController.getStatus();
    res.json(updates);
});

module.exports = router;
