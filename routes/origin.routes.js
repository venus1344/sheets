const express = require('express');
const OriginController = require('../controllers/origin.controller');
const router = express.Router();

// webhook posting from tai
router.post('/18-01-2026', (req, res) => {
    OriginController.postData(req);
    res.send('received');
})

module.exports = router;
