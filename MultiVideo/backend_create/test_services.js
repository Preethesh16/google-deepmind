require('dotenv').config();
try {
    const twitterService = require('./services/twitterService');
    console.log('Twitter Service loaded successfully');
    console.log('Twitter Auth URL function exists:', typeof twitterService.getAuthUrl === 'function');
} catch (e) {
    console.error('Failed to load Twitter Service:', e);
}
console.log('Test Complete');
