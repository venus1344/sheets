const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
console.log(REDIS_URL);

const redisClient = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false
});

redisClient.on('error', (err) => {
    console.error('Redis connection error:', err.message);
});

redisClient.on('connect', () => {
    console.log('Connected to Redis');
});

module.exports = redisClient;
module.exports.REDIS_URL = REDIS_URL;
