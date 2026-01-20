const ApiKey = require('../models/api-key');

const apiKeyAuth = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(401).json({ error: 'Missing X-API-Key header' });
    }

    const validKey = ApiKey.validate(apiKey);
    if (!validKey) {
        return res.status(403).json({ error: 'Invalid API key' });
    }

    req.apiKeyName = validKey.name;
    next();
};

module.exports = { apiKeyAuth };
