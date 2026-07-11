const passport = require('passport');
const Account = require('../models/Account');
const youtubeService = require('../services/youtubeService');
const requireLogin = require('../middlewares/requireLogin'); // We need to create this

module.exports = (app) => {
    // 1. App Login (Google)
    app.get(
        '/auth/google',
        passport.authenticate('google', {
            scope: ['profile', 'email']
        })
    );

    app.get(
        '/auth/google/callback',
        passport.authenticate('google'),
        (req, res) => {
            res.redirect('http://localhost:8080/dashboard'); // Redirect to frontend
        }
    );

    app.get('/api/current_user', (req, res) => {
        try {
            res.send(req.user);
        } catch (error) {
            console.error("Error in /api/current_user:", error);
            res.status(500).send({ error: 'Failed to fetch user' });
        }
    });

    app.get('/api/logout', (req, res) => {
        req.logout();
        res.redirect('/');
    });

    // 2. Connect Platforms
    const platforms = [
        { name: 'youtube', service: youtubeService },
        { name: 'facebook', service: require('../services/facebookService') },
        { name: 'linkedin', service: require('../services/linkedinService') },
        { name: 'twitter', service: require('../services/twitterService') }
    ];

    platforms.forEach(({ name, service }) => {
        app.get(`/api/connect/${name}`, requireLogin, async (req, res) => {
            try {
                const url = await service.getAuthUrl(req.user._id);
                res.json({ url });
            } catch (error) {
                console.error(`Error generating auth url for ${name}:`, error);
                // Return a safe error response instead of crashing
                res.status(500).json({ error: `Failed to initiate connection to ${name}. Check server logs.` });
            }
        });

        app.get(`/connect/${name}/callback`, requireLogin, async (req, res) => {
            // Capture both OAuth 2.0 (code, state) and OAuth 1.0a (oauth_token, oauth_verifier) params
            const { code, state, oauth_token, oauth_verifier } = req.query;

            try {
                let tokens;
                // Switch logic: Twitter = OAuth 1.0a, Others = OAuth 2.0
                if (name === 'twitter') {
                    // Twitter uses OAuth 1.0a (oauth_token, oauth_verifier)
                    tokens = await service.getTokens(oauth_token, oauth_verifier);
                } else {
                    // Others use OAuth 2.0 (code, state)
                    tokens = await service.getTokens(code, state);
                }

                // Save/Update Account
                let account = await Account.findOne({ userId: req.user._id, platform: name });

                if (account) {
                    account.accessToken = tokens.access_token;
                    account.refreshToken = tokens.refresh_token; // Facebook/LinkedIn/Google

                    // Save Secret for Twitter 1.0a
                    if (name === 'twitter') {
                        account.oauthSecret = tokens.access_secret;
                    }

                    if (tokens.expires_in) {
                        account.expiryDate = Date.now() + tokens.expires_in * 1000;
                    }

                    await account.save();
                } else {
                    await new Account({
                        userId: req.user._id,
                        platform: name,
                        accessToken: tokens.access_token,
                        refreshToken: tokens.refresh_token,
                        oauthSecret: (name === 'twitter') ? tokens.access_secret : undefined,
                        expiryDate: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : null
                    }).save();
                }

                res.redirect(`http://localhost:8080/dashboard/connections?connected=${name}`);
            } catch (err) {
                console.error(`Error connecting ${name} account:`, err);
                res.redirect(`http://localhost:8080/dashboard/connections?error=${name}_failed`);
            }
        });
    });

    // Callbacks are handled in loop above
};
