const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo').default;
const passport = require('passport');
const cors = require('cors');
const connectDB = require('./config/db');
require('./services/passport');

const app = express();

// Database Connection
connectDB();

// Middleware
app.use(cors({
    origin: 'http://localhost:8080', // Vite frontend
    credentials: true
}));
app.use(express.json());

app.use(session({
    secret: process.env.COOKIE_KEY || 'secretKey',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    }
}));

app.use(passport.initialize());
app.use(passport.session());

// Routes
require('./routes/authRoutes')(app);
require('./routes/uploadRoutes')(app);
require('./routes/publishRoutes')(app);
require('./routes/connectionRoutes')(app);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
