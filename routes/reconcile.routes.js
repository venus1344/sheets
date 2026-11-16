const express = require('express');
const router = express.Router();

const { apiKeyAuth } = require('../middleware/auth');
const { reconcileUsers, reconcileIncidents } = require('../controllers/reconcile.controller');

router.use(apiKeyAuth);

router.post('/users', reconcileUsers);
router.post('/incidents', reconcileIncidents);

module.exports = router;
