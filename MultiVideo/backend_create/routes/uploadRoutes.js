const multer = require('multer');
const requireLogin = require('../middlewares/requireLogin');
const Video = require('../models/Video');
const fs = require('fs');

// Multer Storage Setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

module.exports = (app) => {
    app.post('/api/upload', requireLogin, upload.single('video'), async (req, res) => {
        const { title, description } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).send({ error: 'No file uploaded' });
        }

        const video = new Video({
            userId: req.user._id,
            title: title || file.originalname,
            description: description || '',
            filePath: file.path,
            mimeType: file.mimetype,
            status: 'uploaded'
        });

        await video.save();
        res.send(video);
    });

    app.get('/api/videos', requireLogin, async (req, res) => {
        const videos = await Video.find({ userId: req.user._id }).sort({ createdAt: -1 });
        res.send(videos);
    });
};
