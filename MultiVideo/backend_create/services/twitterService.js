const { TwitterApi } = require('twitter-api-v2');

// OAuth 1.0a Secret Map (token -> secret)
const tokenSecrets = new Map();

class TwitterService {
    // 1. Get Auth URL (OAuth 1.0a 3-legged)
    async getAuthUrl() {
        try {
            // Consumer Keys (API Key & Secret)
            const client = new TwitterApi({
                appKey: process.env.TWITTER_CLIENT_ID,
                appSecret: process.env.TWITTER_CLIENT_SECRET,
            });

            const redirectUri = process.env.TWITTER_REDIRECT_URI || 'http://localhost:5000/connect/twitter/callback';

            const authLink = await client.generateAuthLink(redirectUri, { linkMode: 'authorize' });

            // Store secret
            tokenSecrets.set(authLink.oauth_token, authLink.oauth_token_secret);

            return authLink.url;
        } catch (error) {
            console.error("Twitter Auth Link Generation Error:", error);
            throw error;
        }
    }

    // 2. Get Access Tokens (OAuth 1.0a)
    async getTokens(oauth_token, oauth_verifier) {
        const oauth_token_secret = tokenSecrets.get(oauth_token);

        if (!oauth_token_secret) {
            throw new Error('Invalid oauth_token or session expired');
        }
        tokenSecrets.delete(oauth_token);

        const client = new TwitterApi({
            appKey: process.env.TWITTER_CLIENT_ID,
            appSecret: process.env.TWITTER_CLIENT_SECRET,
            accessToken: oauth_token,
            accessSecret: oauth_token_secret,
        });

        const { accessToken, accessSecret, screenName, userId } = await client.login(oauth_verifier);

        return {
            access_token: accessToken,
            access_secret: accessSecret,
            screen_name: screenName,
            user_id: userId
        };
    }

    // 3. Publish Video (Media Upload requires OAuth 1.0a on Free/Basic tiers usually)
    async publishVideo(account, videoMetadata, filePath) {
        console.log("Publishing to Twitter (OAuth 1.0a Video Upload)...");

        if (!account.oauthSecret) {
            throw new Error("Missing OAuth Secret for Twitter. Re-connect account.");
        }

        const client = new TwitterApi({
            appKey: process.env.TWITTER_CLIENT_ID,
            appSecret: process.env.TWITTER_CLIENT_SECRET,
            accessToken: account.accessToken,
            accessSecret: account.oauthSecret, // CRITICAL
        });

        try {
            // Upload Media (Chunked upload handled automatically)
            const mediaId = await client.v1.uploadMedia(filePath, {
                mimeType: 'video/mp4',
                target: 'tweet'
            });

            console.log("Media Uploaded:", mediaId);

            // Post Tweet with Media
            const tweet = await client.v2.tweet({
                text: `${videoMetadata.title}\n\n${videoMetadata.description || ''}`.substring(0, 280),
                media: { media_ids: [mediaId] }
            });

            return tweet;
        } catch (e) {
            console.error("Twitter Publish Error:", e);
            throw e;
        }
    }
}

module.exports = new TwitterService();
