require('dotenv').config();
const { TwitterApi } = require('twitter-api-v2');

const key = process.env.TWITTER_CLIENT_ID;
const secret = process.env.TWITTER_CLIENT_SECRET;

console.log('--- Twitter Key Debug ---');
console.log(`Key loaded: ${key ? 'YES' : 'NO'}`);
console.log(`Key length: ${key ? key.length : 0}`);
console.log(`Secret loaded: ${secret ? 'YES' : 'NO'}`);
console.log(`Secret length: ${secret ? secret.length : 0}`);

if (key) {
    console.log(`Key first char: "${key[0]}"`);
    console.log(`Key last char: "${key[key.length - 1]}"`);
}

// Attempt simple connection verification (App-only)
const client = new TwitterApi({
    appKey: key,
    appSecret: secret,
});

(async () => {
    try {
        // Try to generate auth link (3-legged) - this effectively tests the keys against the 1.0a endpoint
        const link = await client.generateAuthLink('http://localhost:5000/connect/twitter/callback', { linkMode: 'authorize' });
        console.log('SUCCESS: Generated Auth Link:', link.url);
    } catch (e) {
        console.error('FAILURE: Error generating auth link:');
        if (e.data) console.error(JSON.stringify(e.data, null, 2));
        else console.error(e);
    }
})();
