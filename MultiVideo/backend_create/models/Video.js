const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    title: String,
    description: String,
    filePath: String, // Local path
    mimeType: String,
    status: {
        type: String,
        default: 'uploaded' // uploaded, publishing, published
    },
    platformLogs: [{
        platform: String,
        status: String, // success, failed
        message: String,
        externalId: String,
        publishedAt: Date
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Video', videoSchema);
