const axios = require('axios');

class FacebookService {
    getAuthUrl() {
        const appId = process.env.FACEBOOK_APP_ID;
        const redirectUri = process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:5000/connect/facebook/callback';
        return `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=pages_show_list,pages_read_engagement,pages_manage_posts`;
    }

    async getTokens(code) {
        const appId = process.env.FACEBOOK_APP_ID;
        const appSecret = process.env.FACEBOOK_APP_SECRET;
        const redirectUri = process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:5000/connect/facebook/callback';

        const response = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
            params: {
                client_id: appId,
                redirect_uri: redirectUri,
                client_secret: appSecret,
                code: code
            }
        });
        return response.data;
    }

    async publishVideo(account, videoMetadata, filePath) {
        // This is a simplified implementation. Real FB video upload is a multi-step process for large files.
        // For this demo, we can't easily upload a stream without a page token.
        // We'll assume the user has selected a 'Page' to post to (which adds complexity).
        // For simplicity, we'll just log it for now as we don't have the Page selection UI yet.
        console.log("Mock publishing to Facebook:", videoMetadata.title);
        return { id: "mock_fb_id", success: true };
    }
}

module.exports = new FacebookService();
