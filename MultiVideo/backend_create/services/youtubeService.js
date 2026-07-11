const { google } = require('googleapis');
const fs = require('fs');

class YouTubeService {
    constructor() {
        this.oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:5000/connect/youtube/callback'
        );
    }

    getAuthUrl() {
        const scopes = [
            'https://www.googleapis.com/auth/youtube.upload',
            'https://www.googleapis.com/auth/youtube.readonly'
        ];

        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent' // Force refresh token
        });
    }

    async getTokens(code) {
        const { tokens } = await this.oauth2Client.getToken(code);
        return tokens;
    }

    async uploadVideo(account, videoMetadata, filePath) {
        const client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );

        const authTokens = {
            access_token: account.accessToken,
            refresh_token: account.refreshToken,
            expiry_date: account.expiryDate
        };
        client.setCredentials(authTokens);

        const youtube = google.youtube({ version: 'v3', auth: client });

        try {
            const fileSize = fs.statSync(filePath).size;
            const res = await youtube.videos.insert({
                part: 'snippet,status',
                requestBody: {
                    snippet: {
                        title: videoMetadata.title,
                        description: videoMetadata.description
                    },
                    status: {
                        privacyStatus: 'public' // Default to public
                    }
                },
                media: {
                    body: fs.createReadStream(filePath)
                }
            });
            return res.data;
        } catch (error) {
            console.error('Error uploading to YouTube:', error);
            throw error;
        }
    }
}

module.exports = new YouTubeService();
