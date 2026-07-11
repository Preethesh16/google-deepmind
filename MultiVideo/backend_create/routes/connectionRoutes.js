const Account = require('../models/Account'); // You'll need to make sure Account model is correct
const requireLogin = require('../middlewares/requireLogin');

module.exports = (app) => {
    app.get('/api/connections', requireLogin, async (req, res) => {
        try {
            const accounts = await Account.find({ userId: req.user._id });
            // Return list of connected platforms
            const connectedPlatforms = accounts.map(acc => ({
                platform: acc.platform,
                connectedAt: acc.expiryDate // or just true
            }));
            res.send(connectedPlatforms);
        } catch (err) {
            console.error(err);
            res.status(500).send('Error fetching connections');
        }
    });

    // Disconnect a platform
    app.delete('/api/connections/:platform', requireLogin, async (req, res) => {
        try {
            await Account.findOneAndDelete({
                userId: req.user._id,
                platform: req.params.platform
            });
            res.send({ success: true });
        } catch (err) {
            console.error(err);
            res.status(500).send('Error disconnecting platform');
        }
    });
};
