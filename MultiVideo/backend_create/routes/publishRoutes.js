const requireLogin = require('../middlewares/requireLogin');
const Video = require('../models/Video');
const Account = require('../models/Account');
const youtubeService = require('../services/youtubeService');
const facebookService = require('../services/facebookService');
const linkedinService = require('../services/linkedinService');
const twitterService = require('../services/twitterService');

const services = {
    youtube: youtubeService,
    facebook: facebookService,
    linkedin: linkedinService,
    twitter: twitterService,
    // Instagram often uses Facebook Graph API, but we can separate if needed
    instagram: facebookService
};

async function publishToPlatform(platform, video, account) {
    console.log(`Publishing to ${platform}...`);

    const service = services[platform];
    if (!service) {
        throw new Error(`Service for ${platform} not implemented`);
    }

    // Standard publish (Service handles credential extraction from Account object)
    return await service.publishVideo(account, video, video.filePath);
}

module.exports = (app) => {
    app.post('/api/publish', requireLogin, async (req, res) => {
        const { videoId, platforms } = req.body; // platforms = ['youtube', 'instagram']

        const video = await Video.findOne({ _id: videoId, userId: req.user._id });
        if (!video) {
            return res.status(404).send({ error: 'Video not found' });
        }

        // Logic to publish to each platform
        // For now, we only support YouTube
        // For now, we only support YouTube

        // Helper function for non-YouTube platforms or generic publishing
        const publishPromise = platforms.map(async (platform) => {
            if (platform === 'youtube') {
                // Existing YouTube logic (could also be refactored to generic, but keeping for safety)
                const account = await Account.findOne({ userId: req.user._id, platform: 'youtube' });
                if (!account) return { platform: 'youtube', status: 'failed', message: 'No connected account' };
                try {
                    // Reuse the generic service method if possible, or adapt:
                    // Current youtubeService.uploadVideo signature updated to accept (account, ...)
                    const result = await youtubeService.uploadVideo(account, {
                        title: video.title,
                        description: video.description
                    }, video.filePath);

                    video.platformLogs.push({ platform: 'youtube', status: 'success', externalId: result.id, publishedAt: new Date() });
                    return { platform: 'youtube', status: 'success', externalId: result.id };
                } catch (err) {
                    console.error("YouTube Publish Error", err);
                    video.platformLogs.push({ platform: 'youtube', status: 'failed', message: err.message });
                    return { platform: 'youtube', status: 'failed', message: err.message };
                }
            } else {
                // Generic handler for Twitter, Facebook, LinkedIn
                const account = await Account.findOne({ userId: req.user._id, platform });
                if (!account) {
                    return { platform, status: 'failed', message: 'No connected account' };
                }
                try {
                    const result = await publishToPlatform(platform, video, account);
                    video.platformLogs.push({ platform, status: 'success', externalId: result.data ? result.data.id : 'unknown', publishedAt: new Date() });
                    return { platform, status: 'success', externalId: result.data ? result.data.id : 'unknown' };
                } catch (err) {
                    console.error(`${platform} Publish Error`, err);
                    video.platformLogs.push({ platform, status: 'failed', message: err.message });
                    return { platform, status: 'failed', message: err.message };
                }
            }
        });

        const results = await Promise.all(publishPromise);

        video.status = 'published'; // Or partial
        await video.save();

        res.send(results);
    });
};
