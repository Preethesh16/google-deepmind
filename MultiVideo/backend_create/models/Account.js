const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    platform: {
        type: String,
        required: true,
        enum: ['youtube', 'facebook', 'instagram', 'linkedin', 'twitter'] // Expanded for all platforms
    },
    platformEmail: String, // Email associated with the platform account
    accessToken: String,
    refreshToken: String,
    oauthSecret: String, // For OAuth 1.0a (Twitter)
    expiryDate: Number
});

module.exports = mongoose.model('Account', accountSchema);
