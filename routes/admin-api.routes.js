const express = require('express');
const router = express.Router();

const { requireAuth } = require('../middleware/session-auth');
const { requireRole } = require('../middleware/admin-auth');
const admin = require('../controllers/admin.controller');

// Login is public; everything below requires an authenticated session.
router.post('/auth/login', admin.login);

router.use(requireAuth);

router.post('/auth/logout', admin.logout);
router.get('/auth/me', admin.me);
router.get('/overview', admin.overview);
router.get('/dags', admin.dags);
router.get('/updates', admin.updates);
router.get('/reconciliations', admin.reconciliations);
router.get('/alerts', admin.alerts);

// Office admins and technical users can retry failed queue updates.
router.post('/retry', requireRole('office_admin', 'technical'), admin.retry);

module.exports = router;
