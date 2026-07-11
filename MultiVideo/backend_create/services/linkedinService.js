const axios = require('axios');

class LinkedInService {
    getAuthUrl() {
        const clientId = process.env.LINKEDIN_CLIENT_ID;
        const redirectUri = process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:5000/connect/linkedin/callback';
        const scope = 'w_member_social'; // Basic posting scope
        return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
    }

    async getTokens(code) {
        const clientId = process.env.LINKEDIN_CLIENT_ID;
        const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
        const redirectUri = process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:5000/connect/linkedin/callback';

        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('code', code);
        params.append('redirect_uri', redirectUri);
        params.append('client_id', clientId);
        params.append('client_secret', clientSecret);

        const response = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', params);
        return response.data;
    }

    async publishVideo(account, videoMetadata, filePath) {
        console.log("Mock publishing to LinkedIn:", videoMetadata.title);
        // LinkedIn Video Upload is complex (Register -> Upload -> Verify).
        return { id: "mock_li_id", success: true };
    }
}

module.exports = new LinkedInService();
